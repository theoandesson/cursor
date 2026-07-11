import { SWEDEN_TILE_MODE } from "../../config/swedenMapConfig.js";
import { SWEDEN_BOUNDARY_FEATURE } from "../../data/swedenBoundary.js";
import { createSwedenTileSources } from "../tiles/swedenTileSources.js";

const SELF_HOSTED_TILE_MODE = "self-hosted";

export const createSources = ({ mode } = {}) => ({
  sweden_boundary: {
    type: "geojson",
    data: SWEDEN_BOUNDARY_FEATURE
  },
  ...createSwedenTileSources({
    mode,
    useSelfHostedVector: SWEDEN_TILE_MODE === SELF_HOSTED_TILE_MODE
  }),
  traffic_flow: {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  }
});
