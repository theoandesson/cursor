import { SWEDEN_MAIN, GOTLAND, OLAND } from './outline.js';

const PEAKS = [
  { lat: 67.90, lon: 18.55, elev: 2097, spread: 0.7 },
  { lat: 67.30, lon: 17.72, elev: 2050, spread: 0.9 },
  { lat: 68.42, lon: 18.38, elev: 1810, spread: 0.6 },
  { lat: 66.95, lon: 15.60, elev: 1760, spread: 0.7 },
  { lat: 65.77, lon: 15.40, elev: 1430, spread: 0.8 },
  { lat: 63.40, lon: 13.20, elev: 1420, spread: 0.7 },
  { lat: 62.50, lon: 12.80, elev: 1200, spread: 0.6 },
  { lat: 61.70, lon: 13.10, elev: 1044, spread: 0.5 },
  { lat: 61.00, lon: 13.00, elev: 800, spread: 0.4 },
  { lat: 60.30, lon: 12.50, elev: 500, spread: 0.4 },
];

const LAKES = [
  { lat: 58.95, lon: 13.50, rx: 0.55, ry: 0.45 },
  { lat: 58.35, lon: 14.55, rx: 0.15, ry: 0.50 },
  { lat: 59.45, lon: 16.90, rx: 0.35, ry: 0.20 },
  { lat: 60.88, lon: 14.80, rx: 0.12, ry: 0.12 },
  { lat: 63.20, lon: 14.40, rx: 0.18, ry: 0.12 },
  { lat: 68.40, lon: 19.80, rx: 0.12, ry: 0.06 },
  { lat: 66.90, lon: 17.70, rx: 0.10, ry: 0.05 },
  { lat: 67.20, lon: 18.10, rx: 0.08, ry: 0.05 },
  { lat: 65.80, lon: 17.50, rx: 0.10, ry: 0.06 },
  { lat: 64.90, lon: 17.60, rx: 0.08, ry: 0.04 },
];

function borderLon(lat) {
  if (lat > 69) return 20.5;
  if (lat > 68) return 16.0 + (lat - 68) * 4.5;
  if (lat > 66) return 15.0 + (lat - 66) * 0.5;
  if (lat > 64) return 14.0 + (lat - 64) * 0.5;
  if (lat > 63) return 12.5 + (lat - 63) * 1.5;
  if (lat > 61) return 12.2 + (lat - 61) * 0.15;
  if (lat > 59) return 11.5 + (lat - 59) * 0.35;
  return 11.5;
}

function mountainElevation(lat, lon) {
  const bLon = borderLon(lat);
  const distFromBorder = lon - bLon;
  if (distFromBorder > 6) return 0;

  let peakHeight = 0;
  for (const p of PEAKS) {
    const dlat = lat - p.lat;
    const dlon = lon - p.lon;
    const d2 = dlat * dlat + dlon * dlon;
    peakHeight += p.elev * Math.exp(-d2 / (2 * p.spread * p.spread));
  }

  const ridgeHeight = Math.max(0, 600 - distFromBorder * 250);
  const ridgeFade = lat > 59 && lat < 69 ? 1 : 0;

  return Math.max(peakHeight, ridgeHeight * ridgeFade);
}

function baseElevation(lat, lon) {
  const bLon = borderLon(lat);
  const dist = Math.max(0, lon - bLon);
  const coastal = Math.min(1, dist / 12);
  return 180 * (1 - coastal * coastal) + 20;
}

function hash(x, y) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function noise2d(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x, y, octaves = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2d(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

export function isLake(lat, lon) {
  for (const lk of LAKES) {
    const dx = (lon - lk.lon) / lk.rx;
    const dy = (lat - lk.lat) / lk.ry;
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

function pointInPoly(lat, lon, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1];
    const yj = poly[j][0], xj = poly[j][1];
    if ((yi > lat) !== (yj > lat) &&
        lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInsideSweden(lat, lon) {
  return pointInPoly(lat, lon, SWEDEN_MAIN) ||
         pointInPoly(lat, lon, GOTLAND) ||
         pointInPoly(lat, lon, OLAND);
}

export function getElevation(lat, lon) {
  if (!isInsideSweden(lat, lon)) return -20;
  if (isLake(lat, lon)) return -5;

  const base = baseElevation(lat, lon);
  const mountain = mountainElevation(lat, lon);
  const detail = (fbm(lat * 8, lon * 5, 4) - 0.5) * 80;
  const micro = (fbm(lat * 25, lon * 18, 3) - 0.5) * 30;

  return Math.max(1, base + mountain + detail + micro);
}
