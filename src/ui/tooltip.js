let tooltipEl = null;

function getTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.getElementById('tooltip');
  }
  return tooltipEl;
}

export function showTooltip(event, station) {
  const el = getTooltip();
  if (!el) return;

  let html = `<strong>${station.name}</strong>`;
  if (station.temperature != null) {
    html += `<br>${station.temperature.toFixed(1)}°C`;
  }
  if (station.seaLevel != null) {
    html += `<br>Havsnivå: ${station.seaLevel.toFixed(1)} cm`;
  }
  el.innerHTML = html;
  el.style.display = 'block';

  const x = event.clientX + 16;
  const y = event.clientY - 10;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

export function hideTooltip() {
  const el = getTooltip();
  if (el) el.style.display = 'none';
}
