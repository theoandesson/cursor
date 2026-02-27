import { SWEDEN_DATA_SOURCES } from "../../config/swedenMapConfig.js";

export const createSources = () => ({
  sweden_vector: {
    type: "vector",
    tiles: SWEDEN_DATA_SOURCES.vectorTiles,
    minzoom: 0,
    maxzoom: 14
  },
  "sweden-dem-low": {
    type: "raster-dem",
    tiles: SWEDEN_DATA_SOURCES.terrainTiles,
    encoding: "terrarium",
    tileSize: 256,
    minzoom: 0,
    maxzoom: 8
  },
  "sweden-dem-high": {
    type: "raster-dem",
    tiles: SWEDEN_DATA_SOURCES.terrainTiles,
    encoding: "terrarium",
    tileSize: 256,
    minzoom: 0,
    maxzoom: 12
  }
});
