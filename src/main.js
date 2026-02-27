import './styles/main.css';
import './styles/dashboard.css';

import { createMap, renderMarkers } from './map/swedenMap.js';
import { fetchTemperatureData, fetchSeaLevelData, getFallbackData } from './data/smhiApi.js';
import { processStationData } from './data/stations.js';
import { createDashboard, updateDashboard, showStationInfo } from './ui/dashboard.js';
import { showTooltip, hideTooltip } from './ui/tooltip.js';
import { REFRESH_INTERVAL } from './utils/constants.js';

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

  await loadClimateData();
  setInterval(loadClimateData, REFRESH_INTERVAL);
}

async function loadClimateData() {
  try {
    const [tempResult, seaResult] = await Promise.allSettled([
      fetchTemperatureData(),
      fetchSeaLevelData(),
    ]);

    const tempData = tempResult.status === 'fulfilled' ? tempResult.value : null;
    const seaData = seaResult.status === 'fulfilled' ? seaResult.value : null;

    let stations;
    if (!tempData && !seaData) {
      stations = getFallbackData();
    } else {
      stations = processStationData(tempData, seaData);
    }

    renderMarkers(stations);
    updateDashboard(stations);
  } catch (error) {
    console.error('Failed to load climate data:', error);
    const fallback = getFallbackData();
    renderMarkers(fallback);
    updateDashboard(fallback);
  }
}

init().catch(console.error);
