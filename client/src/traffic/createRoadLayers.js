import {
  createBridgeFilter,
  createDividedRoadFilter,
  createDrivableRoadFilter,
  createGroundRoadFilter,
  createOnewayArrowFilter,
  createRoadClassSortKeyExpression,
  createTunnelFilter,
  HYBRID_ROAD_CLASSES,
  ROAD_CLASSES
} from "./roadClasses.js";
import {
  createBridgeCasingColorExpression,
  createOnewayArrowColorExpression,
  createRoadCasingColorExpression,
  createRoadDividerColorExpression,
  createRoadFillColorExpression,
  createTunnelCasingColorExpression,
  createTunnelFillColorExpression,
  ROUND_LINE_LAYOUT,
  TUNNEL_DASHARRAY
} from "./roadExpressions.js";
import {
  createRoadCasingWidthExpression,
  createRoadDividerWidthExpression,
  createRoadFillWidthExpression
} from "./roadWidths.js";

const HYBRID_OPACITY = Object.freeze({
  casing: 0.84,
  fill: 0.94,
  divider: 0.88,
  tunnelCasing: 0.72,
  tunnelFill: 0.8
});

const VECTOR_OPACITY = Object.freeze({
  casing: 0.9,
  fill: 0.94,
  divider: 0.92,
  tunnelCasing: 0.78,
  tunnelFill: 0.86
});

const resolveOpacity = (variant) => (variant === "hybrid" ? HYBRID_OPACITY : VECTOR_OPACITY);

const withPrefix = (idPrefix, layerId) => (idPrefix ? `${idPrefix}-${layerId}` : layerId);

const createBaseLineLayer = ({
  id,
  filter,
  palette,
  paint,
  layout = ROUND_LINE_LAYOUT,
  minzoom = 5
}) => ({
  id,
  source: "sweden_vector",
  "source-layer": "transportation",
  type: "line",
  minzoom,
  filter,
  layout,
  paint: {
    "line-sort-key": createRoadClassSortKeyExpression(),
    ...paint
  }
});

const createTunnelLayers = ({ palette, idPrefix, roadFilter, opacity }) => [
  createBaseLineLayer({
    id: withPrefix(idPrefix, "roads-tunnel-casing"),
    filter: ["all", roadFilter, createTunnelFilter()],
    paint: {
      "line-color": createTunnelCasingColorExpression(palette),
      "line-width": createRoadCasingWidthExpression(),
      "line-opacity": opacity.tunnelCasing,
      "line-dasharray": TUNNEL_DASHARRAY
    }
  }),
  createBaseLineLayer({
    id: withPrefix(idPrefix, "roads-tunnel-fill"),
    filter: ["all", roadFilter, createTunnelFilter()],
    paint: {
      "line-color": createTunnelFillColorExpression(palette),
      "line-width": createRoadFillWidthExpression(),
      "line-opacity": opacity.tunnelFill,
      "line-dasharray": TUNNEL_DASHARRAY
    }
  })
];

const createGroundLayers = ({ palette, idPrefix, roadFilter, opacity }) => [
  createBaseLineLayer({
    id: withPrefix(idPrefix, "roads-casing"),
    filter: ["all", roadFilter, createGroundRoadFilter()],
    paint: {
      "line-color": createRoadCasingColorExpression(palette),
      "line-width": createRoadCasingWidthExpression(),
      "line-opacity": opacity.casing,
      "line-blur": 0.2
    }
  }),
  createBaseLineLayer({
    id: withPrefix(idPrefix, "roads-fill"),
    filter: ["all", roadFilter, createGroundRoadFilter()],
    paint: {
      "line-color": createRoadFillColorExpression(palette),
      "line-width": createRoadFillWidthExpression(),
      "line-opacity": opacity.fill,
      "line-blur": 0.1
    }
  })
];

const createBridgeLayers = ({ palette, idPrefix, roadFilter, opacity }) => [
  createBaseLineLayer({
    id: withPrefix(idPrefix, "roads-bridge-casing"),
    filter: ["all", roadFilter, createBridgeFilter()],
    paint: {
      "line-color": createBridgeCasingColorExpression(palette),
      "line-width": createRoadCasingWidthExpression({ bridge: true }),
      "line-opacity": opacity.casing,
      "line-blur": 0.15
    }
  }),
  createBaseLineLayer({
    id: withPrefix(idPrefix, "roads-bridge-fill"),
    filter: ["all", roadFilter, createBridgeFilter()],
    paint: {
      "line-color": createRoadFillColorExpression(palette),
      "line-width": createRoadFillWidthExpression(),
      "line-opacity": opacity.fill,
      "line-blur": 0.05
    }
  })
];

const createDividerLayer = ({ palette, idPrefix, roadFilter, opacity }) => ({
  id: withPrefix(idPrefix, "roads-divider"),
  source: "sweden_vector",
  "source-layer": "transportation",
  type: "line",
  minzoom: 11,
  filter: ["all", roadFilter, createDividedRoadFilter(), createGroundRoadFilter()],
  layout: ROUND_LINE_LAYOUT,
  paint: {
    "line-color": createRoadDividerColorExpression(palette),
    "line-width": createRoadDividerWidthExpression(),
    "line-opacity": opacity.divider,
    "line-offset": 0
  }
});

