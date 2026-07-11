const TILE_COORDINATE_RANGE = 32;

export const lngLatToTile = (lng, lat, zoom) => {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  );
  return { z: zoom, x, y };
};

export const tileToKey = ({ z, x, y }) => `${z}/${x}/${y}`;

const wrapTileX = (x, z) => {
  const range = 2 ** z;
  return ((x % range) + range) % range;
};

const clampTileY = (y, z) => {
  const max = 2 ** z - 1;
  return Math.max(0, Math.min(max, y));
};

export const enumerateTilesInBounds = ({ west, south, east, north, zoom }) => {
  const z = Math.max(0, Math.floor(zoom));
  const northWest = lngLatToTile(west, north, z);
  const southEast = lngLatToTile(east, south, z);
  const minX = Math.min(northWest.x, southEast.x);
  const maxX = Math.max(northWest.x, southEast.x);
  const minY = Math.min(northWest.y, southEast.y);
  const maxY = Math.max(northWest.y, southEast.y);
  const tiles = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ z, x: wrapTileX(x, z), y: clampTileY(y, z) });
    }
  }

  return tiles;
};

export const prioritizeViewportTiles = (tiles, centerTile) => {
  const centerX = centerTile?.x ?? 0;
  const centerY = centerTile?.y ?? 0;
  return [...tiles].sort((left, right) => {
    const leftDistance =
      (left.x - centerX) ** 2 + (left.y - centerY) ** 2 + (left.z - (centerTile?.z ?? left.z)) ** 2;
    const rightDistance =
      (right.x - centerX) ** 2 +
      (right.y - centerY) ** 2 +
      (right.z - (centerTile?.z ?? right.z)) ** 2;
    return leftDistance - rightDistance;
  });
};

export const buildViewportTileSchedule = ({ west, south, east, north, zoom, centerLng, centerLat }) => {
  const visibleTiles = enumerateTilesInBounds({ west, south, east, north, zoom });
  const centerTile = lngLatToTile(centerLng, centerLat, Math.floor(zoom));
  const prioritizedTiles = prioritizeViewportTiles(visibleTiles, centerTile).map(tileToKey);

  return {
    visibleTileCount: visibleTiles.length,
    prioritizedTiles
  };
};

const createInlineSchedulerWorker = () => {
  const workerSource = `
    const lngLatToTile = ${lngLatToTile.toString()};
    const enumerateTilesInBounds = ${enumerateTilesInBounds.toString()};
    const prioritizeViewportTiles = ${prioritizeViewportTiles.toString()};
    const tileToKey = ${tileToKey.toString()};
    const buildViewportTileSchedule = ${buildViewportTileSchedule.toString()};

    self.onmessage = (event) => {
      const payload = event.data;
      if (!payload || payload.type !== "schedule") {
        return;
      }
      const schedule = buildViewportTileSchedule(payload.bounds);
      self.postMessage({
        type: "scheduled",
        requestId: payload.requestId,
        visibleTileCount: schedule.visibleTileCount,
        prioritizedTiles: schedule.prioritizedTiles.slice(0, ${TILE_COORDINATE_RANGE})
      });
    };
  `;

  const blob = new Blob([workerSource], { type: "application/javascript" });
  const workerUrl = URL.createObjectURL(blob);
  return {
    worker: new Worker(workerUrl, { type: "module" }),
    workerUrl
  };
};

export const createViewportTileScheduler = ({ map, onStatusChange }) => {
  let worker = null;
  let workerUrl = null;
  let requestId = 0;
  let pendingRequestId = null;
  let lastStatusSignature = null;
  let rafId = null;

  const reportStatus = (visibleTileCount, prioritizedTiles = []) => {
    const signature = `${visibleTileCount}|${prioritizedTiles[0] ?? ""}|${prioritizedTiles.at(-1) ?? ""}`;
    if (lastStatusSignature === signature) {
      return;
    }
    lastStatusSignature = signature;
    onStatusChange?.({
      visibleTileCount,
      prioritizedTileKeys: prioritizedTiles
    });
  };

  const applySchedule = (schedule) => {
    reportStatus(schedule.visibleTileCount, schedule.prioritizedTiles);
  };

  const scheduleOnMainThread = () => {
    const bounds = map.getBounds();
    const center = map.getCenter();
    const schedule = buildViewportTileSchedule({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
      zoom: map.getZoom(),
      centerLng: center.lng,
      centerLat: center.lat
    });
    applySchedule(schedule);
  };

  const queueSchedule = () => {
    if (rafId != null) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;

      if (!worker) {
        scheduleOnMainThread();
        return;
      }

      const nextRequestId = requestId + 1;
      requestId = nextRequestId;
      pendingRequestId = nextRequestId;

      const bounds = map.getBounds();
      const center = map.getCenter();
      worker.postMessage({
        type: "schedule",
        requestId: nextRequestId,
        bounds: {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
          zoom: map.getZoom(),
          centerLng: center.lng,
          centerLat: center.lat
        }
      });
    });
  };

  const onWorkerMessage = (event) => {
    const payload = event.data;
    if (!payload || payload.type !== "scheduled" || payload.requestId !== pendingRequestId) {
      return;
    }
    applySchedule({
      visibleTileCount: payload.visibleTileCount,
      prioritizedTiles: payload.prioritizedTiles
    });
  };

  try {
    const workerHandle = createInlineSchedulerWorker();
    worker = workerHandle.worker;
    workerUrl = workerHandle.workerUrl;
    worker.addEventListener("message", onWorkerMessage);
  } catch {
    worker = null;
    workerUrl = null;
  }

  map.on("moveend", queueSchedule);
  map.on("zoomend", queueSchedule);
  map.on("resize", queueSchedule);
  queueSchedule();

  return () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    map.off("moveend", queueSchedule);
    map.off("zoomend", queueSchedule);
    map.off("resize", queueSchedule);
    if (worker) {
      worker.removeEventListener("message", onWorkerMessage);
      worker.terminate();
      worker = null;
    }
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
      workerUrl = null;
    }
  };
};
