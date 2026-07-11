import { createTrafficPaletteBindings } from "../../traffic/createTrafficPaletteBindings.js";
import { TRAFFIC_PALETTES } from "../../traffic/trafficPalette.js";
import { createBuildingVisualColorExpression } from "../style/expressions/buildingExpressions.js";
import { MAP_PALETTES } from "../style/palette/swedenPalette.js";

const CONTROL_CLASS = "map-daynight-control maplibregl-ctrl";
const BUTTON_CLASS = "map-daynight-control__button";

const SATELLITE_RASTER_LAYER_IDS = ["satellite-imagery", "satellite-base"];

const createLandcoverColorExpression = (palette) => [
  "match",
  ["get", "class"],
  ["wood", "forest"],
  palette.landcoverForest,
  ["grass", "park"],
  palette.landcoverPark,
  palette.landcoverBase
];

const createRoadColorExpression = (palette) => [
  "match",
  ["get", "class"],
  ["motorway", "trunk"],
  palette.roadsMotorway,
  ["primary", "secondary"],
  palette.roadsPrimary,
  palette.roadsLocal
];

const LAYER_PAINT_BINDINGS = [
  ...createTrafficPaletteBindings(),
  { layerId: "bg", property: "background-color", resolve: (palette) => palette.background },
  {
    layerId: "sweden-area",
    property: "fill-color",
    resolve: (palette) => palette.swedenAreaFill
  },
  {
    layerId: "landcover",
    property: "fill-color",
    resolve: (palette) => createLandcoverColorExpression(palette)
  },
  { layerId: "landuse-urban", property: "fill-color", resolve: (palette) => palette.landuseUrban },
  { layerId: "water", property: "fill-color", resolve: (palette) => palette.waterFill },
  { layerId: "waterway", property: "line-color", resolve: (palette) => palette.waterwayLine },
  { layerId: "road-labels", property: "text-color", resolve: (palette) => palette.roadLabel },
  {
    layerId: "road-labels",
    property: "text-halo-color",
    resolve: (palette) => palette.roadLabelHalo
  },
  {
    layerId: "hybrid-roads-casing",
    property: "line-color",
    resolve: (palette) => palette.roadsCasing
  },
  {
    layerId: "hybrid-roads",
    property: "line-color",
    resolve: (palette) => createRoadColorExpression(palette)
  },
  {
    layerId: "hybrid-road-labels",
    property: "text-color",
    resolve: (palette) => palette.roadLabel
  },
  {
    layerId: "hybrid-road-labels",
    property: "text-halo-color",
    resolve: (palette) => palette.roadLabelHalo
  },
  {
    layerId: "hybrid-place-labels",
    property: "text-color",
    resolve: (palette) => palette.placeLabel
  },
  {
    layerId: "hybrid-place-labels",
    property: "text-halo-color",
    resolve: (palette) => palette.placeLabelHalo
  },
  { layerId: "sweden-border", property: "line-color", resolve: (palette) => palette.swedenBorder },
  {
    layerId: "sweden-buildings",
    property: "fill-extrusion-color",
    resolve: (palette) => createBuildingVisualColorExpression(palette)
  },
  {
    layerId: "terrain-hillshade",
    property: "hillshade-shadow-color",
    resolve: (palette) => palette.hillshadeShadowColor
  },
  {
    layerId: "terrain-hillshade",
    property: "hillshade-highlight-color",
    resolve: (palette) => palette.hillshadeHighlightColor
  },
  {
    layerId: "terrain-hillshade",
    property: "hillshade-accent-color",
    resolve: (palette) => palette.hillshadeAccentColor
  }
];

const applySkyPalette = (map, palette) => {
  if (typeof map.setSky !== "function" || !map.isStyleLoaded()) {
    return;
  }

  const style = map.getStyle();
  if (!style?.sky) {
    return;
  }

  map.setSky({
    "sky-color": palette.skyColor,
    "sky-horizon-blend": 0.42,
    "horizon-color": palette.skyHorizonColor,
    "horizon-fog-blend": 0.42,
    "fog-color": palette.fogColor,
    "fog-ground-blend": 0.48
  });
};

