import {
  fetchPressureFrame,
  fetchPressureFrames,
  fetchPressureMetadata,
  preloadPressureFrame
} from "../api/pressureApiClient.js";
import { OVERLAY_SOURCE_IDS, STYLE_LAYER_IDS } from "../constants/styleLayerIds.js";

const PLUGIN_ID = "pressure-systems";
const SOURCE_ID = OVERLAY_SOURCE_IDS.PRESSURE_SYSTEMS;
const HIGH_LAYER_ID = STYLE_LAYER_IDS.PRESSURE_HIGH_FILL;
const LOW_LAYER_ID = STYLE_LAYER_IDS.PRESSURE_LOW_FILL;
const STORM_LAYER_ID = STYLE_LAYER_IDS.PRESSURE_STORM_FILL;
const LABEL_LAYER_ID = STYLE_LAYER_IDS.PRESSURE_LABELS;

const FRAME_POLL_MS = 10 * 60 * 1000;
const FRAME_HOURS = 24;
const SPEED_STEPS_MS = [1400, 900, 550, 320];

const formatFrameTime = (isoString) => {
  try {
    return new Date(isoString).toLocaleString("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm"
    });
  } catch {
    return "--:--";
  }
};

const createInitialState = () => ({
  frames: [],
  frameIndex: 0,
  playing: false,
  speedIndex: 1,
  animationTimer: null,
  pollTimer: null,
  manager: null,
  map: null,
  isMounted: false,
  isEnabled: false
});

const splitFrameFeatures = (geojson) => {
  const features = geojson?.features ?? [];
  return {
    high: {
      type: "FeatureCollection",
      features: features.filter((feature) => feature.properties?.kind === "high")
    },
    low: {
      type: "FeatureCollection",
      features: features.filter((feature) => feature.properties?.kind === "low")
    },
    storm: {
      type: "FeatureCollection",
      features: features.filter(
        (feature) =>
          feature.properties?.kind === "storm" || feature.properties?.kind === "severe_storm"
      )
    },
    labels: {
      type: "FeatureCollection",
      features: features.filter(
        (feature) =>
          feature.properties?.kind === "high_label" || feature.properties?.kind === "low_label"
      )
    }
  };
};

