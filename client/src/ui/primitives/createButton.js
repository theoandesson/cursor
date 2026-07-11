export const createButton = ({
  label,
  className = "ui-btn",
  variant,
  title,
  ariaLabel,
  onClick,
  disabled = false
}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (variant === "primary") {
    button.classList.add("ui-btn--primary");
  } else if (variant === "ghost") {
    button.classList.add("ui-btn--ghost");
  }
  button.textContent = label;
  if (title) {
    button.title = title;
  }
  button.setAttribute("aria-label", ariaLabel ?? title ?? label);
  button.disabled = disabled;
  if (onClick) {
    button.addEventListener("click", onClick);
  }
  return button;
};

export const createIconButton = ({
  label,
  title,
  ariaLabel,
  onClick,
  variant = "ghost"
}) => {
  const button = createButton({
    label,
    variant,
    title,
    ariaLabel,
    onClick
  });
  button.classList.add("ui-btn--icon");
  return button;
};
