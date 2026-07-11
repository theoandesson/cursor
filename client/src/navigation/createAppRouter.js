import { buildHash, parseHash } from "./routes.js";

const runWithViewTransition = (callback) => {
  if (typeof document.startViewTransition !== "function") {
    callback();
    return;
  }

  try {
    const transition = document.startViewTransition(() => {
      callback();
    });

    transition?.finished?.catch(() => {
      /* View transition avbröts – DOM-uppdateringen är redan klar. */
    });
  } catch {
    callback();
  }
};

export const createAppRouter = ({ onRouteChange, initialRoute }) => {
  let currentRoute = initialRoute ?? parseHash();
  let destroyed = false;

  const applyRoute = (route, meta = {}) => {
    if (destroyed || route === currentRoute) {
      return;
    }
    currentRoute = route;
    onRouteChange?.(route, meta);
  };

  const syncHash = (route) => {
    const hash = buildHash(route);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  };

  const navigate = (route) => {
    if (destroyed) {
      return;
    }

    const nextRoute = parseHash(buildHash(route));
    if (nextRoute === currentRoute && window.location.hash === buildHash(nextRoute)) {
      return;
    }

    runWithViewTransition(() => {
      currentRoute = nextRoute;
      syncHash(nextRoute);
      onRouteChange?.(nextRoute, { fromNavigate: true });
    });
  };

  const handleHashChange = () => {
    if (destroyed) {
      return;
    }

    const route = parseHash();
    if (route === currentRoute) {
      return;
    }

    runWithViewTransition(() => {
      applyRoute(route, { fromHashChange: true });
    });
  };

  const handlePopState = () => {
    if (destroyed) {
      return;
    }

    const route = parseHash();
    if (route === currentRoute) {
      return;
    }

    runWithViewTransition(() => {
      applyRoute(route, { fromPopstate: true });
    });
  };

  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("popstate", handlePopState);

  if (!window.location.hash) {
    window.history.replaceState(
      { route: currentRoute },
      "",
      `${window.location.pathname}${window.location.search}${buildHash(currentRoute)}`
    );
  } else {
    currentRoute = parseHash();
  }

  onRouteChange?.(currentRoute, { initial: true });

  return {
    navigate,
    getCurrentRoute: () => currentRoute,
    destroy: () => {
      destroyed = true;
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
    }
  };
};
