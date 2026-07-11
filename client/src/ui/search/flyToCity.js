import { SWEDEN_MAP_CONFIG } from "../../config/swedenMapConfig.js";

const FLY_DURATION_MS = 1800;
const CITY_ZOOM = 12;
const CITY_PITCH = 50;

export const flyToCity = (map, city, { onStart, onComplete } = {}) => {
  onStart?.(city);
  map.flyTo({
    center: [city.lon, city.lat],
    zoom: CITY_ZOOM,
    pitch: CITY_PITCH,
    bearing: map.getBearing(),
    duration: FLY_DURATION_MS,
    essential: true
  });
  map.once("moveend", () => onComplete?.(city));
};

export const flyToCoordinates = (map, { lon, lat, label }, options = {}) => {
  flyToCity(
    map,
    { name: label ?? "Vald plats", lon, lat, county: "Koordinat" },
    options
  );
};

export const flyToSwedenOverview = (map) => {
  map.flyTo({
    center: SWEDEN_MAP_CONFIG.center,
    zoom: SWEDEN_MAP_CONFIG.zoom,
    pitch: SWEDEN_MAP_CONFIG.pitch,
    bearing: SWEDEN_MAP_CONFIG.bearing,
    duration: FLY_DURATION_MS,
    essential: true
  });
};

export const resetBearing = (map) => {
  map.easeTo({
    bearing: SWEDEN_MAP_CONFIG.bearing,
    duration: 400,
    essential: true
  });
};
