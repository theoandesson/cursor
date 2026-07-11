import { SWEDEN_BOUNDARY_FEATURE } from "../../data/swedenBoundary.js";
import { createSwedenTileSources, isSelfHostedTileMode } from "../tiles/swedenTileSources.js";

export const createSources = ({ mode } = {}) => ({
  sweden_boundary: {
    type: "geojson",
    data: SWEDEN_BOUNDARY_FEATURE
  },
  ...createSwedenTileSources({
    mode,
    useSelfHostedVector: isSelfHostedTileMode()
  })
});
