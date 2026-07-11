import { escapeHtml } from "../shared/escapeHtml.js";
import { WEATHER_LAYER_IDS } from "../weather/createCityWeatherLayer.js";
import { fetchWeatherAtPoint } from "../weather/smhiWeatherService.js";
import { getWeatherSymbol, getWindDirection } from "../weather/weatherSymbols.js";
import { getPlaceCategoryMeta, getPoiCategoryMeta } from "./poiCategories.js";
import {
  fetchPoisNear,
  fetchReverseGeocode,
  normalizePlace
} from "./placeService.js";

const NAVIGATE_FLY_DURATION_MS = 1400;
const DEFAULT_NAVIGATE_ZOOM = 15;
const NEARBY_POI_LIMIT = 8;
const NEARBY_POI_RADIUS_KM = 3;
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const formatCoords = (lon, lat) =>
  `${lat.toFixed(5)}°N, ${lon.toFixed(5)}°E`;

const formatDistance = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) {
    return "";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
};

const getFocusableElements = (root) =>
  [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true"
  );

const buildWeatherHtml = (weather) => {
  if (!weather?.current) {
    return `<p class="place-card__weather-unavailable">Ingen väderdata tillgänglig.</p>`;
  }

  const sym = getWeatherSymbol(weather.current.symbol);
  const windDir = getWindDirection(weather.current.windDir);

  return `
    <div class="place-card__weather-current">
      <span class="place-card__weather-icon" aria-hidden="true">${sym.icon}</span>
      <div>
        <span class="place-card__weather-temp">${
          weather.current.temp != null ? weather.current.temp.toFixed(1) : "?"
        }°C</span>
        <p class="place-card__weather-label">${sym.label}</p>
      </div>
    </div>
    <div class="place-card__weather-details">
      <span>Vind: ${weather.current.windSpeed ?? "?"} m/s ${windDir}</span>
      <span>Fukt: ${weather.current.humidity ?? "?"}%</span>
      <span>Tryck: ${
        weather.current.pressure ? Math.round(weather.current.pressure) : "?"
      } hPa</span>
    </div>`;
};

const buildNearbyHtml = (pois, activePlaceId) => {
  if (!pois.length) {
    return `<p class="place-card__empty">Inga närliggande platser hittades.</p>`;
  }

  const items = pois
    .filter((poi) => poi.id !== activePlaceId)
    .slice(0, NEARBY_POI_LIMIT)
    .map((poi) => {
      const meta = getPoiCategoryMeta(poi.category);
      const distance = formatDistance(poi.distanceKm);
      const poiName = poi.name ?? "Plats";
      const ariaLabel = distance
        ? `${poiName}, ${meta.label}, ${distance}`
        : `${poiName}, ${meta.label}`;
      return `
        <li>
          <button
            type="button"
            class="place-card__poi-item"
            data-poi-id="${escapeHtml(poi.id)}"
            data-poi-lon="${poi.lon}"
            data-poi-lat="${poi.lat}"
            data-poi-category="${escapeHtml(poi.category)}"
            data-poi-name="${escapeHtml(poiName)}"
            data-poi-address="${escapeHtml(poi.address ?? "")}"
            aria-label="${escapeHtml(ariaLabel)}"
          >
            <span class="place-card__poi-icon" aria-hidden="true">${meta.icon}</span>
            <span>
              <p class="place-card__poi-name">${escapeHtml(poiName)}</p>
              <p class="place-card__poi-meta">${escapeHtml(meta.label)}</p>
            </span>
            <span class="place-card__poi-distance" aria-hidden="true">${escapeHtml(distance)}</span>
          </button>
        </li>`;
    })
    .join("");

  return `<ul class="place-card__poi-list">${items}</ul>`;
};

