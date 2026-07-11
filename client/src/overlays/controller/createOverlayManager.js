const setLayerVisibility = ({ map, layerId, visible }) => {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
};

const applyOpacityBinding = ({ map, binding, opacity }) => {
  if (!map.getLayer(binding.layerId)) {
    return;
  }

  map.setPaintProperty(binding.layerId, binding.property, opacity);
};

const applyLayerOpacity = ({ map, definition, opacity }) => {
  if (definition.opacityBindings?.length) {
    definition.opacityBindings.forEach((binding) => {
      applyOpacityBinding({ map, binding, opacity });
    });
    return;
  }

  if (!definition.opacityProperty || !definition.layerIds?.length) {
    return;
  }

  definition.layerIds.forEach((layerId) => {
    if (!map.getLayer(layerId)) {
      return;
    }

    map.setPaintProperty(layerId, definition.opacityProperty, opacity);
  });
};

const createOverlayState = (definition) => ({
  id: definition.id,
  label: definition.label,
  section: definition.section,
  description: definition.description,
  controlType: definition.controlType,
  visible: definition.defaultVisible,
  opacity: definition.defaultOpacity,
  minOpacity: definition.minOpacity ?? 0,
  maxOpacity: definition.maxOpacity ?? 1,
  status: "idle",
  statusMessage: "",
  ready: false
});

export const createOverlayManager = ({ map, definitions }) => {
  const plugins = new Map();
  const listeners = new Set();
  const stateById = new Map(
    definitions.map((definition) => [definition.id, createOverlayState(definition)])
  );

  const notify = () => {
    const snapshot = getState();
    listeners.forEach((listener) => listener(snapshot));
  };

  const getDefinition = (overlayId) => definitions.find((definition) => definition.id === overlayId);

  const applyVisibility = (overlayId) => {
    const definition = getDefinition(overlayId);
    const state = stateById.get(overlayId);
    if (!definition || !state) {
      return;
    }

    definition.layerIds.forEach((layerId) => {
      setLayerVisibility({ map, layerId, visible: state.visible });
    });
  };

  const applyOpacity = (overlayId) => {
    const definition = getDefinition(overlayId);
    const state = stateById.get(overlayId);
    if (!definition || !state) {
      return;
    }

    applyLayerOpacity({ map, definition, opacity: state.opacity });
  };

  const setOverlayStatus = (overlayId, { status, statusMessage, ready }) => {
    const state = stateById.get(overlayId);
    if (!state) {
      return;
    }

    if (status != null) {
      state.status = status;
    }
    if (statusMessage != null) {
      state.statusMessage = statusMessage;
    }
    if (ready != null) {
      state.ready = ready;
    }

    notify();
  };

  const registerPlugin = (plugin) => {
    plugins.set(plugin.id, plugin);
    plugin.attach?.({
      map,
      manager: {
        setOverlayStatus,
        notify,
        getOverlayState: (overlayId) => stateById.get(overlayId)
      }
    });
  };

  const mountPlugin = async (overlayId) => {
    const plugin = plugins.get(overlayId);
    if (!plugin?.mount) {
      return;
    }

    setOverlayStatus(overlayId, {
      status: "loading",
      statusMessage: "Laddar lager…",
      ready: false
    });

    try {
      await plugin.mount({ map });
      setOverlayStatus(overlayId, {
        status: "ready",
        statusMessage: "",
        ready: true
      });
    } catch (error) {
      setOverlayStatus(overlayId, {
        status: "error",
        statusMessage:
          error instanceof Error ? error.message : "Kunde inte ladda lagret.",
        ready: false
      });
    }

    applyVisibility(overlayId);
    applyOpacity(overlayId);
  };

  const mountAll = async () => {
    for (const definition of definitions) {
      if (plugins.has(definition.id)) {
        await mountPlugin(definition.id);
      } else {
        const state = stateById.get(definition.id);
        if (state) {
          state.ready = true;
        }
        applyVisibility(definition.id);
        applyOpacity(definition.id);
      }
    }

    notify();
  };

  const setVisible = async (overlayId, visible) => {
    const state = stateById.get(overlayId);
    if (!state) {
      return;
    }

    state.visible = visible;
    applyVisibility(overlayId);

    const plugin = plugins.get(overlayId);
    if (visible) {
      await plugin?.onEnable?.({ map });
    } else {
      await plugin?.onDisable?.({ map });
    }

    notify();
  };

  const toggleVisible = async (overlayId) => {
    const state = stateById.get(overlayId);
    if (!state) {
      return;
    }

    await setVisible(overlayId, !state.visible);
  };

  const setOpacity = (overlayId, opacity) => {
    const state = stateById.get(overlayId);
    const definition = getDefinition(overlayId);
    if (!state || !definition) {
      return;
    }

    const min = definition.minOpacity ?? 0;
    const max = definition.maxOpacity ?? 1;
    state.opacity = Math.min(max, Math.max(min, opacity));
    applyOpacity(overlayId);
    notify();
  };

  const getPlugin = (overlayId) => plugins.get(overlayId) ?? null;

  const getState = () => ({
    overlays: definitions.map((definition) => {
      const state = stateById.get(definition.id);
      return {
        ...state,
        plugin: getPlugin(definition.id)
      };
    })
  });

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
  };

  const dispose = async () => {
    for (const plugin of plugins.values()) {
      await plugin.onDisable?.({ map });
      await plugin.unmount?.({ map });
    }

    plugins.clear();
    listeners.clear();
  };

  return {
    mountAll,
    registerPlugin,
    setVisible,
    toggleVisible,
    setOpacity,
    getPlugin,
    getState,
    subscribe,
    dispose
  };
};
