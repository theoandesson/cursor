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
const SEARCH_FLY_MIN_DURATION_MS = 700;
const SEARCH_FLY_MAX_DURATION_MS = 2200;
const DEFAULT_RESULT_ZOOM = 14;
const MIN_QUERY_LENGTH = 2;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const getFlyDurationMs = (fromCenter, toCenter) => {
  if (prefersReducedMotion()) {
    return 0;
  }

  const [fromLon, fromLat] = fromCenter;
  const [toLon, toLat] = toCenter;
  const lonDelta = toLon - fromLon;
  const latDelta = toLat - fromLat;
  const distance = Math.hypot(lonDelta, latDelta);
  return Math.round(
    Math.min(
      SEARCH_FLY_MAX_DURATION_MS,
      Math.max(SEARCH_FLY_MIN_DURATION_MS, 500 + distance * 4200)
    )
  );
};

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

  const setPanelOpen = (isOpen) => {
    isDropdownOpen = isOpen;
    input?.setAttribute("aria-expanded", String(isOpen));
  };

  const showStatusPanel = (message, { isLoading = false } = {}) => {
    if (!statusElement || !listbox) {
      return;
    }

    listbox.hidden = true;
    listbox.replaceChildren();
    results = [];
    activeIndex = -1;
    input?.removeAttribute("aria-activedescendant");

    statusElement.textContent = message;
    statusElement.hidden = !message;
    statusElement.dataset.state = isLoading ? "loading" : "";
    setPanelOpen(Boolean(message));
    input?.setAttribute("aria-busy", String(isLoading));
  };

  const showResultsPanel = () => {
    if (!statusElement || !listbox) {
      return;
    }

    statusElement.hidden = true;
    statusElement.textContent = "";
    statusElement.dataset.state = "";
    listbox.hidden = false;
    input?.setAttribute("aria-busy", "false");
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (!statusElement || !listbox) {
      return;
    }

    statusElement.hidden = true;
    statusElement.textContent = "";
    statusElement.dataset.state = "";
    listbox.hidden = true;
    input?.setAttribute("aria-busy", "false");
    setPanelOpen(false);
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
      input?.removeAttribute("aria-activedescendant");
    }
    closePanel();
  };

  const flyToResult = (result) => {
    const targetCenter = [result.lon, result.lat];
    map.stop();
    map.flyTo({
      center: targetCenter,
      zoom: getResultZoom(result, map),
      pitch: mapConfig.pitch,
      bearing: mapConfig.bearing,
      duration: getFlyDurationMs(map.getCenter().toArray(), targetCenter),
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
    onPlaceSelect?.(result, { trigger: input });
  };

  const renderResults = (nextResults, { statusMessage = "" } = {}) => {
    results = nextResults;
    activeIndex = nextResults.length > 0 ? 0 : -1;

    if (!listbox) {
      return;
    }

    listbox.replaceChildren();

    if (nextResults.length === 0) {
      if (statusMessage) {
        showStatusPanel(statusMessage);
      } else {
        closePanel();
      }
      return;
    }

    nextResults.forEach((result, index) => {
      const option = document.createElement("div");
      option.className = RESULT_CLASS;
      option.id = `map-search-result-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === activeIndex));
      option.tabIndex = -1;

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

      const onMouseDown = (event) => {
        event.preventDefault();
      };
      const onClick = () => {
        selectResult(result);
      };
      option.addEventListener("mousedown", onMouseDown);
      option.addEventListener("click", onClick);
      listeners.push(() => {
        option.removeEventListener("mousedown", onMouseDown);
        option.removeEventListener("click", onClick);
      });

      listbox.appendChild(option);
    });

    showResultsPanel();
    renderActiveResult();
  };

  const runSearch = async (query) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      abortController?.abort();
      activeRequestId += 1;
      renderResults([], { statusMessage: "" });
      closeDropdown();
      return;
    }

    abortController?.abort();
    abortController = new AbortController();
    const requestId = ++activeRequestId;

    showStatusPanel("Söker…", { isLoading: true });

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
      if (results.length > 0) {
        showResultsPanel();
        renderActiveResult();
        return;
      }

      if (statusElement?.textContent) {
        statusElement.hidden = false;
        listbox.hidden = true;
        setPanelOpen(true);
      }
    };
    input.addEventListener("focus", onFocus);
    listeners.push(() => input.removeEventListener("focus", onFocus));

    const onKeyDown = (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (!isDropdownOpen && results.length > 0) {
            showResultsPanel();
          }
          moveActiveIndex(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          if (activeIndex <= 0) {
            activeIndex = -1;
            renderActiveResult();
            break;
          }
          moveActiveIndex(-1);
          break;
        case "Home":
          if (isDropdownOpen && results.length > 0) {
            event.preventDefault();
            activeIndex = 0;
            renderActiveResult();
          }
          break;
        case "End":
          if (isDropdownOpen && results.length > 0) {
            event.preventDefault();
            activeIndex = results.length - 1;
            renderActiveResult();
          }
          break;
        case "Tab":
          closeDropdown({ clearActive: false });
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

    const onBlur = (event) => {
      if (container?.contains(event.relatedTarget)) {
        return;
      }
      closeDropdown({ clearActive: false });
    };
    input.addEventListener("blur", onBlur);
    listeners.push(() => input.removeEventListener("blur", onBlur));
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
      activeRequestId += 1;
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
      icon.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16.2 16.2 20.5 20.5"/></svg>';

      input = document.createElement("input");
      input.type = "search";
      input.className = INPUT_CLASS;
      input.name = "q";
      input.placeholder = "Sök adress, ort eller plats...";
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-label", "Sök adress, ort eller plats");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-haspopup", "listbox");
      input.setAttribute("aria-controls", "map-search-results map-search-status");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("enterkeyhint", "search");
      input.setAttribute("spellcheck", "false");

      clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = CLEAR_CLASS;
      clearButton.hidden = true;
      clearButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      clearButton.title = "Rensa sökning";
      clearButton.setAttribute("aria-label", "Rensa sökning");

      listbox = document.createElement("div");
      listbox.id = "map-search-results";
      listbox.className = DROPDOWN_CLASS;
      listbox.setAttribute("role", "listbox");
      listbox.setAttribute("aria-label", "Sökresultat");
      listbox.hidden = true;

      statusElement = document.createElement("p");
      statusElement.id = "map-search-status";
      statusElement.className = STATUS_CLASS;
      statusElement.setAttribute("role", "status");
      statusElement.setAttribute("aria-live", "polite");
      statusElement.setAttribute("aria-atomic", "true");
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
