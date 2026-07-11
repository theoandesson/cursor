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
  let mountPromise = null;
  let disposed = false;
  let unsubscribeStatus = null;

  overlayManager.registerPlugin(createSmhiRadarPlugin());
  overlayManager.registerPlugin(createTrafficFlowPlugin({ maplibregl }));
  overlayManager.registerPlugin(createTransitPlugin({ maplibregl }));

  const mount = async () => {
    mountPromise = (async () => {
      await overlayManager.mountAll();
      if (disposed) {
        return;
      }
      panelControl = createLayerPanelControl({ overlayManager });
      map.addControl(panelControl, "bottom-right");
    })();

    return mountPromise;
  };

  const dispose = async () => {
    disposed = true;
    unsubscribeStatus?.();
    unsubscribeStatus = null;

    if (panelControl) {
      map.removeControl(panelControl);
      panelControl = null;
    }

    if (mountPromise) {
      await mountPromise.catch(() => {});
    }

    await overlayManager.dispose();
    mountPromise = null;
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
