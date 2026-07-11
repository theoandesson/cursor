import { DEFAULT_SATELLITE_SOURCE } from "../tiles/swedenTileSources.js";

export const MAP_MODES = Object.freeze({
  STANDARD: "standard",
  SATELLITE: "satellite",
  TERRAIN: "terrain",
  HYBRID: "hybrid"
});

export const DEFAULT_MAP_MODE = MAP_MODES.STANDARD;

export const MAP_MODE_OPTIONS = Object.freeze([
  {
    id: MAP_MODES.STANDARD,
    label: "Karta",
    title: "Standard vektorkarta med 3D-byggnader"
  },
  {
    id: MAP_MODES.SATELLITE,
    label: "Satellit",
    title: "Satellitbild över Sverige"
  },
  {
    id: MAP_MODES.TERRAIN,
    label: "Terräng",
    title: "Terrängkarta med höjdförstärkning och hillshade"
  },
  {
    id: MAP_MODES.HYBRID,
    label: "Hybrid",
    title: "Satellitbild med vägar och etiketter"
  }
]);

export const TERRAIN_MODE_CONFIG = Object.freeze({
  exaggeration: 2.35,
  hillshade: Object.freeze({
    exaggeration: 0.58,
    shadowColor: "#3d3224",
    highlightColor: "#ffffff",
    accentColor: "#000000",
    illuminationDirection: 335
  })
});

export const ESRI_WORLD_IMAGERY_TILES = Object.freeze([...DEFAULT_SATELLITE_SOURCE.tiles]);
