import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA_DISTANCE } from '../utils/constants.js';

export function initScene() {
  const canvas = document.getElementById('globe-canvas');
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(
    CAMERA_DISTANCE * 0.6,
    CAMERA_DISTANCE * 0.5,
    CAMERA_DISTANCE * 0.6
  );

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: false,
    });
  } catch (_e) {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    });
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 6.5;
  controls.maxDistance = 30;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  const ambientLight = new THREE.AmbientLight(0x88aacc, 0.6);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
  sunLight.position.set(10, 6, 8);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x4488cc, 0.4);
  fillLight.position.set(-8, -2, -6);
  scene.add(fillLight);

  addStarfield(scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls };
}

function addStarfield(scene) {
  const count = 4000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.3 + Math.random() * 0.7;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  scene.add(new THREE.Points(geometry, material));
}

export function startAnimationLoop(scene, camera, renderer, controls, earth, onTick) {
  let startTime = performance.now();

  function loop() {
    requestAnimationFrame(loop);
    const elapsed = (performance.now() - startTime) / 1000;
    controls.update();
    earth.rotation.y += 0.0008;
    if (onTick) onTick(elapsed);
    renderer.render(scene, camera);
  }

  loop();
}
