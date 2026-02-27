export const FALLBACK_STATIONS = [
  { id: 'fb-1', name: 'Kiruna', latitude: 67.86, longitude: 20.23, temperature: -12 },
  { id: 'fb-2', name: 'Gällivare', latitude: 67.13, longitude: 20.65, temperature: -11 },
  { id: 'fb-3', name: 'Luleå', latitude: 65.58, longitude: 22.15, temperature: -8 },
  { id: 'fb-4', name: 'Umeå', latitude: 63.83, longitude: 20.26, temperature: -6 },
  { id: 'fb-5', name: 'Östersund', latitude: 63.18, longitude: 14.64, temperature: -7 },
  { id: 'fb-6', name: 'Sundsvall', latitude: 62.39, longitude: 17.31, temperature: -4 },
  { id: 'fb-7', name: 'Gävle', latitude: 60.67, longitude: 17.15, temperature: -2 },
  { id: 'fb-8', name: 'Falun', latitude: 60.61, longitude: 15.63, temperature: -3 },
  { id: 'fb-9', name: 'Karlstad', latitude: 59.38, longitude: 13.50, temperature: 0 },
  { id: 'fb-10', name: 'Uppsala', latitude: 59.86, longitude: 17.64, temperature: -1 },
  { id: 'fb-11', name: 'Stockholm', latitude: 59.33, longitude: 18.07, temperature: 1 },
  { id: 'fb-12', name: 'Norrköping', latitude: 58.59, longitude: 16.18, temperature: 1 },
  { id: 'fb-13', name: 'Linköping', latitude: 58.41, longitude: 15.62, temperature: 1 },
  { id: 'fb-14', name: 'Jönköping', latitude: 57.78, longitude: 14.16, temperature: 2 },
  { id: 'fb-15', name: 'Göteborg', latitude: 57.71, longitude: 11.97, temperature: 3 },
  { id: 'fb-16', name: 'Visby', latitude: 57.64, longitude: 18.30, temperature: 2 },
  { id: 'fb-17', name: 'Växjö', latitude: 56.88, longitude: 14.81, temperature: 2 },
  { id: 'fb-18', name: 'Kalmar', latitude: 56.66, longitude: 16.36, temperature: 3 },
  { id: 'fb-19', name: 'Halmstad', latitude: 56.67, longitude: 12.86, temperature: 3 },
  { id: 'fb-20', name: 'Malmö', latitude: 55.60, longitude: 13.00, temperature: 4 },
  { id: 'fb-21', name: 'Lund', latitude: 55.71, longitude: 13.19, temperature: 4 },
  { id: 'fb-22', name: 'Helsingborg', latitude: 56.05, longitude: 12.69, temperature: 4 },
  { id: 'fb-23', name: 'Abisko', latitude: 68.36, longitude: 18.82, temperature: -14 },
  { id: 'fb-24', name: 'Karesuando', latitude: 68.44, longitude: 22.50, temperature: -16 },
  { id: 'fb-25', name: 'Haparanda', latitude: 65.83, longitude: 24.14, temperature: -9 },
];

export function processStationData(tempData, seaData) {
  let stations;

  if (tempData && tempData.length > 0) {
    stations = tempData.filter((s) => s && s.latitude != null && s.longitude != null);
  } else {
    stations = [...FALLBACK_STATIONS];
  }

  if (seaData && seaData.length > 0) {
    seaData.forEach((sea) => {
      if (!sea || sea.latitude == null) return;
      const match = stations.find(
        (s) =>
          Math.abs(s.latitude - sea.latitude) < 0.5 &&
          Math.abs(s.longitude - sea.longitude) < 0.5
      );
      if (match) {
        match.seaLevel = sea.seaLevel;
      } else {
        stations.push({
          id: sea.id,
          name: sea.name,
          latitude: sea.latitude,
          longitude: sea.longitude,
          temperature: null,
          seaLevel: sea.seaLevel,
          updated: sea.updated,
        });
      }
    });
  }

  return stations;
}

export function computeStats(stations) {
  const temps = stations
    .map((s) => s.temperature)
    .filter((t) => t != null);

  const seaLevels = stations
    .map((s) => s.seaLevel)
    .filter((l) => l != null);

  return {
    avgTemp: temps.length > 0
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : null,
    minTemp: temps.length > 0 ? Math.min(...temps) : null,
    maxTemp: temps.length > 0 ? Math.max(...temps) : null,
    stationCount: temps.length,
    avgSeaLevel: seaLevels.length > 0
      ? seaLevels.reduce((a, b) => a + b, 0) / seaLevels.length
      : null,
    seaStationCount: seaLevels.length,
  };
}
