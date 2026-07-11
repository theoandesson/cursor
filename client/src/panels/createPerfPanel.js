import { createPerfDebugPanel } from "../perf/createPerfDebugPanel.js";

export const createPerfPanel = ({ perfTracker } = {}) => {
  const element = document.createElement("section");
  element.className = "app-panel app-panel--perf";

  element.innerHTML = `
    <header class="perf-panel__header">
      <h2 class="perf-panel__title">Prestanda</h2>
      <p class="perf-panel__subtitle">Tidslinje, API-anrop och servermätvärden</p>
    </header>
    <div class="perf-panel__content" data-perf-panel-content></div>
  `;

  const content = element.querySelector("[data-perf-panel-content]");
  let debugPanel = null;

  const mountPerfContent = () => {
    if (!perfTracker || debugPanel) {
      return debugPanel;
    }

    debugPanel = createPerfDebugPanel({ perfTracker, container: content });
    return debugPanel;
  };

  const ensureMounted = () => mountPerfContent();

  return {
    element,
    mountPerfContent,
    ensureMounted,
    refresh: () => {
      ensureMounted();
      debugPanel?.refresh();
    },
    destroy: () => {
      debugPanel?.destroy();
      element.remove();
    }
  };
};
