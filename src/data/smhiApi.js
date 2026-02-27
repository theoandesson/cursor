import { SMHI_ENDPOINTS, MAX_STATIONS } from '../utils/constants.js';
import { FALLBACK_STATIONS } from './stations.js';

export async function fetchTemperatureData() {
  try {
    const stationsRes = await fetch(
      `${SMHI_ENDPOINTS.metobs}/parameter/1.json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!stationsRes.ok) throw new Error(`HTTP ${stationsRes.status}`);
    const stationsData = await stationsRes.json();

    const activeStations = (stationsData.station || [])
      .filter((s) => s.active !== false)
      .slice(0, MAX_STATIONS);

    if (activeStations.length === 0) throw new Error('No active stations');

    const results = await Promise.allSettled(
      activeStations.map((station) =>
        fetchStationTemperature(station.key, station)
      )
    );

    return results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);
  } catch (error) {
    console.warn('SMHI temperature fetch failed, using fallback:', error.message);
    return null;
  }
}

async function fetchStationTemperature(stationId, stationMeta) {
  const res = await fetch(
    `${SMHI_ENDPOINTS.metobs}/parameter/1/station/${stationId}/period/latest-hour/data.json`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const data = await res.json();

  const latestValue = data.value?.[data.value.length - 1];
  if (!latestValue) return null;

  const station = data.station || stationMeta || {};
  return {
    id: stationId,
    name: station.name || stationMeta?.name || `Station ${stationId}`,
    latitude: station.latitude ?? stationMeta?.latitude,
    longitude: station.longitude ?? stationMeta?.longitude,
    temperature: parseFloat(latestValue.value),
    updated: latestValue.date,
    quality: latestValue.quality,
  };
}

export async function fetchSeaLevelData() {
  try {
    const res = await fetch(
      `${SMHI_ENDPOINTS.ocobs}/parameter/1.json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const stations = (data.station || []).slice(0, 15);
    const results = await Promise.allSettled(
      stations.map((station) => fetchStationSeaLevel(station.id, station))
    );

    return results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);
  } catch (error) {
    console.warn('SMHI sea level fetch failed:', error.message);
    return null;
  }
}

async function fetchStationSeaLevel(stationId, stationMeta) {
  const res = await fetch(
    `${SMHI_ENDPOINTS.ocobs}/parameter/1/station/${stationId}/period/latest-hour/data.json`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const data = await res.json();

  const latestValue = data.value?.[data.value.length - 1];
  if (!latestValue) return null;

  const station = data.station || stationMeta || {};
  return {
    id: stationId,
    name: station.name || `Station ${stationId}`,
    latitude: station.latitude ?? stationMeta?.latitude,
    longitude: station.longitude ?? stationMeta?.longitude,
    seaLevel: parseFloat(latestValue.value),
    updated: latestValue.date,
  };
}

export function getFallbackData() {
  return FALLBACK_STATIONS.map((s) => ({
    ...s,
    updated: Date.now(),
    quality: 'fallback',
  }));
}
