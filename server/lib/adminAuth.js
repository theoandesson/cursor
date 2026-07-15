/**
 * Admin endpoints (perf metrics) fail closed for remote clients.
 *
 * Access is granted when:
 * 1. Header `x-perf-admin-token` matches PERF_ADMIN_TOKEN, or
 * 2. The TCP peer is direct loopback AND either:
 *    - NODE_ENV is not "production", or
 *    - ALLOW_LOCAL_PERF_ADMIN=true
 *
 * Uses socket.remoteAddress (not request.ip) so a local reverse proxy
 * cannot make every client look like localhost.
 */

const configuredToken = () => {
  const token = process.env.PERF_ADMIN_TOKEN;
  if (typeof token !== "string") {
    return null;
  }
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isTruthyEnv = (value) => {
  if (value == null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const isProduction = () => process.env.NODE_ENV === "production";

const isDirectLoopback = (request) => {
  const remote = request.socket?.remoteAddress ?? "";
  return (
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1"
  );
};

export const allowPerfAdmin = (request) => {
  const token = configuredToken();
  const provided =
    request.get?.("x-perf-admin-token") ??
    request.headers?.["x-perf-admin-token"] ??
    "";

  if (token && provided === token) {
    return true;
  }

  if (!isDirectLoopback(request)) {
    return false;
  }

  if (!isProduction() || isTruthyEnv(process.env.ALLOW_LOCAL_PERF_ADMIN)) {
    return true;
  }

  return false;
};