export const createPlaceCard = ({ map, mapConfig }) => {
  let panel = null;
  let headerIcon = null;
  let nameElement = null;
  let categoryElement = null;
  let addressElement = null;
  let bodyElement = null;
  let statusElement = null;
  let navigateButton = null;
  let closeButton = null;
  let abortController = null;
  let currentPlace = null;
  let lastOpenRequest = null;
  let lastFocusTrigger = null;

  const onBodyClick = (event) => {
    const button = event.target.closest("[data-poi-id]");
    if (!button) {
      return;
    }

    showPlace(
      {
        id: button.dataset.poiId,
        name: button.dataset.poiName ?? "Plats",
        lon: Number(button.dataset.poiLon),
        lat: Number(button.dataset.poiLat),
        category: button.dataset.poiCategory ?? "place",
        categoryName: getPoiCategoryMeta(button.dataset.poiCategory).label,
        address: button.dataset.poiAddress ?? ""
      },
      { trigger: button }
    );
  };

  const announceStatus = (message) => {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
  };

  const setOpen = (isOpen, { trigger } = {}) => {
    if (!panel) {
      return;
    }

    if (isOpen) {
      lastFocusTrigger = trigger ?? document.activeElement;
      panel.inert = false;
      panel.classList.add("place-card--open");
      panel.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => {
        closeButton?.focus();
      });
      return;
    }

    panel.inert = true;
    panel.classList.remove("place-card--open");
    panel.setAttribute("aria-hidden", "true");
    announceStatus("");

    const returnFocusTo = lastFocusTrigger;
    lastFocusTrigger = null;
    if (returnFocusTo && typeof returnFocusTo.focus === "function") {
      returnFocusTo.focus();
    }
  };

  const renderLoading = () => {
    if (!bodyElement) {
      return;
    }

    bodyElement.innerHTML = `<p class="place-card__loading">Hämtar platsinformation…</p>`;
    announceStatus("Hämtar platsinformation.");
  };

  const renderError = (message, onRetry) => {
    if (!bodyElement) {
      return;
    }

    const retryButton = onRetry
      ? `<button type="button" class="place-card__retry">Försök igen</button>`
      : "";

    bodyElement.innerHTML = `
      <p class="place-card__error">${message}</p>
      ${retryButton}`;

    announceStatus(message);

    const retry = bodyElement.querySelector(".place-card__retry");
    retry?.addEventListener("click", onRetry, { once: true });
  };

  const updateHeader = (place) => {
    const poiMeta = getPoiCategoryMeta(place.category);
    const meta = place.categoryName
      ? { icon: poiMeta.icon, label: place.categoryName }
      : getPlaceCategoryMeta(place);

    if (headerIcon) headerIcon.textContent = meta.icon;
    if (nameElement) nameElement.textContent = place.name;
    if (categoryElement) categoryElement.textContent = meta.label;
    if (addressElement) {
      addressElement.textContent = place.address || place.displayName || "";
      addressElement.hidden = !(place.address || place.displayName);
    }
  };

  const renderContent = ({ place, weather, nearbyPois }) => {
    if (!bodyElement) {
      return;
    }

    bodyElement.innerHTML = `
      <section class="place-card__section" aria-label="Koordinater">
        <h3 class="place-card__section-title">Koordinater</h3>
        <p class="place-card__coords">${formatCoords(place.lon, place.lat)}</p>
      </section>
      <section class="place-card__section" aria-label="Väder">
        <h3 class="place-card__section-title">Väder</h3>
        ${buildWeatherHtml(weather)}
      </section>
      <section class="place-card__section" aria-label="Närliggande platser">
        <h3 class="place-card__section-title">I närheten</h3>
        ${buildNearbyHtml(nearbyPois, place.id)}
      </section>`;

    announceStatus(`Platsdetaljer för ${place.name} visas.`);
  };

  const flyToPlace = (place) => {
    map.stop();
    map.flyTo({
      center: [place.lon, place.lat],
      zoom: Math.max(place.zoom ?? DEFAULT_NAVIGATE_ZOOM, map.getZoom()),
      pitch: mapConfig.pitch,
      bearing: mapConfig.bearing,
      duration: NAVIGATE_FLY_DURATION_MS,
      essential: true
    });
  };

  const loadPlaceDetails = async (
    place,
    { reverseLookup = false, trigger } = {}
  ) => {
    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;
    const requestId = Symbol("place-request");
    lastOpenRequest = requestId;

    currentPlace = place;
    setOpen(true, { trigger });
    updateHeader(place);
    renderLoading();

    try {
      const [resolvedPlace, weather, nearbyPois] = await Promise.all([
        reverseLookup
          ? fetchReverseGeocode(place.lon, place.lat, { signal })
          : Promise.resolve(place),
        fetchWeatherAtPoint(place.lon, place.lat, { signal }).catch(() => null),
        fetchPoisNear(place.lon, place.lat, {
          radiusKm: NEARBY_POI_RADIUS_KM,
          limit: NEARBY_POI_LIMIT + 1,
          signal
        }).catch(() => [])
      ]);

      if (lastOpenRequest !== requestId || signal.aborted) {
        return;
      }

      const normalizedPlace = normalizePlace(
        { ...place, ...resolvedPlace },
        place.lon,
        place.lat
      );
      currentPlace = normalizedPlace;
      updateHeader(normalizedPlace);
      renderContent({
        place: normalizedPlace,
        weather,
        nearbyPois
      });
    } catch (error) {
      if (signal.aborted || lastOpenRequest !== requestId) {
        return;
      }

      renderError(
        error instanceof Error ? error.message : "Kunde inte hämta platsinformation.",
        () => loadPlaceDetails(place, { reverseLookup, trigger })
      );
    }
  };

  const openAt = (lngLat, { trigger } = {}) => {
    const lon = Number(lngLat.lng ?? lngLat.lon);
    const lat = Number(lngLat.lat);
    loadPlaceDetails(
      normalizePlace({ name: "Vald plats" }, lon, lat),
      { reverseLookup: true, trigger }
    );
  };

  const showPlace = (place, { trigger } = {}) => {
    loadPlaceDetails(normalizePlace(place, place.lon, place.lat), { trigger });
  };

  const close = () => {
    abortController?.abort();
    lastOpenRequest = null;
    currentPlace = null;
    setOpen(false);
  };

  const onPanelKeyDown = (event) => {
    if (!panel?.classList.contains("place-card--open")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusables = getFocusableElements(panel);
    if (focusables.length === 0) {
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const mount = () => {
    panel = document.createElement("aside");
    panel.className = "place-card";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;

    const header = document.createElement("header");
    header.className = "place-card__header";

    headerIcon = document.createElement("span");
    headerIcon.className = "place-card__category-icon";
    headerIcon.setAttribute("aria-hidden", "true");

    const titleBlock = document.createElement("div");
    titleBlock.className = "place-card__title-block";

    nameElement = document.createElement("h2");
    nameElement.className = "place-card__name";
    nameElement.id = "place-card-title";
    panel.setAttribute("aria-labelledby", "place-card-title");

    categoryElement = document.createElement("p");
    categoryElement.className = "place-card__category-label";

    addressElement = document.createElement("p");
    addressElement.className = "place-card__address";

    titleBlock.append(nameElement, categoryElement, addressElement);

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "place-card__close";
    closeButton.setAttribute("aria-label", "Stäng platskort");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", close);

    header.append(headerIcon, titleBlock, closeButton);

    bodyElement = document.createElement("div");
    bodyElement.className = "place-card__body";
    bodyElement.addEventListener("click", onBodyClick);

    statusElement = document.createElement("div");
    statusElement.className = "place-card__status";
    statusElement.setAttribute("role", "status");
    statusElement.setAttribute("aria-live", "polite");
    statusElement.setAttribute("aria-atomic", "true");

    const footer = document.createElement("footer");
    footer.className = "place-card__footer";

    navigateButton = document.createElement("button");
    navigateButton.type = "button";
    navigateButton.className = "place-card__navigate";
    navigateButton.textContent = "Navigera hit";
    navigateButton.addEventListener("click", () => {
      if (currentPlace) {
        flyToPlace(currentPlace);
      }
    });

    footer.append(navigateButton);
    panel.append(header, bodyElement, statusElement, footer);
    panel.addEventListener("keydown", onPanelKeyDown);
    panel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    map.getContainer().append(panel);
  };

  mount();

  const destroy = () => {
    abortController?.abort();
    panel?.removeEventListener("keydown", onPanelKeyDown);
    bodyElement?.removeEventListener("click", onBodyClick);
    panel?.remove();
    panel = null;
  };

  return {
    openAt,
    showPlace,
    close,
    flyToPlace,
    destroy,
    element: panel
  };
};

export const isWeatherLayerClick = (map, point) => {
  const features = map.queryRenderedFeatures(point, { layers: WEATHER_LAYER_IDS });
  return features.length > 0;
};

const IGNORED_CLICK_SELECTORS = [
  ".maplibregl-ctrl",
  ".place-card",
  ".map-search-control",
  ".weather-popup-container",
  ".weather-hover-container",
  ".landmark-popup-container"
].join(", ");

export const shouldIgnoreMapPlaceClick = (map, event) => {
  if (event.originalEvent.target.closest(IGNORED_CLICK_SELECTORS)) {
    return true;
  }

  return isWeatherLayerClick(map, event.point);
};
