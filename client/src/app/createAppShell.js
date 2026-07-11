import { createAppRouter } from "../navigation/createAppRouter.js";
import { ROUTES, parseHash } from "../navigation/routes.js";
import { createNavRevealController } from "../navigation/createNavRevealController.js";
import { createTabBar } from "../navigation/createTabBar.js";
import { createCitiesPanel } from "../panels/createCitiesPanel.js";
import { createPanelHost } from "../panels/createPanelHost.js";
import { fetchBootstrap } from "../api/bootstrapClient.js";
import { extractBootstrapParts } from "../weather/applyCityWeather.js";

const ROUTE_ORDER = [ROUTES.MAP, ROUTES.CITIES, ROUTES.PERF];

const buildWeatherMap = (cityWeather) => {
  const weatherMap = new Map();
  cityWeather.forEach((entry) => {
    const cityId = entry.city?.id;
    if (cityId && entry.current) {
      weatherMap.set(cityId, entry.current);
    }
  });
  return weatherMap;
};

export const createAppShell = ({ mapRootElement, perfTracker, fetchFn = fetch }) => {
  const panelHost = createPanelHost({ mapRootElement });

  // Stub placeholder stays in DOM; real content is injected lazily on first PERF visit
  const perfPanelStub = document.createElement("section");
  perfPanelStub.className = "app-panel app-panel--perf";

  let perfPanel = null;
  let perfPanelModulePromise = null;

  const prefetchPerfPanel = () => {
    if (!perfPanelModulePromise) {
      perfPanelModulePromise = import("../panels/createPerfPanel.js");
    }
    return perfPanelModulePromise;
  };

  const ensurePerfPanel = async () => {
    if (perfPanel) {
      return perfPanel;
    }
    const { createPerfPanel } = await prefetchPerfPanel();
    if (!perfPanel) {
      perfPanel = createPerfPanel({ perfTracker });
      // Transplant content into the already-mounted stub so panelHost reference stays valid
      while (perfPanel.element.firstChild) {
        perfPanelStub.appendChild(perfPanel.element.firstChild);
      }
    }
    return perfPanel;
  };

  let citiesCache = [];
  let weatherCache = new Map();
  let citiesPrefetchPromise = null;

  const prefetchCitiesData = () => {
    if (citiesCache.length > 0 || citiesPrefetchPromise) {
      return citiesPrefetchPromise;
    }

    citiesPrefetchPromise = fetchBootstrap({ fetchFn })
      .then((bootstrapData) => {
        const { cities, weatherEntries } = extractBootstrapParts(bootstrapData);
        citiesCache = cities;
        weatherCache = buildWeatherMap(weatherEntries);
        citiesPanel.updateCities(citiesCache, weatherCache);
      })
      .catch(() => {
        citiesPrefetchPromise = null;
      });

    return citiesPrefetchPromise;
  };

  const citiesPanel = createCitiesPanel({
    getCities: () => citiesCache,
    onCitySelect: (city) => {
      mapRootElement.dispatchEvent(
        new CustomEvent("city:select", {
          detail: { city },
          bubbles: true
        })
      );
      router.navigate(ROUTES.MAP);
    }
  });

  panelHost.mountPanel(ROUTES.CITIES, citiesPanel.element);
  panelHost.mountPanel(ROUTES.PERF, perfPanelStub);

  let router;

  const handleRouteChange = (route, meta = {}) => {
    const endPanelSwitch = meta.initial ? null : perfTracker?.startSpan("panel-switch");

    panelHost.showPanel(route);
    tabBar.setActive(route);
    navReveal.syncWithRoute(route);

    if (route === ROUTES.PERF) {
      ensurePerfPanel().then((panel) => panel.refresh());
    }

    if (endPanelSwitch) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => endPanelSwitch());
      });
    }
  };

  const shellElement = document.getElementById("app-shell");
  const topBarElement = document.getElementById("top-bar");
  const navContainer =
    document.getElementById("app-nav") ?? topBarElement;

  const navReveal = createNavRevealController({
    shellElement,
    topBarElement,
    getRoute: () => router?.getCurrentRoute?.() ?? parseHash()
  });

  const tabBar = createTabBar({
    container: navContainer,
    routes: ROUTE_ORDER,
    onNavigate: (route) => {
      router.navigate(route);
    },
    onHover: (route) => {
      if (route === ROUTES.CITIES) {
        prefetchCitiesData();
      }
      if (route === ROUTES.PERF) {
        prefetchPerfPanel();
      }
    }
  });

  router = createAppRouter({
    initialRoute: parseHash(),
    onRouteChange: handleRouteChange
  });

  return {
    router,
    tabBar,
    navReveal,
    panelHost,
    setCitiesData: (cities, weatherMap) => {
      citiesCache = Array.isArray(cities) ? cities : [];
      weatherCache =
        weatherMap instanceof Map ? weatherMap : new Map(weatherMap ?? []);
      citiesPanel.updateCities(citiesCache, weatherCache);
    },
    setPerfContent: () => {
      ensurePerfPanel();
    },
    destroy: () => {
      router.destroy();
      navReveal.destroy();
      tabBar.destroy();
      citiesPanel.destroy();
      perfPanel?.destroy();
    }
  };
};
