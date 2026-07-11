import { createBuildingTypeColorExpression } from "../style/expressions/buildingExpressions.js";
import { MAP_PALETTES } from "../style/palette/swedenPalette.js";

const CONTROL_CLASS = "map-daynight-control maplibregl-ctrl";
const BUTTON_CLASS = "map-daynight-control__button";

const LAYER_PAINT_BINDINGS = [
  { layerId: "bg", property: "background-color", resolve: (palette) => palette.background },
  {
    layerId: "landcover",
    property: "fill-color",
    resolve: (palette) => [
      "match",
      ["get", "class"],
      ["wood", "forest"],
      palette.landcoverForest,
      ["grass", "park"],
      palette.landcoverPark,
      palette.landcoverBase
    ]
  },
  { layerId: "landuse-urban", property: "fill-color", resolve: (palette) => palette.landuseUrban },
  { layerId: "water", property: "fill-color", resolve: (palette) => palette.waterFill },
  { layerId: "waterway", property: "line-color", resolve: (palette) => palette.waterwayLine },
  { layerId: "roads-casing", property: "line-color", resolve: (palette) => palette.roadsCasing },
  {
    layerId: "roads",
    property: "line-color",
    resolve: (palette) => [
      "match",
      ["get", "class"],
      ["motorway", "trunk"],
      palette.roadsMotorway,
      ["primary", "secondary"],
      palette.roadsPrimary,
      palette.roadsLocal
    ]
  },
  { layerId: "road-labels", property: "text-color", resolve: (palette) => palette.roadLabel },
  { layerId: "road-labels", property: "text-halo-color", resolve: (palette) => palette.roadLabelHalo },
  {
    layerId: "sweden-buildings",
    property: "fill-extrusion-color",
    resolve: (palette) => createBuildingTypeColorExpression(palette)
  }
];

const applyPaletteToLayers = (map, palette) => {
  for (const binding of LAYER_PAINT_BINDINGS) {
    if (!map.getLayer(binding.layerId)) {
      continue;
    }
    map.setPaintProperty(binding.layerId, binding.property, binding.resolve(palette));
  }
};

const applySkyPalette = (map, palette) => {
  if (typeof map.setSky !== "function") {
    return;
  }
  map.setSky({
    "sky-color": palette.skyColor,
    "sky-horizon-blend": 0.3,
    "horizon-color": palette.skyHorizonColor,
    "horizon-fog-blend": 0.3,
    "fog-color": palette.fogColor,
    "fog-ground-blend": 0.3
  });
};

const setToggleButtonState = ({ button, mode }) => {
  const isNight = mode === "night";
  button.dataset.mode = mode;
  button.setAttribute("aria-pressed", String(isNight));
  button.textContent = isNight ? "Nattläge" : "Dagläge";
  button.title = isNight ? "Växla till dagläge" : "Växla till nattläge";
  button.setAttribute(
    "aria-label",
    isNight ? "Växla till dagläge" : "Växla till nattläge"
  );
};

export const createDayNightController = ({ map, initialMode = "day", onModeChange }) => {
  let mode = initialMode === "night" ? "night" : "day";
  let controlContainer = null;
  let toggleButton = null;
  const listeners = [];

  const applyMode = (nextMode) => {
    mode = nextMode === "night" ? "night" : "day";
    const palette = MAP_PALETTES[mode];
    applyPaletteToLayers(map, palette);
    applySkyPalette(map, palette);
    if (toggleButton) {
      setToggleButtonState({ button: toggleButton, mode });
    }
    onModeChange?.(mode);
  };

  const toggleMode = () => {
    applyMode(mode === "day" ? "night" : "day");
  };

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

  applyMode(mode);

  return {
    control,
    getMode: () => mode,
    setMode: applyMode,
    toggleMode,
    destroy: () => {
      control.onRemove();
    }
  };
};
