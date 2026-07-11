import { fetchWithTimeout } from "../lib/fetchWithTimeout.js";

const SMHI_RADAR_BASE_URL =
  "https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp";

const RADAR_FRAME_KEY_PATTERN = /^radar_\d{10}$/;
const FETCH_TIMEOUT_MS = 12_000;

const pad2 = (value) => String(value).padStart(2, "0");

const parseFrameKeyDate = (frameKey) => {
  const match = frameKey.match(/^radar_(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, yearSuffix, month, day] = match;
  const year = 2000 + Number(yearSuffix);

  return {
    year,
    month: pad2(month),
    day: pad2(day)
  };
};

const fetchJson = async (url) => {
  const response = await fetchWithTimeout(url, { timeoutMs: FETCH_TIMEOUT_MS });
  if (!response.ok) {
    throw new Error(`SMHI Radar API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

const fetchBinary = async (url) => {
  const response = await fetchWithTimeout(url, { timeoutMs: FETCH_TIMEOUT_MS });
  if (!response.ok) {
    throw new Error(`SMHI Radar API ${response.status}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const fetchRadarProductRoot = async () => fetchJson(SMHI_RADAR_BASE_URL);

export const fetchRadarDayIndex = async ({ year, month, day }) =>
  fetchJson(`${SMHI_RADAR_BASE_URL}/${year}/${month}/${day}`);

export const isRadarFrameKey = (frameKey) => RADAR_FRAME_KEY_PATTERN.test(frameKey);

export const buildRadarImageUrl = ({ frameKey }) => {
  if (frameKey === "latest") {
    return `${SMHI_RADAR_BASE_URL}/latest.png`;
  }

  const dateParts = parseFrameKeyDate(frameKey);
  if (!dateParts) {
    return null;
  }

  return `${SMHI_RADAR_BASE_URL}/${dateParts.year}/${dateParts.month}/${dateParts.day}/${frameKey}.png`;
};

export const fetchRadarImage = async ({ frameKey }) => {
  const url = buildRadarImageUrl({ frameKey });
  if (!url) {
    throw new Error(`Ogiltig radarframe: ${frameKey}`);
  }

  return fetchBinary(url);
};

export const extractPngFramesFromDayIndex = (dayIndex) =>
  (dayIndex.files ?? [])
    .filter((file) => RADAR_FRAME_KEY_PATTERN.test(file.key))
    .map((file) => {
      const pngFormat = file.formats?.find((format) => format.key === "png");
      if (!pngFormat) {
        return null;
      }

      return {
        key: file.key,
        valid: file.valid,
        updated: file.updated,
        upstreamUrl: pngFormat.link
      };
    })
    .filter(Boolean);

export const parseRadarValidUtc = (valid) => Date.parse(`${valid.replace(" ", "T")}:00Z`);
