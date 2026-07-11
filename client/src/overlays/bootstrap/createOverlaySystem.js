import { createOverlayManager } from "../controller/createOverlayManager.js";
import { createSmhiRadarPlugin } from "../layers/createSmhiRadarPlugin.js";
import { createOverlayDefinitions } from "../registry/overlayDefinitions.js";
import { createLayerPanelControl } from "../ui/createLayerPanelControl.js";

export const createOverlaySystem = ({ map }) => {
  const definitions = createOverlayDefinitions();
  const overlayManager = createOverlayManager({ map, definitions });
  let panelControl = null;
  let mountPromise = null;
  let disposed = false;

  overlayManager.registerPlugin(createSmhiRadarPlugin());

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

  return {
    overlayManager,
    mount,
    dispose
  };
};
