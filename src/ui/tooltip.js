import * as THREE from 'three';
import { getInteractiveObjects } from '../globe/markers.js';
import { showStationInfo } from './dashboard.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let tooltipEl;
let hoveredObject = null;

export function initTooltip(camera, scene, renderer) {
  tooltipEl = document.getElementById('tooltip');

  renderer.domElement.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const objects = getInteractiveObjects();
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit !== hoveredObject) {
        hoveredObject = hit;
        const data = hit.userData;
        showTooltip(event.clientX, event.clientY, data);
        showStationInfo(data);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        moveTooltip(event.clientX, event.clientY);
      }
    } else {
      if (hoveredObject) {
        hoveredObject = null;
        hideTooltip();
        showStationInfo(null);
        renderer.domElement.style.cursor = 'grab';
      }
    }
  });

  renderer.domElement.addEventListener('mouseleave', () => {
    hoveredObject = null;
    hideTooltip();
    showStationInfo(null);
  });
}

function showTooltip(x, y, data) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = `
    <strong>${data.name}</strong>
    ${data.temperature != null ? `<br>${data.temperature.toFixed(1)}°C` : ''}
    ${data.seaLevel != null ? `<br>Havsnivå: ${data.seaLevel.toFixed(1)} cm` : ''}
  `;
  tooltipEl.style.display = 'block';
  moveTooltip(x, y);
}

function moveTooltip(x, y) {
  if (!tooltipEl) return;
  tooltipEl.style.left = `${x + 16}px`;
  tooltipEl.style.top = `${y - 10}px`;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}
