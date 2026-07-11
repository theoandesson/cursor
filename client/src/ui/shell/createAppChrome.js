import { createAppMenu } from "../menus/createAppMenu.js";
import { createLayerPanel } from "../menus/createLayerPanel.js";
import { createSearchBar } from "../search/createSearchBar.js";

export const createAppChrome = ({ map, navControl, toast }) => {
  const searchMount = document.getElementById("search-mount");
  const chromeLeft = document.getElementById("app-chrome-left");

  if (!searchMount || !chromeLeft) {
    throw new Error("App-chrome saknar #search-mount eller #app-chrome-left.");
  }

  const showToast = (message, options) => toast.show(message, options);

  const searchBar = createSearchBar({ map, onToast: showToast });
  searchMount.appendChild(searchBar.element);

  let layerPanel = null;

  const ensureLayerPanel = () => {
    if (!layerPanel) {
      layerPanel = createLayerPanel({ map, onToast: showToast });
    }
    return layerPanel;
  };

  const appMenu = createAppMenu({
    map,
    onToast: showToast,
    onToggleLayerPanel: () => {
      const panel = ensureLayerPanel();
      panel.toggle();
    },
    isLayerPanelOpen: () => layerPanel?.isOpen() ?? false,
    onToggleNavExpanded: () => {
      if (navControl?.setExpanded) {
        navControl.setExpanded(!navControl.isExpanded());
      }
    },
    isNavExpanded: () => navControl?.isExpanded?.() ?? false
  });

  chromeLeft.prepend(appMenu.element);

  const initLayerPanel = () => ensureLayerPanel();

  if (map.loaded()) {
    initLayerPanel();
  } else {
    map.once("load", initLayerPanel);
  }

  const destroy = () => {
    searchBar.destroy();
    appMenu.destroy();
    layerPanel?.destroy();
    toast.destroy();
  };

  return { searchBar, appMenu, showToast, destroy };
};
