import { checkBudgets } from "./perfBudgets.js";

const formatMs = (value) => {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(1)} ms`;
};

const formatPercent = (value) => `${Math.round((value ?? 0) * 100)}%`;

const formatBytes = (bytes) => {
  if (bytes == null || !Number.isFinite(bytes)) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const durationClass = (ms) => {
  if (ms < 100) {
    return "perf-duration--fast";
  }
  if (ms < 500) {
    return "perf-duration--medium";
  }
  return "perf-duration--slow";
};

const createSection = (title) => {
  const section = document.createElement("section");
  section.className = "perf-debug__section";
  const heading = document.createElement("h3");
  heading.className = "perf-debug__section-title";
  heading.textContent = title;
  section.appendChild(heading);
  return section;
};

export const createPerfDebugPanel = ({ perfTracker, container }) => {
  const root = document.createElement("div");
  root.className = "perf-debug";
  container?.appendChild(root);

  let serverSummary = null;
  let refreshTimerId = null;
  let isVisible = true;

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "perf-debug__summary-grid";

  const budgetList = document.createElement("ul");
  budgetList.className = "perf-debug__budget-list";

  const waterfall = document.createElement("div");
  waterfall.className = "perf-debug__waterfall";

  const apiTable = document.createElement("table");
  apiTable.className = "perf-debug__table";
  apiTable.innerHTML = `
    <thead>
      <tr>
        <th>URL</th>
        <th>Duration</th>
        <th>Status</th>
        <th>Cache</th>
        <th>Size</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const measuresTable = document.createElement("table");
  measuresTable.className = "perf-debug__table";
  measuresTable.innerHTML = `
    <thead>
      <tr>
        <th>Measure</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const serverMetrics = document.createElement("div");
  serverMetrics.className = "perf-debug__server-metrics";

  const actions = document.createElement("div");
  actions.className = "perf-debug__actions";

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "perf-debug__button";
  refreshButton.textContent = "Uppdatera servermätvärden";

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "perf-debug__button";
  exportButton.textContent = "Exportera JSON";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "perf-debug__button perf-debug__button--danger";
  resetButton.textContent = "Återställ allt";

  actions.append(refreshButton, exportButton, resetButton);

  const summarySection = createSection("Sammanfattning");
  summarySection.append(summaryGrid, budgetList);

  const waterfallSection = createSection("Timeline");
  waterfallSection.appendChild(waterfall);

  const apiSection = createSection("API-anrop");
  apiSection.appendChild(apiTable);

  const measuresSection = createSection("Mätningar");
  measuresSection.appendChild(measuresTable);

  const serverSection = createSection("Servermätvärden");
  serverSection.append(serverMetrics, actions);

  root.append(summarySection, waterfallSection, apiSection, measuresSection, serverSection);

  const renderSummaryCards = (summary, timeline) => {
    summaryGrid.replaceChildren();

    const apiEntries = timeline.filter((entry) => entry.type === "api");
    const slowest = apiEntries.reduce(
      (current, entry) => (entry.durationMs > (current?.durationMs ?? 0) ? entry : current),
      null
    );

    const cards = [
      { label: "Total uppstart", value: formatMs(summary.totalBootMs) },
      { label: "API-anrop", value: String(summary.apiCalls.count) },
      { label: "Cache-träffar", value: formatPercent(summary.apiCalls.cacheHitRate) },
      {
        label: "Långsammaste anrop",
        value: slowest ? `${formatMs(slowest.durationMs)}` : "—",
        detail: slowest?.url ?? ""
      }
    ];

    cards.forEach((card) => {
      const element = document.createElement("article");
      element.className = "perf-debug__card";
      element.innerHTML = `
        <p class="perf-debug__card-label">${card.label}</p>
        <p class="perf-debug__card-value">${card.value}</p>
        ${card.detail ? `<p class="perf-debug__card-detail">${card.detail}</p>` : ""}
      `;
      summaryGrid.appendChild(element);
    });
  };

  const renderBudgets = (summary) => {
    budgetList.replaceChildren();
    checkBudgets(summary).forEach((budget) => {
      const item = document.createElement("li");
      item.className = `perf-debug__budget perf-debug__budget--${budget.passed ? "pass" : budget.severity}`;
      item.innerHTML = `
        <span class="perf-debug__budget-name">${budget.name}</span>
        <span class="perf-debug__budget-value">${formatMs(budget.actual)} / ${formatMs(budget.budget)}</span>
        <span class="perf-debug__budget-status">${budget.passed ? "PASS" : "FAIL"}</span>
      `;
      budgetList.appendChild(item);
    });
  };

  const renderWaterfall = (timeline) => {
    waterfall.replaceChildren();
    if (!timeline.length) {
      waterfall.textContent = "Inga tidslinjehändelser ännu.";
      return;
    }

    const start = timeline[0].time;
    const end = timeline[timeline.length - 1].time;
    const span = Math.max(end - start, 1);

    timeline.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "perf-debug__waterfall-row";

      const label = document.createElement("span");
      label.className = "perf-debug__waterfall-label";
      label.textContent =
        entry.type === "api"
          ? entry.url
          : entry.name ?? entry.type;

      const track = document.createElement("div");
      track.className = "perf-debug__waterfall-track";

      const bar = document.createElement("div");
      bar.className = `perf-debug__waterfall-bar perf-debug__waterfall-bar--${entry.type}`;
      const offset = ((entry.time - start) / span) * 100;
      const width =
        entry.type === "api" || entry.type === "measure"
          ? Math.max(((entry.durationMs ?? 8) / span) * 100, 2)
          : 2;
      bar.style.marginLeft = `${offset}%`;
      bar.style.width = `${width}%`;
      bar.title = entry.durationMs != null ? formatMs(entry.durationMs) : entry.type;

      if (entry.durationMs != null) {
        bar.classList.add(durationClass(entry.durationMs));
      }

      track.appendChild(bar);
      row.append(label, track);
      waterfall.appendChild(row);
    });
  };

  const renderApiTable = (timeline) => {
    const tbody = apiTable.querySelector("tbody");
    tbody.replaceChildren();

    timeline
      .filter((entry) => entry.type === "api")
      .forEach((entry) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="perf-debug__url" title="${entry.url}">${entry.url}</td>
          <td class="${durationClass(entry.durationMs)}">${formatMs(entry.durationMs)}</td>
          <td>${entry.status || "—"}</td>
          <td>${entry.cacheStatus ?? "NETWORK"}</td>
          <td>${formatBytes(entry.sizeBytes)}</td>
        `;
        tbody.appendChild(row);
      });
  };

  const renderMeasuresTable = (summary) => {
    const tbody = measuresTable.querySelector("tbody");
    tbody.replaceChildren();

    summary.measures.forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.name}</td>
        <td class="${durationClass(entry.durationMs)}">${formatMs(entry.durationMs)}</td>
      `;
      tbody.appendChild(row);
    });
  };

  const renderServerMetrics = () => {
    if (!serverSummary) {
      serverMetrics.innerHTML = `<p class="perf-debug__muted">Servermätvärden kunde inte laddas.</p>`;
      return;
    }

    serverMetrics.innerHTML = `
      <div class="perf-debug__server-grid">
        <article class="perf-debug__card">
          <p class="perf-debug__card-label">Förfrågningar</p>
          <p class="perf-debug__card-value">${serverSummary.totalRequests ?? serverSummary.count ?? 0}</p>
        </article>
        <article class="perf-debug__card">
          <p class="perf-debug__card-label">Server p50</p>
          <p class="perf-debug__card-value">${formatMs(serverSummary.p50Ms)}</p>
        </article>
        <article class="perf-debug__card">
          <p class="perf-debug__card-label">Server p95</p>
          <p class="perf-debug__card-value ${durationClass(serverSummary.p95Ms ?? 0)}">${formatMs(serverSummary.p95Ms)}</p>
        </article>
        <article class="perf-debug__card">
          <p class="perf-debug__card-label">Server cache-träffar</p>
          <p class="perf-debug__card-value">${formatPercent(serverSummary.cacheHitRate)}</p>
        </article>
      </div>
    `;
  };

  const fetchServerSummary = async () => {
    try {
      const response = await fetch("/api/perf/summary");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      serverSummary = await response.json();
    } catch {
      serverSummary = null;
    }
    renderServerMetrics();
  };

  const refresh = () => {
    const summary = perfTracker.getSummary();
    const timeline = perfTracker.getTimeline();
    renderSummaryCards(summary, timeline);
    renderBudgets(summary);
    renderWaterfall(timeline);
    renderApiTable(timeline);
    renderMeasuresTable(summary);
    renderServerMetrics();
  };

  const exportJson = () => {
    const blob = new Blob([perfTracker.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sweden-map-perf-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = async () => {
    perfTracker.reset();
    try {
      await fetch("/api/perf/reset", { method: "POST" });
    } catch {
      /* ignore reset failures */
    }
    refresh();
    fetchServerSummary();
  };

  const startAutoRefresh = () => {
    if (refreshTimerId) {
      return;
    }
    refreshTimerId = window.setInterval(() => {
      if (isVisible) {
        fetchServerSummary();
        refresh();
      }
    }, 10000);
  };

  const stopAutoRefresh = () => {
    if (refreshTimerId) {
      clearInterval(refreshTimerId);
      refreshTimerId = null;
    }
  };

  refreshButton.addEventListener("click", () => {
    fetchServerSummary();
    refresh();
  });
  exportButton.addEventListener("click", exportJson);
  resetButton.addEventListener("click", resetAll);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (isVisible) {
        refresh();
        fetchServerSummary();
      }
    },
    { threshold: 0.1 }
  );
  visibilityObserver.observe(root);

  refresh();
  fetchServerSummary();
  startAutoRefresh();

  return {
    element: root,
    refresh,
    destroy: () => {
      stopAutoRefresh();
      visibilityObserver.disconnect();
      root.remove();
    },
    setVisible: (visible) => {
      isVisible = visible;
      if (visible) {
        refresh();
        fetchServerSummary();
      }
    }
  };
};
