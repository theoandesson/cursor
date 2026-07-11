import { createOverlayManager } from "../controller/createOverlayManager.js";
import { createSmhiRadarPlugin } from "../layers/createSmhiRadarPlugin.js";
import { createTrafficFlowPlugin } from "../layers/createTrafficFlowPlugin.js";
import { createTransitPlugin } from "../layers/createTransitPlugin.js";
import { createOverlayDefinitions } from "../registry/overlayDefinitions.js";
import { createLayerPanelControl } from "../ui/createLayerPanelControl.js";

export const createOverlaySystem = ({ map, maplibregl }) => {
  const definitions = createOverlayDefinitions();
  const overlayManager = createOverlayManager({ map, definitions });
  let panelControl = null;
  let unsubscribeStatus = null;

  overlayManager.registerPlugin(createSmhiRadarPlugin());
  overlayManager.registerPlugin(createTrafficFlowPlugin({ maplibregl }));
  overlayManager.registerPlugin(createTransitPlugin({ maplibregl }));

  const mount = async () => {
    await overlayManager.mountAll();
    panelControl = createLayerPanelControl({ overlayManager });
    map.addControl(panelControl, "bottom-right");
  };

  const dispose = () => {
    unsubscribeStatus?.();
    unsubscribeStatus = null;

    if (panelControl) {
      map.removeControl(panelControl);
      panelControl = null;
    }
    overlayManager.dispose();
  };

  const onStatusChange = (listener) => {
    unsubscribeStatus?.();
    unsubscribeStatus = overlayManager.subscribe(listener);
    return unsubscribeStatus;
  };

  return {
    overlayManager,
    mount,
    dispose,
    onStatusChange
  };
};
