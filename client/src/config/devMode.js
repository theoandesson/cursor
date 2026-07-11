const DEV_QUERY_KEY = "dev";

export const isDevMode = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(DEV_QUERY_KEY)) {
      return true;
    }
    if (window.localStorage?.getItem("app:dev") === "1") {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};
