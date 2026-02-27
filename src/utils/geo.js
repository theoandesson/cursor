import * as THREE from 'three';
import { EARTH_RADIUS } from './constants.js';

let CesiumLib = null;
let cesiumReady = false;

export async function initGeoEngine() {
  try {
    CesiumLib = await import('cesium');
    cesiumReady = true;
    return true;
  } catch (_e) {
    console.warn('Cesium not available, using fallback spherical math');
    return false;
  }
}

export function latLonToVector3(lat, lon, radius = EARTH_RADIUS) {
  if (cesiumReady && CesiumLib) {
    return cesiumLatLonToVector3(lat, lon, radius);
  }
  return fallbackLatLonToVector3(lat, lon, radius);
}

function cesiumLatLonToVector3(lat, lon, radius) {
  const cartographic = CesiumLib.Cartographic.fromDegrees(lon, lat, 0);
  const cartesian = CesiumLib.Ellipsoid.WGS84.cartographicToCartesian(cartographic);
  const scale = radius / CesiumLib.Ellipsoid.WGS84.maximumRadius;
  return new THREE.Vector3(
    cartesian.x * scale,
    cartesian.z * scale,
    -cartesian.y * scale
  );
}

function fallbackLatLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function surfaceNormal(lat, lon) {
  return latLonToVector3(lat, lon, 1).normalize();
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (cesiumReady && CesiumLib) {
    const c1 = CesiumLib.Cartographic.fromDegrees(lon1, lat1);
    const c2 = CesiumLib.Cartographic.fromDegrees(lon2, lat2);
    const geodesic = new CesiumLib.EllipsoidGeodesic(c1, c2);
    return geodesic.surfaceDistance / 1000;
  }

  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
