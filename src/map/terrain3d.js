import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getElevation, isInsideSweden } from './heightmap.js';
import { getTerrainColor } from './terrainColors.js';
import { temperatureToColor } from '../utils/colors.js';

const SEG_X = 140;
const SEG_Z = 240;
const W = 8;
const H = 14;
const V_SCALE = 0.00072;
const BOUNDS = { west: 10.5, east: 25.0, south: 54.8, north: 69.5 };

let scene, camera, renderer, controls;
let markerGroup;
let animId = null;
let container = null;

export function initTerrain3D(el) {
  container = el;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060e1c);
  scene.fog = new THREE.FogExp2(0x060e1c, 0.012);

  camera = new THREE.PerspectiveCamera(
    40, el.clientWidth / el.clientHeight, 0.1, 200
  );
  camera.position.set(6, 10, 14);

  const canvas = document.createElement('canvas');
  canvas.id = 'terrain-canvas';
  el.appendChild(canvas);

  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: false,
    });
  } catch (_e) {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false,
      failIfMajorPerformanceCaveat: false,
    });
  }

  renderer.setSize(el.clientWidth, el.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4;
  controls.maxDistance = 40;
  controls.target.set(0, 0, -1);
  controls.maxPolarAngle = Math.PI * 0.48;

  scene.add(new THREE.AmbientLight(0x667799, 0.5));

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(10, 14, 8);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x8899cc, 0x334422, 0.5);
  scene.add(hemi);

  buildTerrain();
  buildWater();

  markerGroup = new THREE.Group();
  scene.add(markerGroup);

  const ro = new ResizeObserver(() => {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(el);

  startLoop();
}

function startLoop() {
  function loop() {
    animId = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();
}

export function stopTerrain3D() {
  if (animId != null) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

export function resumeTerrain3D() {
  if (animId == null && renderer) startLoop();
}

function toScene(lat, lon) {
  const x = ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west) - 0.5) * W;
  const z = -((lat - BOUNDS.south) / (BOUNDS.north - BOUNDS.south) - 0.5) * H;
  return { x, z };
}

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(W, H, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position.array;
  const colors = new Float32Array(pos.length);

  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], z = pos[i + 2];
    const lon = BOUNDS.west + ((x + W / 2) / W) * (BOUNDS.east - BOUNDS.west);
    const lat = BOUNDS.north - ((z + H / 2) / H) * (BOUNDS.north - BOUNDS.south);

    const elev = getElevation(lat, lon);
    pos[i + 1] = Math.max(elev, -20) * V_SCALE;

    const inside = isInsideSweden(lat, lon);
    const c = getTerrainColor(elev, inside);
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
  });

  scene.add(new THREE.Mesh(geo, mat));
}

function buildWater() {
  const geo = new THREE.PlaneGeometry(W * 2.5, H * 2.5);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0e3a62,
    transparent: true,
    opacity: 0.72,
    roughness: 0.15,
    metalness: 0.35,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.008;
  scene.add(mesh);
}

export function setMarkers3D(stations) {
  if (!markerGroup) return;
  while (markerGroup.children.length) {
    const c = markerGroup.children[0];
    markerGroup.remove(c);
    c.geometry?.dispose();
    c.material?.dispose();
  }

  stations.forEach((s) => {
    if (s.latitude == null || s.temperature == null) return;
    const { x, z } = toScene(s.latitude, s.longitude);
    const elev = getElevation(s.latitude, s.longitude);
    const y = Math.max(elev, 0) * V_SCALE + 0.04;

    const col = temperatureToColor(s.temperature);
    const geo = new THREE.ConeGeometry(0.06, 0.14, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: (col.r << 16) | (col.g << 8) | col.b,
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.set(x, y, z);
    markerGroup.add(marker);

    const glowGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: (col.r << 16) | (col.g << 8) | col.b,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, y + 0.08, z);
    markerGroup.add(glow);
  });
}
