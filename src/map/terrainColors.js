const PALETTE = [
  { stop: -20, r: 0.06, g: 0.18, b: 0.38 },
  { stop: -5,  r: 0.08, g: 0.28, b: 0.52 },
  { stop: 0,   r: 0.08, g: 0.32, b: 0.55 },
  { stop: 5,   r: 0.12, g: 0.30, b: 0.14 },
  { stop: 60,  r: 0.10, g: 0.33, b: 0.12 },
  { stop: 150, r: 0.15, g: 0.40, b: 0.14 },
  { stop: 300, r: 0.22, g: 0.46, b: 0.16 },
  { stop: 500, r: 0.36, g: 0.50, b: 0.20 },
  { stop: 700, r: 0.48, g: 0.46, b: 0.26 },
  { stop: 900, r: 0.52, g: 0.44, b: 0.30 },
  { stop: 1100, r: 0.55, g: 0.50, b: 0.42 },
  { stop: 1400, r: 0.62, g: 0.60, b: 0.56 },
  { stop: 1700, r: 0.75, g: 0.74, b: 0.72 },
  { stop: 2000, r: 0.90, g: 0.92, b: 0.95 },
  { stop: 2200, r: 0.96, g: 0.97, b: 0.99 },
];

export function getTerrainColor(elevation, inside) {
  if (!inside) return { r: 0.04, g: 0.10, b: 0.22 };

  let lower = PALETTE[0];
  let upper = PALETTE[PALETTE.length - 1];

  for (let i = 0; i < PALETTE.length - 1; i++) {
    if (elevation >= PALETTE[i].stop && elevation <= PALETTE[i + 1].stop) {
      lower = PALETTE[i];
      upper = PALETTE[i + 1];
      break;
    }
  }

  const range = upper.stop - lower.stop;
  const t = range === 0 ? 0 : (elevation - lower.stop) / range;

  return {
    r: lower.r + (upper.r - lower.r) * t,
    g: lower.g + (upper.g - lower.g) * t,
    b: lower.b + (upper.b - lower.b) * t,
  };
}
