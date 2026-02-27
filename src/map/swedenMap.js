import { SWEDEN_MAIN, GOTLAND, OLAND } from './outline.js';
import { project, coordsToPath } from './projection.js';
import { temperatureToColor } from '../utils/colors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAP_W = 500;
const MAP_H = 900;

let svgEl = null;
let markersGroup = null;
let onMarkerHover = null;
let onMarkerLeave = null;

export function createMap(container, { onHover, onLeave } = {}) {
  onMarkerHover = onHover;
  onMarkerLeave = onLeave;

  svgEl = document.createElementNS(SVG_NS, 'svg');
  svgEl.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
  svgEl.setAttribute('class', 'sweden-svg');

  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `
    <radialGradient id="marker-glow">
      <stop offset="0%" stop-color="currentColor" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
    </radialGradient>
    <filter id="land-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#00bfff" flood-opacity="0.12"/>
    </filter>
  `;
  svgEl.appendChild(defs);

  drawLand(svgEl, SWEDEN_MAIN, 'sweden-land');
  drawLand(svgEl, GOTLAND, 'sweden-island');
  drawLand(svgEl, OLAND, 'sweden-island');

  markersGroup = document.createElementNS(SVG_NS, 'g');
  markersGroup.setAttribute('class', 'markers-group');
  svgEl.appendChild(markersGroup);

  container.appendChild(svgEl);
  return svgEl;
}

function drawLand(svg, coords, cls) {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', coordsToPath(coords, MAP_W, MAP_H));
  path.setAttribute('class', cls);
  svg.appendChild(path);
}

export function renderMarkers(stations) {
  if (!markersGroup) return;
  markersGroup.innerHTML = '';

  stations.forEach((station) => {
    if (station.latitude == null || station.longitude == null) return;
    if (station.temperature == null && station.seaLevel == null) return;

    const { x, y } = project(station.latitude, station.longitude, MAP_W, MAP_H);
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'station-marker');
    group.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);

    const color = station.temperature != null
      ? temperatureToColor(station.temperature)
      : { r: 100, g: 180, b: 255 };
    const cssColor = `rgb(${color.r},${color.g},${color.b})`;

    const glow = document.createElementNS(SVG_NS, 'circle');
    glow.setAttribute('r', '14');
    glow.setAttribute('fill', 'url(#marker-glow)');
    glow.style.color = cssColor;
    group.appendChild(glow);

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', cssColor);
    dot.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    dot.setAttribute('stroke-width', '1');
    dot.setAttribute('class', 'marker-dot');
    group.appendChild(dot);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', '9');
    label.setAttribute('y', '4');
    label.setAttribute('class', 'marker-label');
    label.textContent = station.name;
    group.appendChild(label);

    group.addEventListener('mouseenter', (e) => {
      dot.setAttribute('r', '7');
      if (onMarkerHover) onMarkerHover(station, e);
    });
    group.addEventListener('mouseleave', () => {
      dot.setAttribute('r', '5');
      if (onMarkerLeave) onMarkerLeave();
    });

    markersGroup.appendChild(group);
  });
}
