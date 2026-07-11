import { createFocusTrap } from "./focusTrap.js";

export const createMenu = ({ items, onClose }) => {
  const menu = document.createElement("div");
  menu.className = "ui-menu app-menu-panel";
  menu.setAttribute("role", "menu");

  const listeners = [];

  const close = () => {
    onClose?.();
  };

  const trap = createFocusTrap({
    container: menu,
    onEscape: close
  });

  items.forEach((item) => {
    if (item.type === "divider") {
      const divider = document.createElement("div");
      divider.className = "ui-menu__divider";
      divider.setAttribute("role", "separator");
      menu.appendChild(divider);
      return;
    }

    if (item.type === "label") {
      const label = document.createElement("p");
      label.className = "ui-menu__label";
      label.textContent = item.label;
      menu.appendChild(label);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-menu__item";
    button.setAttribute("role", "menuitem");
    button.textContent = item.label;
    if (item.checked !== undefined) {
      button.setAttribute("aria-checked", String(item.checked));
    }
    if (item.title) {
      button.title = item.title;
    }

    const onClick = (event) => {
      event.preventDefault();
      item.onSelect?.();
      if (item.closeOnSelect !== false) {
        close();
      }
    };
    button.addEventListener("click", onClick);
    listeners.push(() => button.removeEventListener("click", onClick));
    menu.appendChild(button);
  });

  const open = () => {
    trap.activate();
  };

  const destroy = () => {
    trap.deactivate();
    listeners.forEach((release) => release());
    menu.remove();
  };

  return { element: menu, open, destroy, close };
};
