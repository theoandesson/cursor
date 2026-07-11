import { createDebouncedAction } from "../map/lod/createDebouncedAction.js";
import { getWeatherSymbol } from "../weather/weatherSymbols.js";

const formatTemp = (weather) => {
  if (!weather || weather.temp == null) {
    return "—";
  }
  return `${Number(weather.temp).toFixed(1)}°C`;
};

export const createCitiesPanel = ({ onCitySelect, getCities }) => {
  let cities = [];
  let weatherMap = new Map();
  let filterQuery = "";
  let listState = { loading: false, error: null };

  const element = document.createElement("section");
  element.className = "app-panel app-panel--cities";

  element.innerHTML = `
    <header class="cities-panel__header">
      <h2 class="cities-panel__title">Städer</h2>
      <p class="cities-panel__subtitle">Välj en stad för att flyga kartan dit</p>
      <label class="cities-panel__search-label" for="cities-panel-search">Sök stad</label>
      <input
        id="cities-panel-search"
        class="cities-panel__search"
        type="search"
        placeholder="Sök stad…"
        autocomplete="off"
        spellcheck="false"
      />
    </header>
    <div class="cities-panel__list" data-virtual-scroll-root role="list" aria-label="Städer i Sverige"></div>
  `;

  const searchInput = element.querySelector("#cities-panel-search");
  const listRoot = element.querySelector(".cities-panel__list");

  const getFilteredCities = () => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return cities;
    }
    return cities.filter((city) =>
      (city.name ?? "").toLowerCase().includes(query)
    );
  };

  const renderList = () => {
    const filtered = getFilteredCities();
    listRoot.replaceChildren();

    if (listState.error) {
      const error = document.createElement("p");
      error.className = "cities-panel__error";
      error.textContent = listState.error;
      listRoot.appendChild(error);
      return;
    }

    if (listState.loading) {
      const loading = document.createElement("p");
      loading.className = "cities-panel__loading";
      loading.textContent = "Laddar städer…";
      listRoot.appendChild(loading);
      return;
    }

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "cities-panel__empty";
      empty.textContent =
        cities.length === 0
          ? "Inga städer tillgängliga."
          : "Inga städer matchar sökningen.";
      listRoot.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach((city) => {
      const weather = weatherMap.get(city.id);
      const symbol = weather ? getWeatherSymbol(weather.symbol) : null;

      const item = document.createElement("button");
      item.type = "button";
      item.className = "cities-panel__item";
      item.setAttribute("role", "listitem");
      item.dataset.cityId = String(city.id);

      const cityName = city.name ?? "Okänd stad";
      const tempLabel = formatTemp(weather);
      item.setAttribute(
        "aria-label",
        weather ? `${cityName}, ${tempLabel}` : cityName
      );

      const name = document.createElement("span");
      name.className = "cities-panel__name";
      name.textContent = cityName;

      const meta = document.createElement("span");
      meta.className = "cities-panel__meta";

      if (symbol?.icon) {
        const icon = document.createElement("span");
        icon.className = "cities-panel__icon";
        icon.textContent = symbol.icon;
        icon.setAttribute("aria-hidden", "true");
        meta.appendChild(icon);
      }

      const temp = document.createElement("span");
      temp.className = "cities-panel__temp";
      temp.textContent = formatTemp(weather);
      meta.appendChild(temp);

      item.append(name, meta);
      item.addEventListener("click", () => {
        onCitySelect?.(city);
      });

      fragment.appendChild(item);
    });

    listRoot.appendChild(fragment);
  };

  const debouncedFilter = createDebouncedAction(() => {
    renderList();
  }, 150);

  searchInput.addEventListener("input", (event) => {
    filterQuery = event.target.value;
    debouncedFilter();
  });

  return {
    element,
    updateCities: (nextCities, nextWeatherMap, { loading, error } = {}) => {
      cities = Array.isArray(nextCities) ? nextCities : [];
      weatherMap =
        nextWeatherMap instanceof Map
          ? nextWeatherMap
          : new Map(nextWeatherMap ?? []);
      if (loading !== undefined) {
        listState.loading = loading;
      }
      if (error !== undefined) {
        listState.error = error;
      }
      if (cities.length > 0 && listState.error == null) {
        listState.loading = false;
      }
      renderList();
    },
    destroy: () => {
      debouncedFilter.cancel?.();
      element.remove();
    },
    prefetch: () => {
      getCities?.();
    }
  };
};
