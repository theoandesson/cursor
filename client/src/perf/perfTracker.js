const percentile = (sorted, p) => {
  if (!sorted.length) {
    return 0;
  }
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

const captureNavigationTiming = () => {
  const [nav] = performance.getEntriesByType?.("navigation") ?? [];
  if (nav) {
    return {
      source: "PerformanceNavigationTiming",
      domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
      loadCompleteMs: nav.loadEventEnd - nav.startTime,
      dnsMs: nav.domainLookupEnd - nav.domainLookupStart,
      tcpMs: nav.connectEnd - nav.connectStart,
      ttfbMs: nav.responseStart - nav.requestStart,
      transferMs: nav.responseEnd - nav.responseStart,
      type: nav.type
    };
  }

  const timing = performance.timing;
  if (timing?.navigationStart) {
    const start = timing.navigationStart;
    return {
      source: "performance.timing",
      domContentLoadedMs: timing.domContentLoadedEventEnd - start,
      loadCompleteMs: timing.loadEventEnd - start,
      dnsMs: timing.domainLookupEnd - timing.domainLookupStart,
      tcpMs: timing.connectEnd - timing.connectStart,
      ttfbMs: timing.responseStart - timing.requestStart,
      transferMs: timing.responseEnd - timing.responseStart,
      type: "unknown"
    };
  }

  return null;
};

export const createPerfTracker = () => {
  const marks = [];
  const measures = [];
  const apiCalls = [];
  const milestones = [];
  const navigationTiming = captureNavigationTiming();
  const originTime = performance.now();

  const pushMark = (name, detail = null) => {
    const time = performance.now();
    try {
      performance.mark(name);
    } catch {
      /* ignore duplicate mark names */
    }
    marks.push({ type: "mark", name, detail, time });
    return time;
  };

  pushMark("tracker-init");

  const mark = (name, detail = null) => pushMark(name, detail);

  const measure = (name, startMark, endMark = null, detail = null) => {
    let durationMs = 0;
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
      const [entry] = performance.getEntriesByName(name, "measure").slice(-1);
      durationMs = entry?.duration ?? 0;
    } catch {
      const start = marks.find((entry) => entry.name === startMark)?.time;
      const end = endMark
        ? marks.find((entry) => entry.name === endMark)?.time
        : performance.now();
      if (start != null && end != null) {
        durationMs = end - start;
      }
    }

    const entry = {
      type: "measure",
      name,
      durationMs,
      detail,
      time: performance.now(),
      startMark,
      endMark
    };
    measures.push(entry);
    return entry;
  };

  const recordApiCall = ({ url, durationMs, status, cacheStatus, sizeBytes }) => {
    apiCalls.push({
      type: "api",
      url,
      durationMs,
      status,
      cacheStatus,
      sizeBytes: sizeBytes ?? null,
      time: performance.now()
    });
  };

  const recordMilestone = (name, detail = null) => {
    const time = performance.now();
    milestones.push({ type: "milestone", name, detail, time });
    mark(`milestone:${name}`, detail);
    return time;
  };

  const startSpan = (name) => {
    const spanId = `${name}-${performance.now()}`;
    const startMark = `${spanId}-start`;
    const endMark = `${spanId}-end`;
    const startedAt = performance.now();
    mark(startMark);

    return (detail = null) => {
      mark(endMark, detail);
      const durationMs = performance.now() - startedAt;
      measures.push({
        type: "measure",
        name,
        durationMs,
        detail,
        time: performance.now(),
        startMark,
        endMark
      });
      try {
        performance.measure(name, startMark, endMark);
      } catch {
        /* ignore measure errors */
      }
      return durationMs;
    };
  };

  const getTimeline = () =>
    [...marks, ...measures, ...milestones, ...apiCalls].sort(
      (left, right) => left.time - right.time
    );

  const getBootStartTime = () => {
    const mainStart = milestones.find((entry) => entry.name === "main-start");
    if (mainStart) {
      return mainStart.time;
    }
    const trackerInit = marks.find((entry) => entry.name === "tracker-init");
    return trackerInit?.time ?? originTime;
  };

  const getBootEndTime = () => {
    const overlayHidden = milestones.find((entry) => entry.name === "map-overlay-hidden");
    if (overlayHidden) {
      return overlayHidden.time;
    }
    const mapIdle = milestones.find((entry) => entry.name === "map-idle");
    if (mapIdle) {
      return mapIdle.time;
    }
    return performance.now();
  };

  const getSummary = () => {
    const durations = apiCalls.map((call) => call.durationMs).sort((a, b) => a - b);
    const cacheHits = apiCalls.filter((call) => call.cacheStatus === "HIT").length;

    return {
      milestones: milestones.map(({ name, detail, time }) => ({ name, detail, time })),
      apiCalls: {
        count: apiCalls.length,
        avgMs: durations.length
          ? durations.reduce((sum, value) => sum + value, 0) / durations.length
          : 0,
        p95Ms: percentile(durations, 95),
        cacheHitRate: apiCalls.length ? cacheHits / apiCalls.length : 0
      },
      measures: measures.map(({ name, durationMs }) => ({ name, durationMs })),
      totalBootMs: getBootEndTime() - getBootStartTime(),
      navigationTiming
    };
  };

  const getEntries = () => ({
    marks: [...marks],
    measures: [...measures],
    milestones: [...milestones],
    apiCalls: [...apiCalls],
    navigationTiming
  });

  const exportJson = () =>
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        summary: getSummary(),
        timeline: getTimeline(),
        entries: getEntries()
      },
      null,
      2
    );

  const reset = () => {
    marks.length = 0;
    measures.length = 0;
    apiCalls.length = 0;
    milestones.length = 0;
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch {
      /* ignore */
    }
    pushMark("tracker-init");
  };

  return {
    mark,
    measure,
    recordApiCall,
    recordMilestone,
    startSpan,
    getTimeline,
    getSummary,
    getEntries,
    exportJson,
    reset,
    navigationTiming
  };
};
