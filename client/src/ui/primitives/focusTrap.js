export const createFocusTrap = ({ container, onEscape }) => {
  const getFocusable = () =>
    Array.from(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      onEscape?.();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusable();
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

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

  const activate = () => {
    document.addEventListener("keydown", onKeyDown);
    const [first] = getFocusable();
    first?.focus();
  };

  const deactivate = () => {
    document.removeEventListener("keydown", onKeyDown);
  };

  return { activate, deactivate };
};
