const DEFAULT_TIER_ORDER = Object.freeze(["base", "detail", "labels", "buildings"]);

const normalizeTierEntries = (layersByZoom) => {
  if (Array.isArray(layersByZoom)) {
    return layersByZoom;
  }

  if (!layersByZoom || typeof layersByZoom !== "object") {
    return [];
  }

  return Object.entries(layersByZoom).map(([id, tier]) => ({
    id,
    ...tier
  }));
};

const normalizeLayerTiers = (layersByZoom) =>
  normalizeTierEntries(layersByZoom)
    .map((tier, index) => {
      const id = typeof tier.id === "string" && tier.id.trim().length > 0 ? tier.id : `tier-${index}`;
      const minZoom = Number.isFinite(tier.minZoom) ? tier.minZoom : 0;
      const layers = Array.isArray(tier.layers) ? tier.layers : [];
      return { id, minZoom, layers };
    })
    .filter((tier) => tier.layers.length > 0)
    .sort((a, b) => {
      if (a.minZoom !== b.minZoom) {
        return a.minZoom - b.minZoom;
      }

      const aOrder = DEFAULT_TIER_ORDER.indexOf(a.id);
      const bOrder = DEFAULT_TIER_ORDER.indexOf(b.id);
      const normalizedA = aOrder >= 0 ? aOrder : Number.MAX_SAFE_INTEGER;
      const normalizedB = bOrder >= 0 ? bOrder : Number.MAX_SAFE_INTEGER;
      return normalizedA - normalizedB;
    });

const setLayerVisibility = (map, layerId, visible) => {
  if (!map.getLayer(layerId)) {
    return false;
  }
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  return true;
};

export const createLazyLayerController = (map, layersByZoom) => {
  const tiers = normalizeLayerTiers(layersByZoom);
  const fullLayerOrder = tiers.flatMap((tier) => tier.layers.map((layer) => layer.id));
  const tierState = new Map(tiers.map((tier) => [tier.id, false]));
  const listeners = new Set();

  const resolveBeforeLayerId = (layerId) => {
    const layerIndex = fullLayerOrder.indexOf(layerId);
    if (layerIndex < 0) {
      return undefined;
    }

    for (let index = layerIndex + 1; index < fullLayerOrder.length; index += 1) {
      const candidateId = fullLayerOrder[index];
      if (map.getLayer(candidateId)) {
        return candidateId;
      }
    }

    return undefined;
  };

  const ensureLayerAdded = (layer) => {
    if (map.getLayer(layer.id)) {
      return false;
    }

    const beforeId = resolveBeforeLayerId(layer.id);
    map.addLayer(layer, beforeId);
    return true;
  };

  const activateTier = (tier) => {
    let changed = false;
    for (const layer of tier.layers) {
      const added = ensureLayerAdded(layer);
      const unhidden = setLayerVisibility(map, layer.id, true);
      changed = changed || added || unhidden;
    }
    return changed;
  };

  const deactivateTier = (tier) => {
    let changed = false;
    for (const layer of tier.layers) {
      const hidden = setLayerVisibility(map, layer.id, false);
      changed = changed || hidden;
    }
    return changed;
  };

  const notify = (zoom) => {
    const activeTierIds = tiers
      .filter((tier) => tierState.get(tier.id))
      .map((tier) => tier.id);
    const snapshot = { zoom, activeTierIds };
    listeners.forEach((listener) => listener(snapshot));
  };

  const refresh = () => {
    const zoom = map.getZoom();
    let changed = false;

    for (const tier of tiers) {
      const shouldBeActive = zoom >= tier.minZoom;
      const currentlyActive = tierState.get(tier.id) ?? false;
      if (shouldBeActive === currentlyActive) {
        continue;
      }

      tierState.set(tier.id, shouldBeActive);
      changed = shouldBeActive ? activateTier(tier) || changed : deactivateTier(tier) || changed;
    }

    if (changed) {
      notify(zoom);
    }
  };

  const onZoomEnd = () => {
    refresh();
  };

  map.on("zoomend", onZoomEnd);
  refresh();

  const destroy = () => {
    map.off("zoomend", onZoomEnd);
    listeners.clear();
  };

  return {
    destroy,
    dispose: destroy,
    refresh,
    subscribe: (listener) => {
      if (typeof listener !== "function") {
        return () => {};
      }
      listeners.add(listener);
      const activeTierIds = tiers
        .filter((tier) => tierState.get(tier.id))
        .map((tier) => tier.id);
      listener({ zoom: map.getZoom(), activeTierIds });
      return () => listeners.delete(listener);
    }
  };
};
