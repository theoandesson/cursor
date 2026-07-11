import {
  DEM_TILE_SOURCE,
  enumerateTilesForBounds,
  PREFETCHABLE_TILE_TEMPLATES,
  resolveTileUrl,
  SWEDEN_TILE_BOUNDS,
  VECTOR_TILE_SOURCE
} from "./swedenTileSources.js";

const DEFAULT_OPTIONS = Object.freeze({
  maxConcurrent: 6,
  prefetchRings: 2,
  zoomLevelsAhead: 1,
  idleDelayMs: 80,
  maxFetchedEntries: 12_000,
  deferInitialPrefetch: false
});

class PriorityQueue {
  constructor() {
    this.items = [];
    this.keys = new Map();
  }

  get size() {
    return this.items.length;
  }

  clear() {
    this.items.length = 0;
    this.keys.clear();
  }

  enqueue(tile, priority) {
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    const existingIndex = this.keys.get(key);
    if (existingIndex != null) {
      const existing = this.items[existingIndex];
      if (priority < existing.priority) {
        existing.priority = priority;
        this.bubbleUp(existingIndex);
        const currentIndex = this.keys.get(key);
        if (currentIndex != null) {
          this.bubbleDown(currentIndex);
        }
      }
      return;
    }

    this.items.push({ key, tile, priority });
    this.keys.set(key, this.items.length - 1);
    this.bubbleUp(this.items.length - 1);
  }

  dequeue() {
    if (this.items.length === 0) {
      return null;
    }

    const next = this.items[0];
    const last = this.items.pop();
    this.keys.delete(next.key);

    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.keys.set(last.key, 0);
      this.bubbleDown(0);
    }

    return next;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.items[parentIndex].priority <= this.items[index].priority) {
        break;
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    const length = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < length && this.items[left].priority < this.items[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.items[right].priority < this.items[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) {
        break;
      }
      this.swap(index, smallest);
      index = smallest;
    }
  }

  swap(leftIndex, rightIndex) {
    const left = this.items[leftIndex];
    const right = this.items[rightIndex];
    this.items[leftIndex] = right;
    this.items[rightIndex] = left;
    this.keys.set(left.key, rightIndex);
    this.keys.set(right.key, leftIndex);
  }
}

