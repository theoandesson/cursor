import { createOverlayManager } from "../controller/createOverlayManager.js";
import { createSmhiRadarPlugin } from "../layers/createSmhiRadarPlugin.js";
import { createOverlayDefinitions } from "../registry/overlayDefinitions.js";
import { createLayerPanelControl } from "../ui/createLayerPanelControl.js";

export const createOverlaySystem = ({ map, maplibregl }) => {
  const definitions = createOverlayDefinitions();
  const overlayManager = createOverlayManager({ map, definitions });

  overlayManager.registerPlugin(createSmhiRadarPlugin());

  const mount = async () => {
    await overlayManager.mountAll();
    map.addControl(createLayerPanelControl({ overlayManager }), "bottom-right");
  };

  return {
    overlayManager,
    mount,
    dispose: () => overlayManager.dispose()
  };
};
