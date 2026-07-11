import { createTrafficFlowLayer } from "../../traffic/createTrafficFlowLayer.js";

const PLUGIN_ID = "traffic-flow";

export const createTrafficFlowPlugin = ({ maplibregl } = {}) => {
  let layerHandle = null;
  let manager = null;

  return {
    id: PLUGIN_ID,

    attach({ manager: overlayManager }) {
      manager = overlayManager;
    },

    async mount({ map }) {
      const state = manager?.getOverlayState?.(PLUGIN_ID);
      layerHandle = createTrafficFlowLayer({
        map,
        maplibregl,
        initialVisible: state?.visible ?? false,
        autoFetch: false
      });
    },

    async onEnable() {
      layerHandle?.setVisible(true);
      layerHandle?.refresh?.();
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
