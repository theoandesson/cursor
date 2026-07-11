import { createListKeyboardNav } from "../primitives/keyboardNav.js";
import { createSearchDropdown } from "./createSearchDropdown.js";
import { addToSearchHistory } from "./searchHistory.js";
import {
  createDebouncedSearch,
  parseCoordinates,
  searchCities
} from "./searchService.js";
import { flyToCity, flyToCoordinates } from "./flyToCity.js";

export const createSearchBar = ({ map, onToast }) => {
  const container = document.createElement("div");
  container.className = "search-bar";

  const field = document.createElement("div");
  field.className = "search-bar__field";

  const icon = document.createElement("span");
  icon.className = "search-bar__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "🔍";

  const input = document.createElement("input");
  input.className = "search-bar__input";
  input.type = "search";
  input.placeholder = "Sök stad, län eller koordinater…";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "search-bar__clear";
  clearButton.textContent = "×";
  clearButton.title = "Rensa";
  clearButton.setAttribute("aria-label", "Rensa sökning");
  clearButton.hidden = true;

  const shortcut = document.createElement("kbd");
  shortcut.className = "search-bar__shortcut";
  shortcut.textContent = "/";

  field.append(icon, input, clearButton, shortcut);
  container.appendChild(field);

  const selectCity = (city) => {
    addToSearchHistory(city);
    input.value = city.name;
    clearButton.hidden = false;
    dropdown.hide();
    input.setAttribute("aria-expanded", "false");
    keyboardNav.reset();

    flyToCity(map, city, {
      onStart: () => onToast?.(`Flyger till ${city.name}…`, { variant: "success" }),
      onComplete: () => onToast?.(`Visar ${city.name}`, { variant: "success", duration: 2000 })
    });
  };

  const dropdown = createSearchDropdown({ onSelect: selectCity });
  container.appendChild(dropdown.element);

  const debouncedSearch = createDebouncedSearch(searchCities);

  const keyboardNav = createListKeyboardNav({
    getItems: () => dropdown.getResultElements(),
    onSelect: (element) => {
      const cityId = element.dataset.cityId;
      const city = currentResults.find((item) => item.id === cityId);
      if (city) {
        selectCity(city);
      }
    },
    onEscape: () => {
      dropdown.hide();
      input.setAttribute("aria-expanded", "false");
      keyboardNav.reset();
      input.blur();
    }
  });

  let currentResults = [];

  const runSearch = async (query) => {
    const coords = parseCoordinates(query);
    if (coords) {
      currentResults = [];
      dropdown.renderCities(
        [
          {
            id: `coord-${coords.lat}-${coords.lon}`,
            name: coords.label,
            lon: coords.lon,
            lat: coords.lat,
            county: "Koordinat"
          }
        ],
        query,
        { heading: "Koordinat" }
      );
      input.setAttribute("aria-expanded", "true");
      return;
    }

    if (!query.trim()) {
      currentResults = [];
      dropdown.renderHistory();
      input.setAttribute("aria-expanded", String(dropdown.isVisible()));
      return;
    }

    dropdown.showLoading();
    input.setAttribute("aria-expanded", "true");

    const { results, error } = await debouncedSearch.search(query);
    if (document.activeElement !== input && !dropdown.isVisible()) {
      return;
    }

    if (error) {
      onToast?.(error, { variant: "error" });
      dropdown.showEmpty("Kunde inte söka just nu");
      return;
    }

    currentResults = results;
    dropdown.renderCities(results, query);
    keyboardNav.reset();
  };

  const openDropdown = () => {
    if (!dropdown.isVisible()) {
      if (input.value.trim()) {
        runSearch(input.value);
      } else {
        dropdown.renderHistory();
        input.setAttribute("aria-expanded", "true");
      }
    }
  };

  const onInput = () => {
    clearButton.hidden = input.value.length === 0;
    runSearch(input.value);
  };

  const onFocus = () => {
    openDropdown();
  };

  const onClear = () => {
    input.value = "";
    clearButton.hidden = true;
    debouncedSearch.cancel();
    dropdown.renderHistory();
    input.focus();
  };

  const onDocumentClick = (event) => {
    if (!container.contains(event.target)) {
      dropdown.hide();
      input.setAttribute("aria-expanded", "false");
      keyboardNav.reset();
    }
  };

  const onGlobalKeyDown = (event) => {
    if (
      event.key === "/" &&
      document.activeElement !== input &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || event.target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      input.focus();
      openDropdown();
    }
  };

  input.addEventListener("input", onInput);
  input.addEventListener("focus", onFocus);
  input.addEventListener("keydown", keyboardNav.onKeyDown);
  clearButton.addEventListener("click", onClear);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onGlobalKeyDown);

  const focus = () => {
    input.focus();
    openDropdown();
  };

  const destroy = () => {
    debouncedSearch.cancel();
    input.removeEventListener("input", onInput);
    input.removeEventListener("focus", onFocus);
    input.removeEventListener("keydown", keyboardNav.onKeyDown);
    clearButton.removeEventListener("click", onClear);
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onGlobalKeyDown);
    dropdown.destroy();
    container.remove();
  };

  return { element: container, focus, destroy };
};
