const STORAGE_KEY = "sweden-map-search-history";
const MAX_HISTORY = 5;

const readHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    /* ignore quota errors */
  }
};

export const getSearchHistory = () => readHistory();

export const addToSearchHistory = (entry) => {
  const history = readHistory().filter((item) => item.id !== entry.id);
  history.unshift(entry);
  writeHistory(history);
  return history;
};

export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
