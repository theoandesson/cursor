import * as THREE from 'three';
import { EARTH_RADIUS, ATMOSPHERE_SCALE } from '../utils/constants.js';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 uSunDirection;

  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    float sunFactor = max(0.3, dot(normalize(vWorldPosition), uSunDirection));
    vec3 color = mix(
      vec3(0.1, 0.4, 0.9),
      vec3(0.3, 0.7, 1.0),
      intensity
    );
    gl_FragColor = vec4(color, intensity * 0.7 * sunFactor);
  }
`;

export function createAtmosphere() {
  const geometry = new THREE.SphereGeometry(
    EARTH_RADIUS * ATMOSPHERE_SCALE, 64, 64
  );

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
