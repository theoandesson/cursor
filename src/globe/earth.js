import * as THREE from 'three';
import { EARTH_RADIUS } from '../utils/constants.js';

const TEXTURE_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';

export function createEarth() {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

  const material = new THREE.MeshPhongMaterial({
    color: 0x2244aa,
    shininess: 15,
    specular: new THREE.Color(0x333333),
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';

  loader.load(
    TEXTURE_URL,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    },
    undefined,
    () => {
      material.map = createFallbackTexture();
      material.color.set(0xffffff);
      material.needsUpdate = true;
    }
  );

  loader.load(
    BUMP_URL,
    (texture) => {
      material.bumpMap = texture;
      material.bumpScale = 0.04;
      material.needsUpdate = true;
    }
  );

  return group;
}

function createFallbackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0d2847');
  gradient.addColorStop(0.3, '#1a4b8c');
  gradient.addColorStop(0.5, '#1565c0');
  gradient.addColorStop(0.7, '#1a4b8c');
  gradient.addColorStop(1, '#0d2847');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = 'rgba(46, 125, 50, 0.6)';
  drawContinent(ctx, 200, 120, 180, 200);
  drawContinent(ctx, 550, 80, 120, 160);
  drawContinent(ctx, 500, 300, 100, 120);
  drawContinent(ctx, 750, 160, 200, 180);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawContinent(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}
