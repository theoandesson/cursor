const WEB_MERCATOR_MAX_LAT = 85.05112878;

/** [west, south, east, north] covering Sweden + Gotland with small buffer. */
export const SWEDEN_BOUNDS = Object.freeze([9.5, 54.8, 24.8, 69.7]);

export const TILE_SYNC_ZOOMS = Object.freeze({
  vector: Object.freeze({ min: 0, max: 10 }),
  dem: Object.freeze({ min: 0, max: 8 })
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampLatitude = (latitude) =>
  clamp(latitude, -WEB_MERCATOR_MAX_LAT, WEB_MERCATOR_MAX_LAT);

export const lngLatToTile = (longitude, latitude, zoom) => {
  const scale = 2 ** zoom;
  const normalizedLongitude = ((longitude + 180) / 360) * scale;
  const latitudeRadians = (clampLatitude(latitude) * Math.PI) / 180;
  const normalizedLatitude =
    ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2) *
    scale;

  return {
    x: clamp(Math.floor(normalizedLongitude), 0, scale - 1),
    y: clamp(Math.floor(normalizedLatitude), 0, scale - 1),
    z: zoom
  };
};

export const tileToBounds = (x, y, z) => {
  const scale = 2 ** z;
  const west = (x / scale) * 360 - 180;
  const east = ((x + 1) / scale) * 360 - 180;
  const northRadians = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale)));
  const southRadians = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / scale)));

  return Object.freeze([
    west,
    (southRadians * 180) / Math.PI,
    east,
    (northRadians * 180) / Math.PI
  ]);
};

export const boundsIntersect = (a, b) => {
  const [aWest, aSouth, aEast, aNorth] = a;
  const [bWest, bSouth, bEast, bNorth] = b;

  return !(aEast < bWest || aWest > bEast || aNorth < bSouth || aSouth > bNorth);
};

export const isTileInBounds = (x, y, z, bounds = SWEDEN_BOUNDS) =>
  boundsIntersect(tileToBounds(x, y, z), bounds);

export const enumerateTilesForZoom = (bounds, zoom) => {
  const [west, south, east, north] = bounds;
  const northWest = lngLatToTile(west, north, zoom);
  const southEast = lngLatToTile(east, south, zoom);
  const minX = Math.min(northWest.x, southEast.x);
  const maxX = Math.max(northWest.x, southEast.x);
  const minY = Math.min(northWest.y, southEast.y);
  const maxY = Math.max(northWest.y, southEast.y);
  const tiles = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (isTileInBounds(x, y, zoom, bounds)) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  return tiles;
};

export const enumerateTilesForRange = (bounds, minZoom, maxZoom) => {
  const allTiles = [];
  for (let z = minZoom; z <= maxZoom; z += 1) {
    allTiles.push(...enumerateTilesForZoom(bounds, z));
  }
  return allTiles;
};
