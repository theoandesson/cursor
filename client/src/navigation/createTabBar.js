import { ROUTES } from "./routes.js";

const TAB_LABELS = Object.freeze({
  [ROUTES.MAP]: "Karta",
  [ROUTES.CITIES]: "Städer",
  [ROUTES.PERF]: "Prestanda"
});

export const createTabBar = ({ container, routes, onNavigate, onHover }) => {
  if (!container) {
    throw new Error("createTabBar kräver en container.");
  }

  const tablist = document.createElement("div");
  tablist.className = "app-tab-bar";
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", "Huvudnavigering");

  const tabsByRoute = new Map();

  const setActive = (route) => {
    tabsByRoute.forEach((button, tabRoute) => {
      const isActive = tabRoute === route;
      button.dataset.active = isActive ? "true" : "false";
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });
  };

  routes.forEach((route, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "app-tab-bar__tab";
    button.id = `app-tab-${route}`;
    button.dataset.route = route;
    button.dataset.active = "false";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");
    button.setAttribute("aria-controls", `${route}-panel`);
    button.textContent = TAB_LABELS[route] ?? route;
    button.tabIndex = index === 0 ? 0 : -1;

    button.addEventListener("click", () => {
      onNavigate?.(route);
    });

    button.addEventListener("mouseenter", () => {
      onHover?.(route);
    });

    button.addEventListener("keydown", (event) => {
      const currentIndex = routes.indexOf(route);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (currentIndex + direction + routes.length) % routes.length;
        const nextRoute = routes[nextIndex];
        tabsByRoute.get(nextRoute)?.focus();
        onNavigate?.(nextRoute);
      }
    });

    tabsByRoute.set(route, button);
    tablist.appendChild(button);
  });

  container.appendChild(tablist);

  return {
    setActive,
    destroy: () => {
      tablist.remove();
    }
  };
};
