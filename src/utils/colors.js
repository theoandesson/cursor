import { TEMP_RANGE } from './constants.js';

const TEMP_GRADIENT = [
  { stop: 0.0, color: [30, 60, 180] },
  { stop: 0.15, color: [50, 120, 220] },
  { stop: 0.3, color: [80, 180, 220] },
  { stop: 0.45, color: [100, 210, 160] },
  { stop: 0.55, color: [180, 220, 80] },
  { stop: 0.7, color: [240, 210, 40] },
  { stop: 0.85, color: [240, 140, 30] },
  { stop: 1.0, color: [220, 40, 30] },
];

export function temperatureToColor(temp) {
  const t = Math.max(0, Math.min(1,
    (temp - TEMP_RANGE.min) / (TEMP_RANGE.max - TEMP_RANGE.min)
  ));

  let lower = TEMP_GRADIENT[0];
  let upper = TEMP_GRADIENT[TEMP_GRADIENT.length - 1];

  for (let i = 0; i < TEMP_GRADIENT.length - 1; i++) {
    if (t >= TEMP_GRADIENT[i].stop && t <= TEMP_GRADIENT[i + 1].stop) {
      lower = TEMP_GRADIENT[i];
      upper = TEMP_GRADIENT[i + 1];
      break;
    }
  }

  const range = upper.stop - lower.stop;
  const factor = range === 0 ? 0 : (t - lower.stop) / range;

  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * factor);
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * factor);
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * factor);

  return { r, g, b, hex: (r << 16) | (g << 8) | b };
}

export function temperatureToCss(temp) {
  const { r, g, b } = temperatureToColor(temp);
  return `rgb(${r}, ${g}, ${b})`;
}

export function seaLevelToColor(level) {
  if (level > 50) return 0xff4444;
  if (level > 20) return 0xffaa44;
  if (level > -20) return 0x44ccff;
  if (level > -50) return 0x4488ff;
  return 0x2244cc;
}
