import { createIconButton } from "../primitives/createButton.js";
import { createMenu } from "../primitives/createMenu.js";
import { flyToSwedenOverview } from "../search/flyToCity.js";

export const createAppMenu = ({
  map,
  onToast,
  onToggleLayerPanel,
  isLayerPanelOpen,
  onToggleNavExpanded,
  isNavExpanded
}) => {
  const anchor = document.createElement("div");
  anchor.className = "app-menu-anchor";

  let menu = null;

  const closeMenu = () => {
    menu?.destroy();
    menu = null;
  };

  const openMenu = () => {
    closeMenu();

    menu = createMenu({
      onClose: closeMenu,
      items: [
        { type: "label", label: "Karta" },
        {
          label: "Sverige-översikt",
          onSelect: () => {
            flyToSwedenOverview(map);
            onToast?.("Återgår till Sverige-översikt", { variant: "success", duration: 2000 });
          }
        },
        {
          label: "Lager",
          checked: isLayerPanelOpen(),
          onSelect: onToggleLayerPanel,
          closeOnSelect: false
        },
        { type: "divider" },
        { type: "label", label: "Navigering" },
        {
          label: isNavExpanded() ? "Dölj utökad navigering" : "Visa utökad navigering",
          checked: isNavExpanded(),
          onSelect: onToggleNavExpanded,
          closeOnSelect: false
        },
        { type: "divider" },
        { type: "label", label: "Hjälp" },
        {
          label: "Tangentbord: / för sök",
          onSelect: () => onToast?.("Tryck / för att öppna sök", { duration: 2500 })
        }
      ]
    });

    anchor.appendChild(menu.element);
    menu.open();
  };

  const trigger = createIconButton({
    label: "☰",
    title: "Meny",
    ariaLabel: "Öppna meny",
    onClick: (event) => {
      event.stopPropagation();
      if (menu) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  });

  anchor.appendChild(trigger);

  const onDocumentClick = (event) => {
    if (menu && !anchor.contains(event.target)) {
      closeMenu();
    }
  };

  document.addEventListener("click", onDocumentClick);

  const destroy = () => {
    closeMenu();
    document.removeEventListener("click", onDocumentClick);
    anchor.remove();
  };

  return { element: anchor, destroy, close: closeMenu };
};
