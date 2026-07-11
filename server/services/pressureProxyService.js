import { getPressureMetadata } from "../data/pressureMetadata.js";
import { getSwedenGridForecast } from "./openMeteoGridService.js";
import {
  buildPressureFrameGeoJson,
  fromFrameKey,
  toFrameKey
} from "./pressureContourService.js";

const FRAME_LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const FRAME_GEOJSON_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_FRAME_CACHE_ENTRIES = 96;

const frameListCache = new Map();
const frameGeoJsonCache = new Map();
const frameGeoJsonOrder = [];

const getFrameListCacheKey = (hours) => String(hours);

const getFrameGeoJsonCacheKey = (frameKey) => frameKey;

const touchFrameGeoJsonKey = (cacheKey) => {
  const index = frameGeoJsonOrder.indexOf(cacheKey);
  if (index >= 0) {
    frameGeoJsonOrder.splice(index, 1);
  }
  frameGeoJsonOrder.push(cacheKey);
};

const evictFrameGeoJsonIfNeeded = () => {
  while (frameGeoJsonOrder.length > MAX_FRAME_CACHE_ENTRIES) {
    const oldestKey = frameGeoJsonOrder.shift();
    if (oldestKey) {
      frameGeoJsonCache.delete(oldestKey);
    }
  }
};

const findTimeIndex = (gridForecast, frameKey) => {
  const isoTime = fromFrameKey(frameKey);
  return gridForecast.times.findIndex((time) => time === isoTime || toFrameKey(time) === frameKey);
};

export const getPressureMetadataPayload = () => getPressureMetadata();

export const listPressureFrames = async ({
  hours = 48,
  limit,
  offset = 0,
  forceRefresh = false
} = {}) => {
  const cacheKey = getFrameListCacheKey(hours);
  const now = Date.now();
  const cached = frameListCache.get(cacheKey);

  if (!forceRefresh && cached && cached.expiresAt > now) {
    const sliced = limit == null ? cached.payload.frames.slice(offset) : cached.payload.frames.slice(offset, offset + limit);
    return {
      ...cached.payload,
      offset,
      limit: limit ?? null,
      frames: sliced
    };
  }

  const gridForecast = await getSwedenGridForecast({ forecastHours: hours, forceRefresh });
  const frames = gridForecast.times.slice(0, hours + 1).map((time, index) => ({
    key: toFrameKey(time),
    valid: new Date(`${time}Z`).toISOString(),
    index
  }));

  const payload = {
    source: getPressureMetadata().source,
    hours,
    total: frames.length,
    intervalHours: 1,
    frames
  };

  frameListCache.set(cacheKey, {
    expiresAt: now + FRAME_LIST_CACHE_TTL_MS,
    payload
  });

  const sliced = limit == null ? frames.slice(offset) : frames.slice(offset, offset + limit);
  return {
    ...payload,
    offset,
    limit: limit ?? null,
    frames: sliced,
    cachedUntil: new Date(now + FRAME_LIST_CACHE_TTL_MS).toISOString()
  };
};

export const getPressureFrameGeoJson = async ({ frameKey, forceRefresh = false } = {}) => {
  if (!frameKey) {
    const error = new Error("Ogiltig tryckframe.");
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = getFrameGeoJsonCacheKey(frameKey);
  const now = Date.now();
  const cached = frameGeoJsonCache.get(cacheKey);

  if (!forceRefresh && cached && cached.expiresAt > now) {
    touchFrameGeoJsonKey(cacheKey);
    return cached.payload;
  }

  const gridForecast = await getSwedenGridForecast({ forecastHours: 48, forceRefresh });
  const timeIndex = findTimeIndex(gridForecast, frameKey);

  if (timeIndex < 0) {
    const error = new Error(`Okänd tryckframe: ${frameKey}`);
    error.statusCode = 404;
    throw error;
  }

  const payload = buildPressureFrameGeoJson({ gridForecast, timeIndex });
  frameGeoJsonCache.set(cacheKey, {
    expiresAt: now + FRAME_GEOJSON_CACHE_TTL_MS,
    payload
  });
  touchFrameGeoJsonKey(cacheKey);
  evictFrameGeoJsonIfNeeded();

  return payload;
};
