import { fetchWeatherAtPoint } from "../weather/smhiWeatherService.js";
import { getWeatherSymbol, getWindDirection } from "../weather/weatherSymbols.js";
import { getPlaceCategoryMeta, getPoiCategoryMeta } from "./poiCategories.js";
import {
  fetchPoisNear,
  fetchReverseGeocode,
  normalizePlace
} from "./placeService.js";

const WEATHER_LAYER_IDS = ["city-weather-circles", "city-weather-labels"];
const NAVIGATE_FLY_DURATION_MS = 1400;
const DEFAULT_NAVIGATE_ZOOM = 15;
const NEARBY_POI_LIMIT = 8;
const NEARBY_POI_RADIUS_KM = 3;

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

const buildWeatherHtml = (weather) => {
  if (!weather?.current) {
    return `<p class="place-card__weather-unavailable">Ingen väderdata tillgänglig.</p>`;
  }

  const sym = getWeatherSymbol(weather.current.symbol);
  const windDir = getWindDirection(weather.current.windDir);

  return `
    <div class="place-card__weather-current">
      <span class="place-card__weather-icon">${sym.icon}</span>
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
      return `
        <li>
          <button
            type="button"
            class="place-card__poi-item"
            data-poi-id="${poi.id}"
            data-poi-lon="${poi.lon}"
            data-poi-lat="${poi.lat}"
            data-poi-category="${poi.category}"
            data-poi-name="${poi.name.replace(/"/g, "&quot;")}"
            data-poi-address="${(poi.address ?? "").replace(/"/g, "&quot;")}"
          >
            <span class="place-card__poi-icon" aria-hidden="true">${meta.icon}</span>
            <span>
              <p class="place-card__poi-name">${poi.name}</p>
              <p class="place-card__poi-meta">${meta.label}</p>
            </span>
            <span class="place-card__poi-distance">${formatDistance(poi.distanceKm)}</span>
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
  let navigateButton = null;
  let abortController = null;
  let currentPlace = null;
  let lastOpenRequest = null;

  const setOpen = (isOpen) => {
    panel?.classList.toggle("place-card--open", isOpen);
    panel?.setAttribute("aria-hidden", String(!isOpen));
  };

  const renderLoading = () => {
    if (!bodyElement) {
      return;
    }

    bodyElement.innerHTML = `<p class="place-card__loading">Hämtar platsinformation…</p>`;
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

    bodyElement.querySelectorAll("[data-poi-id]").forEach((button) => {
      button.addEventListener("click", () => {
        showPlace({
          id: button.dataset.poiId,
          name: button.dataset.poiName ?? "Plats",
          lon: Number(button.dataset.poiLon),
          lat: Number(button.dataset.poiLat),
          category: button.dataset.poiCategory ?? "place",
          categoryName: getPoiCategoryMeta(button.dataset.poiCategory).label,
          address: button.dataset.poiAddress ?? ""
        });
      });
    });
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

  const loadPlaceDetails = async (place, { reverseLookup = false } = {}) => {
    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;
    const requestId = Symbol("place-request");
    lastOpenRequest = requestId;

    currentPlace = place;
    setOpen(true);
    updateHeader(place);
    renderLoading();

    try {
      const [resolvedPlace, weather, nearbyPois] = await Promise.all([
        reverseLookup
          ? fetchReverseGeocode(place.lon, place.lat, { signal })
          : Promise.resolve(place),
        fetchWeatherAtPoint(place.lon, place.lat).catch(() => null),
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
        () => loadPlaceDetails(place, { reverseLookup })
      );
    }
  };

  const openAt = (lngLat) => {
    const lon = Number(lngLat.lng ?? lngLat.lon);
    const lat = Number(lngLat.lat);
    loadPlaceDetails(
      normalizePlace({ name: "Vald plats" }, lon, lat),
      { reverseLookup: true }
    );
  };

  const showPlace = (place) => {
    loadPlaceDetails(normalizePlace(place, place.lon, place.lat));
  };

  const close = () => {
    abortController?.abort();
    lastOpenRequest = null;
    currentPlace = null;
    setOpen(false);
  };

  const mount = () => {
    panel = document.createElement("aside");
    panel.className = "place-card";
    panel.setAttribute("aria-label", "Platsdetaljer");
    panel.setAttribute("aria-hidden", "true");

    const header = document.createElement("header");
    header.className = "place-card__header";

    headerIcon = document.createElement("span");
    headerIcon.className = "place-card__category-icon";
    headerIcon.setAttribute("aria-hidden", "true");

    const titleBlock = document.createElement("div");
    titleBlock.className = "place-card__title-block";

    nameElement = document.createElement("h2");
    nameElement.className = "place-card__name";

    categoryElement = document.createElement("p");
    categoryElement.className = "place-card__category-label";

    addressElement = document.createElement("p");
    addressElement.className = "place-card__address";

    titleBlock.append(nameElement, categoryElement, addressElement);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "place-card__close";
    closeButton.setAttribute("aria-label", "Stäng platskort");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", close);

    header.append(headerIcon, titleBlock, closeButton);

    bodyElement = document.createElement("div");
    bodyElement.className = "place-card__body";

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
    panel.append(header, bodyElement, footer);
    map.getContainer().append(panel);

    panel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  };

  mount();

  return {
    openAt,
    showPlace,
    close,
    flyToPlace,
    element: panel
  };
};

export const isWeatherLayerClick = (map, point) => {
  const features = map.queryRenderedFeatures(point, { layers: WEATHER_LAYER_IDS });
  return features.length > 0;
};

export const shouldIgnoreMapPlaceClick = (map, event) => {
  if (event.originalEvent.target.closest(".maplibregl-ctrl, .place-card, .map-search-control")) {
    return true;
  }

  return isWeatherLayerClick(map, event.point);
};
