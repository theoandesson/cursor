import { createTransitLayer } from "../../traffic/createTransitLayer.js";

const PLUGIN_ID = "transit";

export const createTransitPlugin = ({ maplibregl } = {}) => {
  let layerHandle = null;
  let manager = null;

  return {
    id: PLUGIN_ID,

    attach({ manager: overlayManager }) {
      manager = overlayManager;
    },

    async mount({ map }) {
      const state = manager?.getOverlayState?.(PLUGIN_ID);
      layerHandle = createTransitLayer({
        map,
        maplibregl,
        initialVisible: state?.visible ?? false
      });
    },

    async onEnable() {
      layerHandle?.setVisible(true);
    },

    async onDisable() {
      layerHandle?.setVisible(false);
    },

    async unmount() {
      layerHandle?.destroy?.();
      layerHandle = null;
    }
  };
};
