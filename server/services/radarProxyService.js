import { getRadarMetadata } from "../data/radarMetadata.js";
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

const frameListCache = {
  expiresAt: 0,
  payload: null
};

const imageCache = new Map();

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

const toProxyFrame = (frame) => ({
  key: frame.key,
  valid: new Date(parseRadarValidUtc(frame.valid)).toISOString(),
  updated: frame.updated,
  imageUrl: `/api/radar/frames/${frame.key}.png`
});

const fetchFramesForWindow = async ({ hours }) => {
  const now = Date.now();
  const cutoff = now - hours * 60 * 60 * 1000;
  const dayKeys = uniqueDayKeys(new Date(cutoff), new Date(now));
  const framesByKey = new Map();

  for (const dayKey of dayKeys) {
    const [year, month, day] = dayKey.split("-");
    const dayIndex = await fetchRadarDayIndex({ year, month, day });

    for (const frame of extractPngFramesFromDayIndex(dayIndex)) {
      const validMs = parseRadarValidUtc(frame.valid);
      if (validMs < cutoff) {
        continue;
      }

      framesByKey.set(frame.key, frame);
    }
  }

  return [...framesByKey.values()].sort(
    (left, right) => parseRadarValidUtc(left.valid) - parseRadarValidUtc(right.valid)
  );
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
  const canUseCache =
    !forceRefresh && frameListCache.payload && frameListCache.expiresAt > now;

  if (!canUseCache) {
    const frames = await fetchFramesForWindow({ hours });
    frameListCache.payload = {
      product: "comp",
      hours,
      total: frames.length,
      frames: frames.map(toProxyFrame)
    };
    frameListCache.expiresAt = now + FRAME_LIST_CACHE_TTL_MS;
  }

  const payload = frameListCache.payload;
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
    cachedUntil: new Date(frameListCache.expiresAt).toISOString()
  };
};

const getCachedImage = (cacheKey) => {
  const entry = imageCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt > Date.now()) {
    return entry;
  }

  imageCache.delete(cacheKey);
  return null;
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

  imageCache.set(cacheKey, entry);
  return entry;
};
