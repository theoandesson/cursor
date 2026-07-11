import {
  buildRadarImageUrl,
  fetchRadarFrames,
  fetchRadarMetadata,
  preloadRadarImage
} from "../api/radarApiClient.js";
import { OVERLAY_SOURCE_IDS, STYLE_LAYER_IDS } from "../constants/styleLayerIds.js";

const PLUGIN_ID = "smhi-radar";
const SOURCE_ID = OVERLAY_SOURCE_IDS.SMHI_RADAR;
const LAYER_ID = STYLE_LAYER_IDS.SMHI_RADAR;

const FRAME_POLL_MS = 60 * 1000;
const FRAME_HOURS = 1;
const SPEED_STEPS_MS = [1200, 800, 500, 300];

const isValidRadarCoordinates = (coordinates) =>
  Array.isArray(coordinates) &&
  coordinates.length === 4 &&
  coordinates.every(
    (corner) =>
      Array.isArray(corner) &&
      corner.length === 2 &&
      Number.isFinite(corner[0]) &&
      Number.isFinite(corner[1])
  );

const formatFrameTime = (isoString) => {
  try {
    return new Date(isoString).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm"
    });
  } catch {
    return "--:--";
  }
};

const createInitialRadarState = () => ({
  frames: [],
  frameIndex: 0,
  playing: false,
  speedIndex: 1,
  coordinates: null,
  animationTimer: null,
  pollTimer: null,
  manager: null,
  map: null,
  isMounted: false,
  isEnabled: false
});

export const createSmhiRadarPlugin = () => {
  const state = createInitialRadarState();
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

  const updateSourceImage = async (frame) => {
    if (!state.map || !frame) {
      return;
    }

    const source = state.map.getSource(SOURCE_ID);
    if (!source || typeof source.updateImage !== "function") {
      return;
    }

    const imageUrl = `${buildRadarImageUrl(frame.key)}?t=${Date.now()}`;
    await preloadRadarImage(imageUrl);
    source.updateImage({
      url: imageUrl,
      coordinates: state.coordinates
    });
  };

  const setFrameIndexInternal = async (index, { announce = true } = {}) => {
    if (!state.frames.length) {
      return;
    }

    const normalizedIndex = ((index % state.frames.length) + state.frames.length) % state.frames.length;
    state.frameIndex = normalizedIndex;

    try {
      await updateSourceImage(state.frames[normalizedIndex]);
      if (announce) {
        state.manager?.setOverlayStatus?.(PLUGIN_ID, {
          statusMessage: formatFrameTime(state.frames[normalizedIndex].valid)
        });
      }
    } catch (error) {
      state.manager?.setOverlayStatus?.(PLUGIN_ID, {
        status: "error",
        statusMessage:
          error instanceof Error ? error.message : "Kunde inte uppdatera radarbild."
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
    const payload = await fetchRadarFrames({
      hours: FRAME_HOURS,
      refresh: force
    });

    const previousKey = state.frames[state.frameIndex]?.key ?? null;
    state.frames = payload.frames ?? [];

    if (!state.frames.length) {
      throw new Error("Inga radarframes tillgängliga just nu.");
    }

    const foundIndex = state.frames.findIndex((frame) => frame.key === previousKey);
    state.frameIndex = foundIndex >= 0 ? foundIndex : state.frames.length - 1;
    await setFrameIndex(state.frameIndex, { announce: false });
    return payload;
  };

  const preloadNearbyFrames = async () => {
    const neighbors = [
      state.frames[state.frameIndex - 1],
      state.frames[state.frameIndex + 1]
    ].filter(Boolean);

    await Promise.allSettled(neighbors.map((frame) => preloadRadarImage(buildRadarImageUrl(frame.key))));
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
        console.warn("[smhi-radar] Frame poll refresh failed:", error);
      }
    }, FRAME_POLL_MS);
  };

  const plugin = {
    id: PLUGIN_ID,

    attach({ manager }) {
      state.manager = manager;
    },

    async mount({ map }) {
      state.map = map;

      const metadata = await fetchRadarMetadata();
      if (!isValidRadarCoordinates(metadata.coordinates)) {
        throw new Error("Ogiltiga radarkoordinater från SMHI.");
      }
      state.coordinates = metadata.coordinates;

      map.addSource(SOURCE_ID, {
        type: "image",
        url: buildRadarImageUrl("latest"),
        coordinates: state.coordinates
      });

      map.addLayer(
        {
          id: LAYER_ID,
          type: "raster",
          source: SOURCE_ID,
          layout: {
            visibility: "none"
          },
          paint: {
            "raster-opacity": 0.78,
            "raster-fade-duration": 280,
            "raster-resampling": "linear"
          }
        },
        "sweden-buildings"
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

      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }

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
