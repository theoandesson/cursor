import { getRadarMetadata } from "../data/radarMetadata.js";
import { createSingleFlight } from "../lib/singleFlight.js";
import {
  buildRadarImageUrl,
  extractPngFramesFromDayIndex,
  fetchRadarDayIndex,
  fetchRadarImage,
  fetchRadarProductRoot,
  isRadarFrameKey,
  parseRadarValidUtc
} from "./smhiRadarService.js";

const FRAME_LIST_CACHE_TTL_MS = 60 * 1000;
const LATEST_IMAGE_CACHE_TTL_MS = 30 * 1000;
const MIN_FORCE_REFRESH_INTERVAL_MS = 15_000;
const MAX_IMAGE_CACHE_ENTRIES = 72;

const frameListCacheByHours = new Map();
const frameListFlight = createSingleFlight();
const imageCache = new Map();
const imageCacheOrder = [];
const imageFlight = createSingleFlight();

const utcDateParts = (date) => ({
  year: date.getUTCFullYear(),
  month: String(date.getUTCMonth() + 1).padStart(2, "0"),
  day: String(date.getUTCDate()).padStart(2, "0")
});

const uniqueDayKeys = (startDate, endDate) => {
  const keys = new Set();
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const parts = utcDateParts(cursor);
    keys.add(`${parts.year}-${parts.month}-${parts.day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return [...keys];
};

const toProxyFrame = (frame) => {
  const validMs = parseRadarValidUtc(frame.valid);
  if (!Number.isFinite(validMs)) {
    return null;
  }

  return {
    key: frame.key,
    valid: new Date(validMs).toISOString(),
    updated: frame.updated,
    imageUrl: `/api/radar/frames/${frame.key}.png`
  };
};

const fetchFramesForWindow = async ({ hours }) => {
  const now = Date.now();
  const cutoff = now - hours * 60 * 60 * 1000;
  const dayKeys = uniqueDayKeys(new Date(cutoff), new Date(now));
  const framesByKey = new Map();

  for (const dayKey of dayKeys) {
    const [year, month, day] = dayKey.split("-");
    try {
      const dayIndex = await fetchRadarDayIndex({ year, month, day });

      for (const frame of extractPngFramesFromDayIndex(dayIndex)) {
        const validMs = parseRadarValidUtc(frame.valid);
        if (!Number.isFinite(validMs) || validMs < cutoff) {
          continue;
        }

        framesByKey.set(frame.key, frame);
      }
    } catch (error) {
      console.warn(
        `Kunde inte hämta radarindex för ${dayKey}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return [...framesByKey.values()].sort(
    (left, right) => parseRadarValidUtc(left.valid) - parseRadarValidUtc(right.valid)
  );
};

const getFrameListCache = (hours) => frameListCacheByHours.get(hours) ?? null;

const setFrameListCache = (hours, payload) => {
  const fetchedAt = Date.now();
  frameListCacheByHours.set(hours, {
    fetchedAt,
    expiresAt: fetchedAt + FRAME_LIST_CACHE_TTL_MS,
    payload
  });
};

const touchImageCacheKey = (cacheKey) => {
  const index = imageCacheOrder.indexOf(cacheKey);
  if (index >= 0) {
    imageCacheOrder.splice(index, 1);
  }
  imageCacheOrder.push(cacheKey);
};

const evictImageCacheIfNeeded = () => {
  while (imageCacheOrder.length > MAX_IMAGE_CACHE_ENTRIES) {
    const oldestKey = imageCacheOrder.shift();
    if (oldestKey) {
      imageCache.delete(oldestKey);
    }
  }
};

export const getRadarMetadataPayload = async () => {
  let productUpdated = null;

  try {
    const productRoot = await fetchRadarProductRoot();
    productUpdated = productRoot.updated ?? null;
  } catch {
    productUpdated = null;
  }

  return {
    ...getRadarMetadata(),
    updated: productUpdated
  };
};

export const listRadarFrames = async ({
  hours = 1,
  limit,
  offset = 0,
  forceRefresh = false
} = {}) => {
  const now = Date.now();
  const cached = getFrameListCache(hours);
  const refreshedTooRecently =
    cached && now - (cached.fetchedAt ?? cached.expiresAt - FRAME_LIST_CACHE_TTL_MS) < MIN_FORCE_REFRESH_INTERVAL_MS;
  const canUseCache = (!forceRefresh || refreshedTooRecently) && cached && cached.expiresAt > now;

  if (!canUseCache) {
    await frameListFlight.doOnce(`radar-frames:${hours}`, async () => {
      const afterWait = Date.now();
      const cachedAfterWait = getFrameListCache(hours);
      if (
        cachedAfterWait &&
        cachedAfterWait.expiresAt > afterWait &&
        (!forceRefresh ||
          afterWait -
            (cachedAfterWait.fetchedAt ??
              cachedAfterWait.expiresAt - FRAME_LIST_CACHE_TTL_MS) <
            MIN_FORCE_REFRESH_INTERVAL_MS)
      ) {
        return;
      }

      const frames = await fetchFramesForWindow({ hours });
      setFrameListCache(hours, {
        product: "comp",
        hours,
        total: frames.length,
        frames: frames.map(toProxyFrame).filter(Boolean)
      });
    });
  }

  const payload = getFrameListCache(hours).payload;
  const slicedFrames =
    limit == null
      ? payload.frames.slice(offset)
      : payload.frames.slice(offset, offset + limit);

  return {
    ...payload,
    total: payload.frames.length,
    offset,
    limit: limit ?? null,
    frames: slicedFrames,
    cachedUntil: new Date(getFrameListCache(hours).expiresAt).toISOString()
  };
};

const getCachedImage = (cacheKey) => {
  const entry = imageCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt > Date.now()) {
    touchImageCacheKey(cacheKey);
    return entry;
  }

  imageCache.delete(cacheKey);
  const index = imageCacheOrder.indexOf(cacheKey);
  if (index >= 0) {
    imageCacheOrder.splice(index, 1);
  }
  return null;
};

const setCachedImage = (cacheKey, entry) => {
  imageCache.set(cacheKey, entry);
  touchImageCacheKey(cacheKey);
  evictImageCacheIfNeeded();
};

export const getRadarImage = async ({ frameKey, forceRefresh = false }) => {
  if (frameKey !== "latest" && !isRadarFrameKey(frameKey)) {
    const error = new Error(`Okänd radarframe: ${frameKey}`);
    error.statusCode = 404;
    throw error;
  }

  const cacheKey = frameKey;
  if (!forceRefresh) {
    const cached = getCachedImage(cacheKey);
    if (cached) {
      return cached;
    }
  }

  return imageFlight.doOnce(`radar-image:${cacheKey}`, async () => {
    if (!forceRefresh) {
      const cachedAfterWait = getCachedImage(cacheKey);
      if (cachedAfterWait) {
        return cachedAfterWait;
      }
    }

    const buffer = await fetchRadarImage({ frameKey });
    const upstreamUrl = buildRadarImageUrl({ frameKey });
    const expiresAt =
      frameKey === "latest"
        ? Date.now() + LATEST_IMAGE_CACHE_TTL_MS
        : Date.now() + 6 * 60 * 60 * 1000;

    const entry = {
      buffer,
      contentType: "image/png",
      upstreamUrl,
      expiresAt,
      cacheControl:
        frameKey === "latest"
          ? "public, max-age=30, stale-while-revalidate=60"
          : "public, max-age=21600, immutable"
    };

    setCachedImage(cacheKey, entry);
    return entry;
  });
};
