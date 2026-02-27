export const EARTH_RADIUS = 5;
export const MARKER_BASE_SIZE = 0.04;
export const MARKER_HEIGHT_SCALE = 0.15;
export const ATMOSPHERE_SCALE = 1.15;
export const CAMERA_DISTANCE = 14;
export const REFRESH_INTERVAL = 10 * 60 * 1000;
export const MAX_STATIONS = 50;

export const SWEDEN_CENTER = { lat: 63.0, lon: 16.0 };
export const SWEDEN_BOUNDS = {
  north: 69.1,
  south: 55.3,
  west: 11.0,
  east: 24.2,
};

export const TEMP_RANGE = { min: -30, max: 35 };

export const SMHI_ENDPOINTS = {
  metobs: '/api/smhi/metobs/api/version/1.0',
  ocobs: '/api/smhi/ocobs/api/version/latest',
};
