const CACHE_STATUS_ELEMENT_ID = "cache-status";

export const createCacheStatusPresenter = () => {
  const cacheStatusElement = document.getElementById(CACHE_STATUS_ELEMENT_ID);
  if (!cacheStatusElement) {
    return () => undefined;
  }

  return (message) => {
    cacheStatusElement.textContent = message;
  };
};
