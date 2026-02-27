import './styles/main.css';
import './styles/dashboard.css';

import { createMap, renderMarkers } from './map/swedenMap.js';
import { fetchTemperatureData, fetchSeaLevelData, getFallbackData } from './data/smhiApi.js';
import { processStationData } from './data/stations.js';
import { createDashboard, updateDashboard, showStationInfo } from './ui/dashboard.js';
import { showTooltip, hideTooltip } from './ui/tooltip.js';
import { REFRESH_INTERVAL } from './utils/constants.js';

let terrain3dModule = null;
let terrain3dReady = false;
let currentView = '2d';
let currentStations = [];

async function init() {
  createDashboard();

  const mapContainer = document.getElementById('map-container');
  createMap(mapContainer, {
    onHover: (station, event) => {
      showStationInfo(station);
      showTooltip(event, station);
    },
    onLeave: () => {
      showStationInfo(null);
      hideTooltip();
    },
  });

  setupViewToggle();
  await loadClimateData();
  setInterval(loadClimateData, REFRESH_INTERVAL);
}

function setupViewToggle() {
  const toggleContainer = document.getElementById('view-toggle');
  toggleContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    const view = btn.dataset.view;
    if (view === currentView) return;
    switchView(view);
  });
}

async function switchView(view) {
  currentView = view;

  document.querySelectorAll('.toggle-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  const map2d = document.getElementById('map-container');
  const map3d = document.getElementById('terrain-container');

  if (view === '3d') {
    map2d.classList.remove('active');
    map3d.classList.add('active');

    if (!terrain3dReady) {
      terrain3dModule = await import('./map/terrain3d.js');
      terrain3dModule.initTerrain3D(map3d);
      terrain3dReady = true;
      if (currentStations.length) {
        terrain3dModule.setMarkers3D(currentStations);
      }
    } else {
      terrain3dModule.resumeTerrain3D();
    }
  } else {
    map3d.classList.remove('active');
    map2d.classList.add('active');
    if (terrain3dModule) terrain3dModule.stopTerrain3D();
  }
}

async function loadClimateData() {
  try {
    const [tempResult, seaResult] = await Promise.allSettled([
      fetchTemperatureData(),
      fetchSeaLevelData(),
    ]);

    const tempData = tempResult.status === 'fulfilled' ? tempResult.value : null;
    const seaData = seaResult.status === 'fulfilled' ? seaResult.value : null;

    if (!tempData && !seaData) {
      currentStations = getFallbackData();
    } else {
      currentStations = processStationData(tempData, seaData);
    }
  } catch (_error) {
    currentStations = getFallbackData();
  }

  renderMarkers(currentStations);
  updateDashboard(currentStations);
  if (terrain3dReady && terrain3dModule) {
    terrain3dModule.setMarkers3D(currentStations);
  }
}

init().catch(console.error);
