import { createOverlayManager } from "../controller/createOverlayManager.js";
import { createSmhiRadarPlugin } from "../layers/createSmhiRadarPlugin.js";
import { createOverlayDefinitions } from "../registry/overlayDefinitions.js";
import { createLayerPanelControl } from "../ui/createLayerPanelControl.js";

export const createOverlaySystem = ({ map, maplibregl }) => {
  const definitions = createOverlayDefinitions();
  const overlayManager = createOverlayManager({ map, definitions });
  let panelControl = null;

  overlayManager.registerPlugin(createSmhiRadarPlugin());

  const mount = async () => {
    await overlayManager.mountAll();
    panelControl = createLayerPanelControl({ overlayManager });
    map.addControl(panelControl, "bottom-right");
  };

  const dispose = () => {
    if (panelControl) {
      map.removeControl(panelControl);
      panelControl = null;
    }
    overlayManager.dispose();
  };

  return {
    overlayManager,
    mount,
    dispose
  };
};
