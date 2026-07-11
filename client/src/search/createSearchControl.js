import { createDebouncedAction } from "../map/lod/createDebouncedAction.js";
import { searchPlaces } from "./searchService.js";

const ROOT_CLASS = "map-search-control maplibregl-ctrl";
const FORM_CLASS = "map-search-control__form";
const INPUT_CLASS = "map-search-control__input";
const ICON_CLASS = "map-search-control__icon";
const CLEAR_CLASS = "map-search-control__clear";
const DROPDOWN_CLASS = "map-search-control__dropdown";
const STATUS_CLASS = "map-search-control__status";
const RESULT_CLASS = "map-search-control__result";
const RESULT_ACTIVE_CLASS = "map-search-control__result--active";
const RESULT_LABEL_CLASS = "map-search-control__result-label";
const RESULT_SUBTITLE_CLASS = "map-search-control__result-subtitle";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_FLY_DURATION_MS = 1600;
const DEFAULT_RESULT_ZOOM = 14;
const MIN_QUERY_LENGTH = 2;

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    const release = listeners.pop();
    release?.();
  }
};

const getResultZoom = (result, map) => {
  if (Number.isFinite(result.zoom)) {
    return result.zoom;
  }

  const currentZoom = map.getZoom();
  return Math.max(DEFAULT_RESULT_ZOOM, currentZoom);
};

