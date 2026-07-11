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
  idleDelayMs: 80
});

class PriorityQueue {
  constructor() {
    this.items = [];
    this.keys = new Set();
  }

  get size() {
    return this.items.length;
  }

  enqueue(tile, priority) {
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    if (this.keys.has(key)) {
      const existing = this.items.find((entry) => entry.key === key);
      if (existing && priority < existing.priority) {
        existing.priority = priority;
        this.items.sort((left, right) => left.priority - right.priority);
      }
      return;
    }

    this.keys.add(key);
    this.items.push({ key, tile, priority });
    this.items.sort((left, right) => left.priority - right.priority);
  }

  dequeue() {
    const next = this.items.shift();
    if (!next) {
      return null;
    }
    this.keys.delete(next.key);
    return next;
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
  const fetched = new Set();
  const tileTemplates = buildPrefetchTemplates(options);

  let previousCenter = map.getCenter();
  let previousZoom = map.getZoom();
  let idleTimer = null;
  let disposed = false;

  const minZoom = Math.min(VECTOR_TILE_SOURCE.minzoom, DEM_TILE_SOURCE.minzoom);
  const maxZoom = Math.max(VECTOR_TILE_SOURCE.maxzoom, DEM_TILE_SOURCE.maxzoom);

  const prefetchTile = async (tile, template) => {
    const key = `${template}|${tile.z}/${tile.x}/${tile.y}`;
    if (fetched.has(key) || inflight.has(key)) {
      return;
    }

    inflight.add(key);
    const url = resolveTileUrl(template, tile);

    try {
      await fetch(url, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache"
      });
      fetched.add(key);
    } catch {
      // Best-effort warm cache — ignore individual tile failures.
    } finally {
      inflight.delete(key);
    }
  };

  const drainQueue = async () => {
    while (!disposed && queue.size > 0 && inflight.size < options.maxConcurrent) {
      const entry = queue.dequeue();
      if (!entry) {
        break;
      }

      const work = tileTemplates.map((template) => prefetchTile(entry.tile, template));
      await Promise.allSettled(work);
    }
  };

  const enqueueTilesForBounds = (bounds, priorityBase) => {
    const zoom = clampZoom(map.getZoom(), minZoom, maxZoom);

    for (let ring = 0; ring <= options.prefetchRings; ring += 1) {
      const ringPriority = priorityBase + ring;
      const tiles = enumerateTilesForBounds(bounds, zoom);

      tiles.forEach((tile) => {
        queue.enqueue(tile, ringPriority);
      });

      if (ring < options.prefetchRings) {
        const [west, south, east, north] = bounds;
        const width = east - west;
        const height = north - south;
        const ringFactor = 0.35 * (ring + 1);
        bounds = [
          west - width * ringFactor,
          south - height * ringFactor,
          east + width * ringFactor,
          north + height * ringFactor
        ];
        bounds = clampBoundsToSweden(bounds);
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

      const bearing = Math.atan2(
        center.lng - previousCenter.lng,
        center.lat - previousCenter.lat
      );
      const direction = normalizeDirection(bearing);
      const lookaheadBounds = clampBoundsToSweden(
        expandBoundsInDirection(visibleBounds, direction, 1.1)
      );
      const prefetchBounds = clampBoundsToSweden(
        mergeBounds(visibleBounds, lookaheadBounds)
      );

      queue.items.length = 0;
      queue.keys.clear();

      enqueueTilesForBounds(visibleBounds, 0);
      enqueueTilesForBounds(prefetchBounds, 10);

      previousCenter = center;
      previousZoom = zoom;

      drainQueue();
    }, options.idleDelayMs);
  };

  const onMoveEnd = () => schedulePrefetch();
  const onZoomEnd = () => schedulePrefetch();

  map.on("moveend", onMoveEnd);
  map.on("zoomend", onZoomEnd);

  map.once("load", () => {
    schedulePrefetch();
  });

  return {
    flush: () => {
      schedulePrefetch();
    },
    destroy: () => {
      disposed = true;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      map.off("moveend", onMoveEnd);
      map.off("zoomend", onZoomEnd);
      queue.items.length = 0;
      queue.keys.clear();
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