const createBridgeDividerLayer = ({ palette, idPrefix, roadFilter, opacity }) => ({
  id: withPrefix(idPrefix, "roads-bridge-divider"),
  source: "sweden_vector",
  "source-layer": "transportation",
  type: "line",
  minzoom: 11,
  filter: ["all", roadFilter, createDividedRoadFilter(), createBridgeFilter()],
  layout: ROUND_LINE_LAYOUT,
  paint: {
    "line-color": createRoadDividerColorExpression(palette),
    "line-width": createRoadDividerWidthExpression(),
    "line-opacity": opacity.divider
  }
});

const createOnewayArrowLayer = ({ palette, idPrefix, roadFilter }) => ({
  id: withPrefix(idPrefix, "roads-oneway"),
  source: "sweden_vector",
  "source-layer": "transportation",
  type: "symbol",
  minzoom: 15,
  filter: ["all", roadFilter, createOnewayArrowFilter()],
  layout: {
    "symbol-placement": "line",
    "symbol-spacing": 90,
    "text-field": "▶",
    "text-font": ["Noto Sans Regular"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 17, 11, 19, 13],
    "text-rotation-alignment": "map",
    "text-pitch-alignment": "viewport",
    "text-keep-upright": false,
    "text-allow-overlap": true,
    "text-ignore-placement": true
  },
  paint: {
    "text-color": createOnewayArrowColorExpression(palette),
    "text-halo-color": createRoadCasingColorExpression(palette),
    "text-halo-width": 0.6,
    "text-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.7, 16, 0.92]
  }
});

const createRoadLabelLayer = ({ palette, idPrefix, variant = "vector" }) => ({
  id: withPrefix(idPrefix, "road-labels"),
  source: "sweden_vector",
  "source-layer": "transportation_name",
  type: "symbol",
  minzoom: 10,
  layout: {
    "symbol-placement": "line",
    "text-field": ["coalesce", ["get", "name:sv"], ["get", "name"], ""],
    "text-font": ["Noto Sans Regular"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 13, 12, 16, 14],
    "text-letter-spacing": 0.02
  },
  paint: {
    "text-color": variant === "hybrid" ? "#ffffff" : palette.roadLabel,
    "text-halo-color": variant === "hybrid" ? "#1a2d42cc" : palette.roadLabelHalo,
    "text-halo-width": variant === "hybrid" ? 1.5 : 1.3,
    "text-halo-blur": variant === "hybrid" ? 0.35 : 0.4
  }
});

/**
 * Build Google Maps–quality road layers: tunnel → ground → bridge,
 * each with casing → fill, plus center dividers and oneway arrows.
 *
 * @param {object} options
 * @param {object} options.palette - Map palette with traffic road tokens
 * @param {'vector'|'hybrid'} [options.variant='vector']
 * @param {string} [options.idPrefix] - Layer id prefix (e.g. "hybrid")
 * @param {boolean} [options.includeLabels=true]
 * @param {readonly string[]} [options.roadClasses] - Subset of classes to render
 */
export const createRoadLayers = ({
  palette,
  variant = "vector",
  idPrefix = "",
  includeLabels = true,
  roadClasses = ROAD_CLASSES
} = {}) => {
  const roadFilter = createDrivableRoadFilter(roadClasses);
  const opacity = resolveOpacity(variant);
  const layers = [
    ...createTunnelLayers({ palette, idPrefix, roadFilter, opacity }),
    ...createGroundLayers({ palette, idPrefix, roadFilter, opacity }),
    ...createBridgeLayers({ palette, idPrefix, roadFilter, opacity })
  ];

  if (roadClasses.some((roadClass) => roadClass === "motorway" || roadClass === "trunk")) {
    layers.push(
      createDividerLayer({ palette, idPrefix, roadFilter, opacity }),
      createBridgeDividerLayer({ palette, idPrefix, roadFilter, opacity })
    );
  }

  layers.push(createOnewayArrowLayer({ palette, idPrefix, roadFilter }));

  if (includeLabels) {
    layers.push(createRoadLabelLayer({ palette, idPrefix, variant }));
  }

  return layers;
};

/** Road layers for hybrid satellite overlay (major roads only). */
export const createHybridRoadLayers = (palette) =>
  createRoadLayers({
    palette,
    variant: "hybrid",
    idPrefix: "hybrid",
    roadClasses: HYBRID_ROAD_CLASSES
  });

/** Layer ids used by day/night palette rebinding. */
export const ROAD_LAYER_IDS = Object.freeze([
  "roads-tunnel-casing",
  "roads-tunnel-fill",
  "roads-casing",
  "roads-fill",
  "roads-bridge-casing",
  "roads-bridge-fill",
  "roads-divider",
  "roads-bridge-divider",
  "roads-oneway",
  "road-labels",
  "hybrid-roads-tunnel-casing",
  "hybrid-roads-tunnel-fill",
  "hybrid-roads-casing",
  "hybrid-roads-fill",
  "hybrid-roads-bridge-casing",
  "hybrid-roads-bridge-fill",
  "hybrid-roads-divider",
  "hybrid-roads-bridge-divider",
  "hybrid-roads-oneway",
  "hybrid-road-labels"
]);