export const createSearchControl = ({ map, mapConfig, onPlaceSelect }) => {
  let container = null;
  let form = null;
  let input = null;
  let listbox = null;
  let statusElement = null;
  let clearButton = null;
  let results = [];
  let activeIndex = -1;
  let isDropdownOpen = false;
  let activeRequestId = 0;
  let abortController = null;
  const listeners = [];
  let debouncedSearch = null;

  const setDropdownOpen = (isOpen) => {
    isDropdownOpen = isOpen;
    if (!listbox) {
      return;
    }

    listbox.hidden = !isOpen;
    input?.setAttribute("aria-expanded", String(isOpen));
  };

  const setStatusMessage = (message) => {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.hidden = !message;
  };

  const updateClearButton = () => {
    if (!clearButton || !input) {
      return;
    }

    const hasValue = input.value.trim().length > 0;
    clearButton.hidden = !hasValue;
  };

  const renderActiveResult = () => {
    if (!listbox) {
      return;
    }

    const optionElements = listbox.querySelectorAll('[role="option"]');
    optionElements.forEach((element, index) => {
      const isActive = index === activeIndex;
      element.classList.toggle(RESULT_ACTIVE_CLASS, isActive);
      element.setAttribute("aria-selected", String(isActive));
      if (isActive) {
        input?.setAttribute("aria-activedescendant", element.id);
        element.scrollIntoView({ block: "nearest" });
      }
    });

    if (activeIndex < 0) {
      input?.removeAttribute("aria-activedescendant");
    }
  };

  const closeDropdown = ({ clearActive = true } = {}) => {
    if (clearActive) {
      activeIndex = -1;
    }
    setDropdownOpen(false);
    setStatusMessage("");
  };

  const flyToResult = (result) => {
    map.stop();
    map.flyTo({
      center: [result.lon, result.lat],
      zoom: getResultZoom(result, map),
      pitch: mapConfig.pitch,
      bearing: mapConfig.bearing,
      duration: SEARCH_FLY_DURATION_MS,
      essential: true
    });
  };

  const selectResult = (result) => {
    if (!result) {
      return;
    }

    input.value = result.label;
    updateClearButton();
    closeDropdown();
    input.blur();
    flyToResult(result);
    onPlaceSelect?.(result);
  };

  const renderResults = (nextResults, { statusMessage = "" } = {}) => {
    results = nextResults;
    activeIndex = nextResults.length > 0 ? 0 : -1;

    if (!listbox) {
      return;
    }

    listbox.replaceChildren();

    if (nextResults.length === 0) {
      setDropdownOpen(Boolean(statusMessage));
      setStatusMessage(statusMessage);
      return;
    }

    nextResults.forEach((result, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = RESULT_CLASS;
      option.id = `map-search-result-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === activeIndex));

      const label = document.createElement("span");
      label.className = RESULT_LABEL_CLASS;
      label.textContent = result.label;

      option.appendChild(label);

      if (result.subtitle) {
        const subtitle = document.createElement("span");
        subtitle.className = RESULT_SUBTITLE_CLASS;
        subtitle.textContent = result.subtitle;
        option.appendChild(subtitle);
      }

      const onClick = (event) => {
        event.preventDefault();
        selectResult(result);
      };
      option.addEventListener("click", onClick);
      listeners.push(() => option.removeEventListener("click", onClick));

      listbox.appendChild(option);
    });

    setStatusMessage("");
    setDropdownOpen(true);
    renderActiveResult();
  };

  const runSearch = async (query) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      abortController?.abort();
      renderResults([], { statusMessage: "" });
      closeDropdown();
      return;
    }

    abortController?.abort();
    abortController = new AbortController();
    const requestId = ++activeRequestId;

    setDropdownOpen(true);
    setStatusMessage("Söker…");

    try {
      const nextResults = await searchPlaces(normalizedQuery, {
        signal: abortController.signal,
        limit: 8
      });

      if (requestId !== activeRequestId) {
        return;
      }

      if (nextResults.length === 0) {
        renderResults([], { statusMessage: "Inga träffar hittades." });
        return;
      }

      renderResults(nextResults);
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (requestId !== activeRequestId) {
        return;
      }

      renderResults([], {
        statusMessage: "Kunde inte hämta sökresultat just nu."
      });
    }
  };

  const moveActiveIndex = (delta) => {
    if (!isDropdownOpen || results.length === 0) {
      return;
    }

    const nextIndex = Math.min(
      results.length - 1,
      Math.max(0, activeIndex + delta)
    );
    activeIndex = nextIndex;
    renderActiveResult();
  };

  const bindInputEvents = () => {
    const onInput = () => {
      updateClearButton();
      debouncedSearch(input.value);
    };
    input.addEventListener("input", onInput);
    listeners.push(() => input.removeEventListener("input", onInput));

    const onFocus = () => {
      if (results.length > 0 || statusElement?.textContent) {
        setDropdownOpen(true);
      }
    };
    input.addEventListener("focus", onFocus);
    listeners.push(() => input.removeEventListener("focus", onFocus));

    const onKeyDown = (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (!isDropdownOpen && results.length > 0) {
            setDropdownOpen(true);
          }
          moveActiveIndex(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActiveIndex(-1);
          break;
        case "Enter":
          if (isDropdownOpen && activeIndex >= 0 && results[activeIndex]) {
            event.preventDefault();
            selectResult(results[activeIndex]);
          }
          break;
        case "Escape":
          event.preventDefault();
          closeDropdown();
          input.blur();
          break;
        default:
          break;
      }
    };
    input.addEventListener("keydown", onKeyDown);
    listeners.push(() => input.removeEventListener("keydown", onKeyDown));
  };

  const bindFormEvents = () => {
    const onSubmit = (event) => {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex]);
        return;
      }

      debouncedSearch.cancel();
      runSearch(input.value);
    };
    form.addEventListener("submit", onSubmit);
    listeners.push(() => form.removeEventListener("submit", onSubmit));
  };

  const bindClearButton = () => {
    const onClear = (event) => {
      event.preventDefault();
      input.value = "";
      updateClearButton();
      debouncedSearch.cancel();
      abortController?.abort();
      results = [];
      activeIndex = -1;
      closeDropdown();
      input.focus();
    };
    clearButton.addEventListener("click", onClear);
    listeners.push(() => clearButton.removeEventListener("click", onClear));
  };

  const bindDocumentClick = () => {
    const onDocumentClick = (event) => {
      if (!container?.contains(event.target)) {
        closeDropdown({ clearActive: false });
      }
    };
    document.addEventListener("click", onDocumentClick);
    listeners.push(() =>
      document.removeEventListener("click", onDocumentClick)
    );
  };

  return {
    onAdd: () => {
      debouncedSearch = createDebouncedAction(() => {
        runSearch(input.value);
      }, SEARCH_DEBOUNCE_MS);

      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "search");
      container.setAttribute("aria-label", "Platssökning");

      form = document.createElement("form");
      form.className = FORM_CLASS;
      form.setAttribute("autocomplete", "off");

      const icon = document.createElement("span");
      icon.className = ICON_CLASS;
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "⌕";

      input = document.createElement("input");
      input.type = "search";
      input.className = INPUT_CLASS;
      input.name = "q";
      input.placeholder = "Sök adress, ort eller plats...";
      input.setAttribute("aria-label", "Sök adress, ort eller plats");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-controls", "map-search-results");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("enterkeyhint", "search");
      input.setAttribute("spellcheck", "false");

      clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = CLEAR_CLASS;
      clearButton.hidden = true;
      clearButton.textContent = "×";
      clearButton.title = "Rensa sökning";
      clearButton.setAttribute("aria-label", "Rensa sökning");

      listbox = document.createElement("div");
      listbox.id = "map-search-results";
      listbox.className = DROPDOWN_CLASS;
      listbox.setAttribute("role", "listbox");
      listbox.setAttribute("aria-label", "Sökresultat");
      listbox.hidden = true;

      statusElement = document.createElement("p");
      statusElement.className = STATUS_CLASS;
      statusElement.setAttribute("role", "status");
      statusElement.setAttribute("aria-live", "polite");
      statusElement.hidden = true;

      form.append(icon, input, clearButton);
      container.append(form, listbox, statusElement);

      bindInputEvents();
      bindFormEvents();
      bindClearButton();
      bindDocumentClick();

      return container;
    },
    onRemove: () => {
      debouncedSearch?.cancel();
      abortController?.abort();
      releaseListeners(listeners);
      container?.remove();
      container = null;
      form = null;
      input = null;
      listbox = null;
      statusElement = null;
      clearButton = null;
      results = [];
      activeIndex = -1;
      debouncedSearch = null;
      abortController = null;
    }
  };
};
