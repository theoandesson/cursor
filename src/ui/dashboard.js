import { computeStats } from '../data/stations.js';
import { temperatureToCss } from '../utils/colors.js';

let dashboardEl;
let legendEl;

export function createDashboard() {
  dashboardEl = document.getElementById('dashboard');
  legendEl = document.getElementById('legend');

  dashboardEl.innerHTML = `
    <div class="panel panel-temp">
      <div class="panel-icon">🌡️</div>
      <div class="panel-content">
        <h3>Temperatur</h3>
        <div class="stat-value" id="stat-avg-temp">--°C</div>
        <div class="stat-range">
          <span id="stat-min-temp">Min: --°C</span>
          <span id="stat-max-temp">Max: --°C</span>
        </div>
        <div class="stat-meta" id="stat-station-count">-- stationer</div>
      </div>
    </div>
    <div class="panel panel-co2">
      <div class="panel-icon">💨</div>
      <div class="panel-content">
        <h3>CO₂ (globalt)</h3>
        <div class="stat-value" id="stat-co2">--</div>
        <div class="stat-meta">Baserat på global trend</div>
      </div>
    </div>
    <div class="panel panel-sea">
      <div class="panel-icon">🌊</div>
      <div class="panel-content">
        <h3>Havsnivå</h3>
        <div class="stat-value" id="stat-sea-level">-- cm</div>
        <div class="stat-meta" id="stat-sea-count">-- stationer</div>
      </div>
    </div>
    <div class="panel panel-info" id="panel-station-info">
      <p class="hint">Hovra över en station för detaljer</p>
    </div>
  `;

  renderLegend();
}

export function updateDashboard(stations) {
  const stats = computeStats(stations);

  setText('stat-avg-temp', stats.avgTemp != null
    ? `${stats.avgTemp.toFixed(1)}°C` : '--°C');
  setText('stat-min-temp', `Min: ${stats.minTemp != null
    ? stats.minTemp.toFixed(1) + '°C' : '--°C'}`);
  setText('stat-max-temp', `Max: ${stats.maxTemp != null
    ? stats.maxTemp.toFixed(1) + '°C' : '--°C'}`);
  setText('stat-station-count', `${stats.stationCount} stationer`);

  if (stats.avgTemp != null) {
    const el = document.getElementById('stat-avg-temp');
    if (el) el.style.color = temperatureToCss(stats.avgTemp);
  }

  setText('stat-sea-level', stats.avgSeaLevel != null
    ? `${stats.avgSeaLevel.toFixed(1)} cm` : '-- cm');
  setText('stat-sea-count', stats.seaStationCount > 0
    ? `${stats.seaStationCount} stationer` : 'Ingen data');

  estimateCO2();
}

function estimateCO2() {
  const now = new Date();
  const basePpm = 422;
  const yearlyIncrease = 2.5;
  const yearDiff = now.getFullYear() - 2024 + now.getMonth() / 12;
  const seasonal = Math.sin((now.getMonth() - 4) * Math.PI / 6) * 3;
  const estimated = basePpm + yearDiff * yearlyIncrease + seasonal;
  setText('stat-co2', `~${estimated.toFixed(0)} ppm`);
}

function renderLegend() {
  if (!legendEl) return;
  legendEl.innerHTML = `
    <div class="legend-content">
      <span class="legend-title">Temperatur (°C)</span>
      <div class="legend-bar"></div>
      <div class="legend-labels">
        <span>-30</span><span>-10</span><span>0</span><span>15</span><span>35</span>
      </div>
    </div>
  `;
}

export function showStationInfo(data) {
  const panel = document.getElementById('panel-station-info');
  if (!panel) return;

  if (!data) {
    panel.innerHTML = '<p class="hint">Hovra över en station för detaljer</p>';
    return;
  }

  panel.innerHTML = `
    <h3>${data.name}</h3>
    <div class="station-details">
      ${data.temperature != null
        ? `<div class="detail-row">
             <span>Temperatur</span>
             <span style="color:${temperatureToCss(data.temperature)}">${data.temperature.toFixed(1)}°C</span>
           </div>` : ''}
      ${data.seaLevel != null
        ? `<div class="detail-row">
             <span>Havsnivå</span>
             <span>${data.seaLevel.toFixed(1)} cm</span>
           </div>` : ''}
      <div class="detail-row">
        <span>Position</span>
        <span>${data.latitude.toFixed(2)}°N, ${data.longitude.toFixed(2)}°E</span>
      </div>
      ${data.updated
        ? `<div class="detail-row muted">
             <span>Uppdaterad</span>
             <span>${new Date(data.updated).toLocaleTimeString('sv-SE')}</span>
           </div>` : ''}
    </div>
  `;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