class BoundedFetchCache {
  constructor(maxEntries) {
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  has(key) {
    if (!this.entries.has(key)) {
      return false;
    }
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return true;
  }

  add(key) {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    this.entries.set(key, true);
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

const clampZoom = (zoom, minZoom, maxZoom) =>
  Math.max(minZoom, Math.min(maxZoom, Math.round(zoom)));

const boundsFromLngLatBounds = (lngLatBounds) => {
  const sw = lngLatBounds.getSouthWest();
  const ne = lngLatBounds.getNorthEast();
  return [sw.lng, sw.lat, ne.lng, ne.lat];
};

const expandBoundsInDirection = (bounds, direction, factor = 0.85) => {
  const [west, south, east, north] = bounds;
  const width = east - west;
  const height = north - south;
  const { dx, dy } = direction;

  return [
    west + dx * width * factor,
    south + dy * height * factor,
    east + dx * width * factor,
    north + dy * height * factor
  ];
};

const mergeBounds = (left, right) => [
  Math.min(left[0], right[0]),
  Math.min(left[1], right[1]),
  Math.max(left[2], right[2]),
  Math.max(left[3], right[3])
];

const clampBoundsToSweden = (bounds) => {
  const [swWest, swSouth, swEast, swNorth] = SWEDEN_TILE_BOUNDS;
  return [
    Math.max(bounds[0], swWest),
    Math.max(bounds[1], swSouth),
    Math.min(bounds[2], swEast),
    Math.min(bounds[3], swNorth)
  ];
};

const normalizeDirection = (bearingRadians) => {
  const dx = Math.sin(bearingRadians);
  const dy = Math.cos(bearingRadians);
  const magnitude = Math.hypot(dx, dy) || 1;
  return { dx: dx / magnitude, dy: dy / magnitude };
};

const buildPrefetchTemplates = (options) => {
  if (Array.isArray(options.tileTemplates) && options.tileTemplates.length > 0) {
    return options.tileTemplates;
  }
  return PREFETCHABLE_TILE_TEMPLATES;
};

/**
 * Predictive tile prefetcher for MapLibre.
 *
 * On `moveend` / `zoomend` it enqueues visible tiles first, then tiles in the
 * pan direction so the next gesture hits warm HTTP cache / service worker.
 */
export const createViewportPrefetcher = (map, userOptions = {}) => {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const queue = new PriorityQueue();
  const inflight = new Set();
  const fetched = new BoundedFetchCache(options.maxFetchedEntries);
  let tileTemplates = buildPrefetchTemplates(options);

  let previousCenter = map.getCenter();
  let previousZoom = map.getZoom();
  let idleTimer = null;
  let disposed = false;
  let abortController = new AbortController();

  const minZoom = Math.min(VECTOR_TILE_SOURCE.minzoom, DEM_TILE_SOURCE.minzoom);
  const maxZoom = Math.max(VECTOR_TILE_SOURCE.maxzoom, DEM_TILE_SOURCE.maxzoom);

  const prefetchTile = async (tile, template) => {
    const key = `${template}|${tile.z}/${tile.x}/${tile.y}`;
    if (disposed || fetched.has(key) || inflight.has(key)) {
      return;
    }

    inflight.add(key);
    const url = resolveTileUrl(template, tile);

    try {
      await fetch(url, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
        signal: abortController.signal
      });
      if (!disposed) {
        fetched.add(key);
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      // Best-effort warm cache — ignore individual tile failures.
    } finally {
      inflight.delete(key);
    }
  };

  const drainQueue = () => {
    if (disposed) {
      return;
    }

    while (queue.size > 0 && inflight.size < options.maxConcurrent) {
      const entry = queue.dequeue();
      if (!entry) {
        break;
      }

      const work = tileTemplates.map((template) => prefetchTile(entry.tile, template));
      Promise.allSettled(work).then(() => drainQueue());
    }
  };

  const enqueueTilesForBounds = (bounds, priorityBase, zoomOverride = null) => {
    const zoom = zoomOverride ?? clampZoom(map.getZoom(), minZoom, maxZoom);
    let ringBounds = bounds;

    for (let ring = 0; ring <= options.prefetchRings; ring += 1) {
      const ringPriority = priorityBase + ring;
      const tiles = enumerateTilesForBounds(ringBounds, zoom);

      tiles.forEach((tile) => {
        queue.enqueue(tile, ringPriority);
      });

      if (ring < options.prefetchRings) {
        const [west, south, east, north] = ringBounds;
        const width = east - west;
        const height = north - south;
        const ringFactor = 0.35 * (ring + 1);
        ringBounds = clampBoundsToSweden([
          west - width * ringFactor,
          south - height * ringFactor,
          east + width * ringFactor,
          north + height * ringFactor
        ]);
      }
    }

    for (let ahead = 1; ahead <= options.zoomLevelsAhead; ahead += 1) {
      const zoomAhead = clampZoom(zoom + ahead, minZoom, maxZoom);
      if (zoomAhead === zoom) {
        continue;
      }

      const tiles = enumerateTilesForBounds(bounds, zoomAhead);
      tiles.forEach((tile) => {
        queue.enqueue(tile, priorityBase + options.prefetchRings + ahead);
      });
    }
  };

  const schedulePrefetch = () => {
    if (disposed) {
      return;
    }

    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (disposed) {
        return;
      }

      const center = map.getCenter();
      const zoom = map.getZoom();
      const visibleBounds = clampBoundsToSweden(boundsFromLngLatBounds(map.getBounds()));
      const zoomDelta = Math.abs(zoom - previousZoom);
      const panDistance = Math.hypot(
        center.lng - previousCenter.lng,
        center.lat - previousCenter.lat
      );
      const hasMeaningfulMotion = panDistance > 0.0008 || zoomDelta >= 0.05;

      let prefetchBounds = visibleBounds;
      if (hasMeaningfulMotion) {
        const bearing = Math.atan2(
          center.lng - previousCenter.lng,
          center.lat - previousCenter.lat
        );
        const direction = normalizeDirection(bearing);
        const lookaheadBounds = clampBoundsToSweden(
          expandBoundsInDirection(visibleBounds, direction, 1.1)
        );
        prefetchBounds = clampBoundsToSweden(mergeBounds(visibleBounds, lookaheadBounds));
      }

      queue.clear();

      enqueueTilesForBounds(visibleBounds, 0);
      if (prefetchBounds !== visibleBounds) {
        enqueueTilesForBounds(prefetchBounds, 10);
      }

      previousCenter = center;
      previousZoom = zoom;

      drainQueue();
    }, options.idleDelayMs);
  };

  const onMoveEnd = () => schedulePrefetch();
  const onZoomEnd = () => schedulePrefetch();
  const onLoad = () => {
    if (!options.deferInitialPrefetch) {
      schedulePrefetch();
    }
  };

  map.on("moveend", onMoveEnd);
  map.on("zoomend", onZoomEnd);
  if (!options.deferInitialPrefetch) {
    map.on("load", onLoad);
  }

  return {
    flush: () => {
      schedulePrefetch();
    },
    start: () => {
      schedulePrefetch();
    },
    setTileTemplates: (nextTemplates) => {
      if (!Array.isArray(nextTemplates) || nextTemplates.length === 0) {
        return;
      }
      tileTemplates = nextTemplates;
    },
    destroy: () => {
      disposed = true;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      abortController.abort();
      abortController = new AbortController();
      map.off("moveend", onMoveEnd);
      map.off("zoomend", onZoomEnd);
      if (!options.deferInitialPrefetch) {
        map.off("load", onLoad);
      }
      queue.clear();
      inflight.clear();
    },
    getStats: () => ({
      queued: queue.size,
      inflight: inflight.size,
      fetched: fetched.size,
      zoom: previousZoom
    })
  };
};
