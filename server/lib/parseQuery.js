const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isQueryParamProvided = (value) => value != null && value !== "";

export const parseFloatInRange = (value, { min, max } = {}) => {
  const parsed = toNumber(value);
  if (parsed == null) {
    return null;
  }
  if (min != null && parsed < min) {
    return null;
  }
  if (max != null && parsed > max) {
    return null;
  }
  return parsed;
};

export const parseIntegerInRange = (value, { min, max } = {}) => {
  if (value == null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (min != null && parsed < min) {
    return null;
  }
  if (max != null && parsed > max) {
    return null;
  }
  return parsed;
};

export const parseIntegerInRangeOrReject = (value, { min, max } = {}) => {
  if (!isQueryParamProvided(value)) {
    return { ok: true, value: null, provided: false };
  }

  const parsed = parseIntegerInRange(value, { min, max });
  if (parsed == null) {
    return { ok: false, provided: true };
  }

  return { ok: true, value: parsed, provided: true };
};

export const parseFloatInRangeOrReject = (value, { min, max } = {}) => {
  if (!isQueryParamProvided(value)) {
    return { ok: true, value: null, provided: false };
  }

  const parsed = parseFloatInRange(value, { min, max });
  if (parsed == null) {
    return { ok: false, provided: true };
  }

  return { ok: true, value: parsed, provided: true };
};

export const parseBoolean = (value, fallback = false) => {
  if (value == null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return true;
  }
  if (normalized === "0" || normalized === "false") {
    return false;
  }
  return fallback;
};
