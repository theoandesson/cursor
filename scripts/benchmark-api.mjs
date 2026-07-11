import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/startServer.js";
import { warmWeatherCache } from "../server/services/weatherWarmer.js";
import { resetMetrics } from "../server/services/perfMetricsService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDirectory = path.join(path.resolve(__dirname, ".."), "client");
const host = "127.0.0.1";
const port = 4201;
const base = `http://${host}:${port}`;

const timedFetch = async (label, url, init) => {
  const started = performance.now();
  const response = await fetch(url, init);
  const durationMs = performance.now() - started;
  const body = response.headers.get("content-type")?.includes("json")
    ? await response.json()
    : await response.text();
  return {
    label,
    url,
    status: response.status,
    ok: response.ok,
    durationMs: Math.round(durationMs * 100) / 100,
    responseTime: response.headers.get("x-response-time"),
    cacheStatus: response.headers.get("x-cache-status"),
    contentEncoding: response.headers.get("content-encoding"),
    cacheControl: response.headers.get("cache-control"),
    body
  };
};

const run = async () => {
  const results = [];
  const { server } = await startServer({ host, port, staticDirectory });

  try {
    resetMetrics();

    // Kall cache — ingen pre-warming
    results.push(await timedFetch("healthz", `${base}/healthz`));
    results.push(await timedFetch("api/healthz", `${base}/api/healthz`));
    results.push(await timedFetch("api/endpoints", `${base}/api/endpoints`));
    results.push(await timedFetch("api/cities", `${base}/api/cities?limit=5`));
    results.push(
      await timedFetch("api/bootstrap (KALL)", `${base}/api/bootstrap`)
    );
    results.push(
      await timedFetch("api/weather/point (KALL)", `${base}/api/weather/point?lon=18.0686&lat=59.3293`)
    );

    await warmWeatherCache({ forecastHours: 24 });

    resetMetrics();

    // Varm cache
    results.push(
      await timedFetch("api/bootstrap (VARM)", `${base}/api/bootstrap`)
    );
    results.push(
      await timedFetch("api/weather/cities (VARM)", `${base}/api/weather/cities?limit=10`)
    );
    results.push(
      await timedFetch("api/weather/point (VARM 1)", `${base}/api/weather/point?lon=18.0686&lat=59.3293`)
    );
    results.push(
      await timedFetch("api/weather/point (VARM 2)", `${base}/api/weather/point?lon=18.0686&lat=59.3293`)
    );
    results.push(
      await timedFetch("api/weather/cities/:cityId", `${base}/api/weather/cities/stockholm`)
    );
    results.push(await timedFetch("api/perf/summary", `${base}/api/perf/summary`));
    results.push(await timedFetch("index.html", `${base}/`));
    results.push(await timedFetch("main.js", `${base}/src/main.js`));
    results.push(await timedFetch("perfTracker.js", `${base}/src/perf/perfTracker.js`));
    results.push(await timedFetch("sw.js", `${base}/sw.js`));

    const perfSummary = (await fetch(`${base}/api/perf/summary`)).json();
    const bootstrapCold = results.find((r) => r.label.includes("bootstrap (KALL)"));
    const bootstrapWarm = results.find((r) => r.label.includes("bootstrap (VARM)"));
    const pointCold = results.find((r) => r.label.includes("point (KALL)"));
    const pointWarm2 = results.find((r) => r.label.includes("point (VARM 2)"));

    const report = {
      testedAt: new Date().toISOString(),
      endpoints: results.map(({ label, status, ok, durationMs, responseTime, cacheStatus, contentEncoding }) => ({
        label,
        status,
        ok,
        durationMs,
        responseTime,
        cacheStatus,
        gzip: contentEncoding === "gzip"
      })),
      bootstrap: {
        cold: {
          durationMs: bootstrapCold?.durationMs,
          cities: bootstrapCold?.body?.cities?.cities?.length ?? bootstrapCold?.body?.cities?.total,
          weatherCities: bootstrapCold?.body?.weather?.cities?.length,
          cacheAge: bootstrapCold?.body?.cacheAge,
          version: bootstrapCold?.body?.version
        },
        warm: {
          durationMs: bootstrapWarm?.durationMs,
          cacheStatus: bootstrapWarm?.cacheStatus,
          cacheAge: bootstrapWarm?.body?.cacheAge
        },
        speedup: bootstrapCold && bootstrapWarm
          ? `${Math.round((bootstrapCold.durationMs / bootstrapWarm.durationMs) * 10) / 10}x`
          : null
      },
      pointWeather: {
        coldMs: pointCold?.durationMs,
        cachedMs: pointWarm2?.durationMs,
        cacheStatus: pointWarm2?.cacheStatus
      },
      serverPerf: await perfSummary,
      gzipWorking: results.some((r) => r.contentEncoding === "gzip"),
      allOk: results.every((r) => r.ok)
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
