export const createListKeyboardNav = ({
  getItems,
  onSelect,
  onEscape
}) => {
  let activeIndex = -1;

  const setActiveIndex = (nextIndex) => {
    const items = getItems();
    if (items.length === 0) {
      activeIndex = -1;
      return;
    }

    activeIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
    items.forEach((item, index) => {
      item.classList.toggle("search-result--active", index === activeIndex);
      if (index === activeIndex) {
        item.setAttribute("aria-selected", "true");
      } else {
        item.removeAttribute("aria-selected");
      }
    });
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  };

  const reset = () => {
    activeIndex = -1;
    getItems().forEach((item) => {
      item.classList.remove("search-result--active");
      item.removeAttribute("aria-selected");
    });
  };

  const onKeyDown = (event) => {
    const items = getItems();

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(activeIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      onSelect(items[activeIndex], activeIndex);
      return;
    }

    if (event.key === "Escape") {
      onEscape?.();
    }
  };

  return { onKeyDown, reset, setActiveIndex };
};
