import {
  SWEDEN_DATA_SOURCES,
  SWEDEN_SOURCE_BOUNDS
} from "../../config/swedenMapConfig.js";
import { SWEDEN_BOUNDARY_FEATURE } from "../../data/swedenBoundary.js";

export const createSources = () => ({
  sweden_boundary: {
    type: "geojson",
    data: SWEDEN_BOUNDARY_FEATURE
  },
  sweden_vector: {
    type: "vector",
    url: SWEDEN_DATA_SOURCES.vectorTileJsonUrl,
    bounds: SWEDEN_SOURCE_BOUNDS,
    minzoom: 0,
    maxzoom: 14
  },
  "sweden-dem": {
    type: "raster-dem",
    tiles: SWEDEN_DATA_SOURCES.terrainTiles,
    encoding: "terrarium",
    tileSize: 256,
    bounds: SWEDEN_SOURCE_BOUNDS,
    minzoom: 0,
    maxzoom: 12
  }
});
