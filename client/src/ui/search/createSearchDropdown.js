import { createSearchResultItem } from "./createSearchResultItem.js";
import { getSearchHistory } from "./searchHistory.js";

const createSkeletons = (count = 3) => {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dropdown__skeletons";
  for (let index = 0; index < count; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "ui-skeleton";
    wrapper.appendChild(skeleton);
  }
  return wrapper;
};

const createSection = (heading, list) => {
  const section = document.createElement("div");
  section.className = "search-dropdown__section";

  if (heading) {
    const title = document.createElement("p");
    title.className = "search-dropdown__heading";
    title.textContent = heading;
    section.appendChild(title);
  }

  section.appendChild(list);
  return section;
};

export const createSearchDropdown = ({ onSelect }) => {
  const dropdown = document.createElement("div");
  dropdown.className = "search-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.hidden = true;

  const resultCleanups = [];

  const clearResults = () => {
    resultCleanups.forEach((cleanup) => cleanup());
    resultCleanups.length = 0;
    dropdown.replaceChildren();
  };

  const showLoading = () => {
    clearResults();
    dropdown.hidden = false;
    dropdown.appendChild(createSkeletons());
  };

  const showEmpty = (message) => {
    clearResults();
    dropdown.hidden = false;
    const empty = document.createElement("p");
    empty.className = "search-dropdown__empty";
    empty.textContent = message;
    dropdown.appendChild(empty);
  };

  const showHint = (message) => {
    clearResults();
    dropdown.hidden = false;
    const hint = document.createElement("p");
    hint.className = "search-dropdown__hint";
    hint.textContent = message;
    dropdown.appendChild(hint);
  };

  const renderCities = (cities, query, { heading } = {}) => {
    clearResults();
    dropdown.hidden = false;

    if (cities.length === 0) {
      showEmpty("Inga träffar — prova ett annat namn eller län");
      return;
    }

    const list = document.createElement("ul");
    list.className = "search-dropdown__list";

    cities.forEach((city) => {
      const { element, destroy } = createSearchResultItem({
        city,
        query,
        onSelect: () => onSelect(city)
      });
      list.appendChild(element);
      resultCleanups.push(destroy);
    });

    dropdown.appendChild(createSection(heading ?? null, list));
  };

  const renderHistory = () => {
    const history = getSearchHistory();
    if (history.length === 0) {
      showHint('Sök stad, län eller koordinater — t.ex. "Stockholm" eller "59.33, 18.07"');
      return;
    }

    clearResults();
    dropdown.hidden = false;

    const list = document.createElement("ul");
    list.className = "search-dropdown__list";

    history.forEach((city) => {
      const { element, destroy } = createSearchResultItem({
        city,
        query: "",
        onSelect: () => onSelect(city)
      });
      list.appendChild(element);
      resultCleanups.push(destroy);
    });

    dropdown.appendChild(createSection("Senaste", list));
  };

  const hide = () => {
    dropdown.hidden = true;
  };

  const isVisible = () => !dropdown.hidden;

  const getResultElements = () =>
    Array.from(dropdown.querySelectorAll(".search-result"));

  const destroy = () => {
    clearResults();
    dropdown.remove();
  };

  return {
    element: dropdown,
    showLoading,
    showEmpty,
    showHint,
    renderCities,
    renderHistory,
    hide,
    isVisible,
    getResultElements,
    destroy
  };
};