export const createPressureSystemsPlugin = () => {
  const state = createInitialState();
  let frameIndexChain = Promise.resolve();

  const clearAnimationTimer = () => {
    if (state.animationTimer) {
      clearTimeout(state.animationTimer);
      state.animationTimer = null;
    }
  };

  const clearPollTimer = () => {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  };

  const clearTimers = () => {
    clearAnimationTimer();
    clearPollTimer();
  };

  const updateSourceData = (collections) => {
    if (!state.map) {
      return;
    }

    const highSource = state.map.getSource(`${SOURCE_ID}-high`);
    const lowSource = state.map.getSource(`${SOURCE_ID}-low`);
    const stormSource = state.map.getSource(`${SOURCE_ID}-storm`);
    const labelSource = state.map.getSource(`${SOURCE_ID}-labels`);

    highSource?.setData?.(collections.high);
    lowSource?.setData?.(collections.low);
    stormSource?.setData?.(collections.storm);
    labelSource?.setData?.(collections.labels);
  };

  const setFrameIndexInternal = async (index, { announce = true } = {}) => {
    if (!state.frames.length) {
      return;
    }

    const normalizedIndex = ((index % state.frames.length) + state.frames.length) % state.frames.length;
    state.frameIndex = normalizedIndex;
    const frame = state.frames[normalizedIndex];

    try {
      const geojson = await fetchPressureFrame({ frameKey: frame.key });
      updateSourceData(splitFrameFeatures(geojson));

      if (announce) {
        state.manager?.setOverlayStatus?.(PLUGIN_ID, {
          statusMessage: formatFrameTime(frame.valid)
        });
      }
    } catch (error) {
      state.manager?.setOverlayStatus?.(PLUGIN_ID, {
        status: "error",
        statusMessage:
          error instanceof Error ? error.message : "Kunde inte uppdatera tryckvisualisering."
      });
    }
  };

  const setFrameIndex = (index, options = {}) => {
    frameIndexChain = frameIndexChain
      .catch(() => {})
      .then(() => setFrameIndexInternal(index, options));
    return frameIndexChain;
  };

  const scheduleNextFrame = () => {
    clearAnimationTimer();

    if (!state.playing || !state.isEnabled || !state.frames.length) {
      return;
    }

    const delay = SPEED_STEPS_MS[state.speedIndex] ?? SPEED_STEPS_MS[1];
    state.animationTimer = setTimeout(async () => {
      await setFrameIndex(state.frameIndex + 1);
      scheduleNextFrame();
    }, delay);
  };

  const refreshFrames = async ({ force = false } = {}) => {
    const payload = await fetchPressureFrames({
      hours: FRAME_HOURS,
      refresh: force
    });

    const previousKey = state.frames[state.frameIndex]?.key ?? null;
    state.frames = payload.frames ?? [];

    if (!state.frames.length) {
      throw new Error("Inga prognosframes tillgängliga just nu.");
    }

    const foundIndex = state.frames.findIndex((frame) => frame.key === previousKey);
    state.frameIndex = foundIndex >= 0 ? foundIndex : 0;
    await setFrameIndex(state.frameIndex, { announce: false });
    return payload;
  };

  const preloadNearbyFrames = async () => {
    const neighbors = [
      state.frames[state.frameIndex - 1],
      state.frames[state.frameIndex + 1]
    ].filter(Boolean);

    await Promise.allSettled(neighbors.map((frame) => preloadPressureFrame(frame.key)));
  };

  const startPolling = () => {
    if (state.pollTimer) {
      return;
    }

    state.pollTimer = setInterval(async () => {
      if (!state.isEnabled) {
        return;
      }

      try {
        await refreshFrames();
        if (state.playing) {
          scheduleNextFrame();
        }
      } catch (error) {
        console.warn("[pressure-systems] Frame poll refresh failed:", error);
      }
    }, FRAME_POLL_MS);
  };

  const emptyCollection = () => ({ type: "FeatureCollection", features: [] });

  const plugin = {
    id: PLUGIN_ID,

    attach({ manager }) {
      state.manager = manager;
    },

    async mount({ map }) {
      state.map = map;
      await fetchPressureMetadata();

      const addGeoJsonSource = (suffix) => {
        map.addSource(`${SOURCE_ID}-${suffix}`, {
          type: "geojson",
          data: emptyCollection()
        });
      };

      addGeoJsonSource("high");
      addGeoJsonSource("low");
      addGeoJsonSource("storm");
      addGeoJsonSource("labels");

      map.addLayer(
        {
          id: HIGH_LAYER_ID,
          type: "fill",
          source: `${SOURCE_ID}-high`,
          layout: { visibility: "none" },
          paint: {
            "fill-color": ["coalesce", ["get", "color"], "#3b82c4"],
            "fill-opacity": 0.34
          }
        },
        "sweden-buildings"
      );

      map.addLayer(
        {
          id: LOW_LAYER_ID,
          type: "fill",
          source: `${SOURCE_ID}-low`,
          layout: { visibility: "none" },
          paint: {
            "fill-color": ["coalesce", ["get", "color"], "#c44b3b"],
            "fill-opacity": 0.34
          }
        },
        HIGH_LAYER_ID
      );

      map.addLayer(
        {
          id: STORM_LAYER_ID,
          type: "fill",
          source: `${SOURCE_ID}-storm`,
          layout: { visibility: "none" },
          paint: {
            "fill-color": [
              "match",
              ["get", "kind"],
              "severe_storm",
              "#f39c12",
              "#9b59b6"
            ],
            "fill-opacity": 0.42
          }
        },
        LOW_LAYER_ID
      );

      map.addLayer(
        {
          id: LABEL_LAYER_ID,
          type: "symbol",
          source: `${SOURCE_ID}-labels`,
          layout: {
            visibility: "none",
            "text-field": [
              "format",
              ["get", "label"],
              { "font-scale": 1.2 },
              "\n",
              {},
              ["to-string", ["get", "pressure"]],
              { "font-scale": 0.85 }
            ],
            "text-font": ["Roboto Bold", "Arial Unicode MS Bold"],
            "text-size": 14,
            "text-anchor": "center",
            "text-allow-overlap": true
          },
          paint: {
            "text-color": [
              "match",
              ["get", "kind"],
              "high_label",
              "#1d4f82",
              "#8b2d22"
            ],
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.4
          }
        },
        STORM_LAYER_ID
      );

      await refreshFrames();
      await preloadNearbyFrames();
      state.isMounted = true;
    },

    async onEnable() {
      state.isEnabled = true;
      state.manager?.setOverlayStatus?.(PLUGIN_ID, {
        status: "ready",
        statusMessage: formatFrameTime(state.frames[state.frameIndex]?.valid ?? "")
      });
      state.manager?.notify?.();
      startPolling();

      if (state.playing) {
        scheduleNextFrame();
      }
    },

    async onDisable() {
      state.isEnabled = false;
      state.playing = false;
      clearTimers();
      state.manager?.setOverlayStatus?.(PLUGIN_ID, {
        statusMessage: "Av"
      });
      state.manager?.notify?.();
    },

    async unmount({ map }) {
      state.isEnabled = false;
      state.playing = false;
      clearTimers();

      [LABEL_LAYER_ID, STORM_LAYER_ID, LOW_LAYER_ID, HIGH_LAYER_ID].forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      });

      ["high", "low", "storm", "labels"].forEach((suffix) => {
        const sourceId = `${SOURCE_ID}-${suffix}`;
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      });

      state.isMounted = false;
      state.map = null;
    },

    getAnimationState: () => ({
      frames: state.frames,
      frameIndex: state.frameIndex,
      playing: state.playing,
      speedIndex: state.speedIndex,
      frameTime: formatFrameTime(state.frames[state.frameIndex]?.valid ?? ""),
      frameCount: state.frames.length
    }),

    play: async () => {
      if (!state.frames.length) {
        return;
      }

      state.playing = true;
      scheduleNextFrame();
      state.manager?.notify?.();
    },

    pause: () => {
      state.playing = false;
      clearAnimationTimer();
      state.manager?.notify?.();
    },

    stepPrevious: async () => {
      state.playing = false;
      clearAnimationTimer();
      await setFrameIndex(state.frameIndex - 1);
      await preloadNearbyFrames();
      state.manager?.notify?.();
    },

    stepNext: async () => {
      state.playing = false;
      clearAnimationTimer();
      await setFrameIndex(state.frameIndex + 1);
      await preloadNearbyFrames();
      state.manager?.notify?.();
    },

    scrubTo: async (index) => {
      state.playing = false;
      clearAnimationTimer();
      await setFrameIndex(index);
      await preloadNearbyFrames();
      state.manager?.notify?.();
    },

    setSpeedIndex: (speedIndex) => {
      state.speedIndex = Math.max(0, Math.min(SPEED_STEPS_MS.length - 1, speedIndex));
      if (state.playing) {
        scheduleNextFrame();
      }
      state.manager?.notify?.();
    },

    refresh: async () => refreshFrames({ force: true })
  };

  return plugin;
};
