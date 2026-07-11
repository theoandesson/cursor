const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderHighlightedName = (name, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return escapeHtml(name);
  }

  const lowerName = name.toLowerCase();
  const index = lowerName.indexOf(normalizedQuery);
  if (index === -1) {
    return escapeHtml(name);
  }

  const before = escapeHtml(name.slice(0, index));
  const match = escapeHtml(name.slice(index, index + normalizedQuery.length));
  const after = escapeHtml(name.slice(index + normalizedQuery.length));
  return `${before}<span class="search-result__highlight">${match}</span>${after}`;
};

export const createSearchResultItem = ({ city, query, onSelect }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "search-result";
  button.setAttribute("role", "option");
  button.dataset.cityId = city.id;

  const icon = document.createElement("span");
  icon.className = "search-result__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "📍";

  const body = document.createElement("span");
  body.className = "search-result__body";

  const name = document.createElement("span");
  name.className = "search-result__name";
  name.innerHTML = renderHighlightedName(city.name, query);

  const meta = document.createElement("span");
  meta.className = "search-result__meta";
  meta.textContent = city.county;

  body.append(name, meta);

  const coords = document.createElement("span");
  coords.className = "search-result__coords";
  coords.textContent = `${city.lat.toFixed(2)}°N`;

  button.append(icon, body, coords);

  const onClick = () => onSelect(city);
  button.addEventListener("click", onClick);

  return {
    element: button,
    destroy: () => button.removeEventListener("click", onClick)
  };
};
