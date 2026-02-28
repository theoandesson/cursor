const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
