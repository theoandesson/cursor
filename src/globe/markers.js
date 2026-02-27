import * as THREE from 'three';
import { latLonToVector3, surfaceNormal } from '../utils/geo.js';
import { temperatureToColor } from '../utils/colors.js';
import { EARTH_RADIUS, MARKER_BASE_SIZE, MARKER_HEIGHT_SCALE } from '../utils/constants.js';

const markerGroup = new THREE.Group();
let currentMarkers = [];

export function getMarkerGroup() {
  return markerGroup;
}

export function createMarkers(scene, stations, existingMarkers = []) {
  existingMarkers.forEach((m) => {
    markerGroup.remove(m.pillar);
    markerGroup.remove(m.glow);
    m.pillar.geometry.dispose();
    m.pillar.material.dispose();
    m.glow.geometry.dispose();
    m.glow.material.dispose();
  });

  if (!markerGroup.parent) scene.add(markerGroup);

  const newMarkers = [];

  stations.forEach((station) => {
    if (station.temperature == null) return;

    const pos = latLonToVector3(station.latitude, station.longitude, EARTH_RADIUS + 0.02);
    const normal = surfaceNormal(station.latitude, station.longitude);
    const color = temperatureToColor(station.temperature);
    const height = MARKER_BASE_SIZE + Math.abs(station.temperature) * MARKER_HEIGHT_SCALE * 0.05;

    const pillarGeo = new THREE.CylinderGeometry(
      MARKER_BASE_SIZE * 0.4, MARKER_BASE_SIZE * 0.6, height, 8
    );
    const pillarMat = new THREE.MeshPhongMaterial({
      color: color.hex,
      emissive: color.hex,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    pillar.quaternion.copy(quaternion);
    pillar.position.copy(pos).addScaledVector(normal, height / 2);

    pillar.userData = {
      type: 'station',
      name: station.name,
      temperature: station.temperature,
      latitude: station.latitude,
      longitude: station.longitude,
      seaLevel: station.seaLevel,
      updated: station.updated,
    };

    const glowGeo = new THREE.SphereGeometry(MARKER_BASE_SIZE * 1.2, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color.hex,
      transparent: true,
      opacity: 0.35,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(pos);

    markerGroup.add(pillar);
    markerGroup.add(glow);
    newMarkers.push({ pillar, glow, station });
  });

  currentMarkers = newMarkers;
  return newMarkers;
}

export function animateMarkers(elapsed) {
  const pulse = 0.3 + Math.sin(elapsed * 2) * 0.15;
  currentMarkers.forEach(({ glow }) => {
    glow.material.opacity = pulse;
  });
}

export function getInteractiveObjects() {
  return currentMarkers.map((m) => m.pillar);
}