const applyRasterPalette = (map, palette) => {
  for (const layerId of SATELLITE_RASTER_LAYER_IDS) {
    if (!map.getLayer(layerId)) {
      continue;
    }
    map.setPaintProperty(layerId, "raster-brightness-min", palette.satelliteRasterBrightnessMin);
    map.setPaintProperty(layerId, "raster-brightness-max", palette.satelliteRasterBrightnessMax);
    map.setPaintProperty(layerId, "raster-saturation", palette.satelliteRasterSaturation);
    map.setPaintProperty(layerId, "raster-contrast", palette.satelliteRasterContrast);
  }
};

export const applyMapPalette = (map, mode) => {
  const paletteKey = mode === "night" ? "night" : "day";
  const palette = MAP_PALETTES[paletteKey];
  const trafficPalette = TRAFFIC_PALETTES[paletteKey];
  map.getContainer()?.setAttribute("data-daynight", mode);

  for (const binding of LAYER_PAINT_BINDINGS) {
    if (!map.getLayer(binding.layerId)) {
      continue;
    }
    const resolvePalette = binding.useTrafficPalette ? trafficPalette : palette;
    map.setPaintProperty(binding.layerId, binding.property, binding.resolve(resolvePalette));
  }

  applyRasterPalette(map, palette);
  applySkyPalette(map, palette);
};

const setToggleButtonState = ({ button, mode }) => {
  const isNight = mode === "night";
  button.dataset.mode = mode;
  button.setAttribute("aria-pressed", String(isNight));
  button.textContent = isNight ? "Nattläge" : "Dagläge";
  button.title = isNight ? "Växla till dagläge" : "Växla till nattläge";
  button.setAttribute(
    "aria-label",
    isNight
      ? "Nattläge är aktivt. Växla till dagläge."
      : "Dagläge är aktivt. Växla till nattläge."
  );
};

export const createDayNightController = ({ map, initialMode = "day", onModeChange }) => {
  let mode = initialMode === "night" ? "night" : "day";
  let controlContainer = null;
  let toggleButton = null;
  const listeners = [];

  const applyMode = (nextMode, { notify = true } = {}) => {
    mode = nextMode === "night" ? "night" : "day";
    applyMapPalette(map, mode);
    if (toggleButton) {
      setToggleButtonState({ button: toggleButton, mode });
    }
    if (notify) {
      onModeChange?.(mode);
    }
  };

  const reapplyMode = () => {
    applyMode(mode, { notify: false });
  };

  const toggleMode = () => {
    applyMode(mode === "day" ? "night" : "day");
  };

  const onStyleLoad = () => {
    reapplyMode();
  };

  map.on("style.load", onStyleLoad);
  listeners.push(() => map.off("style.load", onStyleLoad));

  const control = {
    onAdd: () => {
      controlContainer = document.createElement("section");
      controlContainer.className = CONTROL_CLASS;
      controlContainer.setAttribute("role", "group");
      controlContainer.setAttribute("aria-label", "Dag- och nattläge");

      toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = BUTTON_CLASS;
      setToggleButtonState({ button: toggleButton, mode });

      const onClick = (event) => {
        event.preventDefault();
        toggleMode();
      };
      toggleButton.addEventListener("click", onClick);
      listeners.push(() => toggleButton.removeEventListener("click", onClick));

      controlContainer.appendChild(toggleButton);
      return controlContainer;
    },
    onRemove: () => {
      while (listeners.length > 0) {
        listeners.pop()?.();
      }
      controlContainer?.remove();
      controlContainer = null;
      toggleButton = null;
    }
  };

  if (map.isStyleLoaded()) {
    reapplyMode();
  }

  return {
    control,
    getMode: () => mode,
    setMode: (nextMode) => applyMode(nextMode),
    reapplyMode,
    toggleMode,
    destroy: () => {
      control.onRemove();
    }
  };
};
