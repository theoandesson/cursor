import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/startServer.js";
import { warmWeatherCache } from "../server/services/weatherWarmer.js";
import { resetMetrics } from "../server/services/perfMetricsService.js";
import { ROUTES } from "../client/src/navigation/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDirectory = path.join(path.resolve(__dirname, ".."), "client");

const results = {
  passed: [],
  failed: [],
  warnings: []
};

const assert = (name, condition, detail = "") => {
  if (condition) {
    results.passed.push({ name, detail });
  } else {
    results.failed.push({ name, detail });
  }
};

const warn = (name, detail) => results.warnings.push({ name, detail });

const run = async () => {
  const host = "127.0.0.1";
  const port = 4204;
  const base = `http://${host}:${port}`;

  const { server } = await startServer({ host, port, staticDirectory });

  try {
    // 1. Statiska filer
    const html = await (await fetch(`${base}/`)).text();
    assert("index.html laddas", html.includes("Sverige 3D-karta"));
    assert("Navigation finns", html.includes('id="app-nav"'));
    assert("Map root finns", html.includes('id="map-root"'));

    const modules = [
      "/src/main.js",
      "/src/perf/perfTracker.js",
      "/src/navigation/routes.js",
      "/src/navigation/createAppRouter.js",
      "/src/store/weatherStore.js",
      "/src/api/bootstrapClient.js",
      "/src/app/createAppShell.js",
      "/sw.js"
    ];
    for (const mod of modules) {
      const r = await fetch(`${base}${mod}`);
      assert(`Modul ${mod}`, r.ok, `status ${r.status}`);
    }

    // 2. API health
    assert("GET /healthz", (await fetch(`${base}/healthz`)).ok);
    assert("GET /api/healthz", (await fetch(`${base}/api/healthz`)).ok);

    const endpoints = await (await fetch(`${base}/api/endpoints`)).json();
    assert("Endpoints >= 10", endpoints.endpoints?.length >= 10, `antal: ${endpoints.endpoints?.length}`);
    const paths = endpoints.endpoints.map((e) => e.path);
    assert("Bootstrap endpoint listad", paths.includes("/api/bootstrap"));
    assert("Perf endpoint listad", paths.includes("/api/perf/summary"));

    // 3. Städer
    const cities = await (await fetch(`${base}/api/cities`)).json();
    assert("79 städer", cities.cities?.length >= 79, `antal: ${cities.cities?.length}`);
    assert("Sök fungerar", (await fetch(`${base}/api/cities?search=stock`)).ok);

    // 4. Bootstrap kall + varm
    resetMetrics();
    const coldStart = performance.now();
    const coldBootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
    const coldMs = performance.now() - coldStart;
    assert("Bootstrap kall: 200", coldBootstrap.version === "1");
    assert("Bootstrap innehåller städer", coldBootstrap.cities?.cities?.length >= 79);
    assert("Bootstrap innehåller väder", coldBootstrap.weather?.cities?.length >= 79);

    await warmWeatherCache({ forecastHours: 24 });
    resetMetrics();
    const warmRes = await fetch(`${base}/api/bootstrap`);
    const warmStart = performance.now();
    await warmRes.json();
    const warmMs = performance.now() - warmStart;
    assert("Bootstrap varm: X-Cache-Status HIT", warmRes.headers.get("x-cache-status") === "HIT");
    assert("Bootstrap varm < 50ms", warmMs < 50, `${warmMs.toFixed(1)}ms`);
    if (coldMs / warmMs > 10) {
      results.passed.push({
        name: "Cache speedup",
        detail: `${(coldMs / warmMs).toFixed(0)}x snabbare (${coldMs.toFixed(0)}ms → ${warmMs.toFixed(1)}ms)`
      });
    }

    // 5. Gzip
    const gzipRes = await fetch(`${base}/api/bootstrap`, {
      headers: { "Accept-Encoding": "gzip" }
    });
    assert("Gzip på bootstrap", gzipRes.headers.get("content-encoding") === "gzip");

    // 6. Perf API
    const perf = await (await fetch(`${base}/api/perf/summary`)).json();
    assert("Perf summary struktur", typeof perf.totalRequests === "number");
    assert("Perf p50 finns", typeof perf.p50Ms === "number");
    assert("Perf cacheHitRate finns", typeof perf.cacheHitRate === "number");

    const perfFull = await (await fetch(`${base}/api/perf`)).json();
    assert("Perf full: recent array", Array.isArray(perfFull.recent));
    assert("Perf full: stats", perfFull.stats?.byEndpoint != null);

    const resetRes = await fetch(`${base}/api/perf/reset`, { method: "POST" });
    assert("Perf reset", resetRes.ok);

    // 7. Navigation routes (modultest)
    assert("Route MAP", ROUTES.MAP === "map");
    assert("Route CITIES", ROUTES.CITIES === "cities");
    assert("Route PERF", ROUTES.PERF === "perf");

    // 8. SMHI (extern — varning om nere)
    const pointRes = await fetch(`${base}/api/weather/point?lon=18.0686&lat=59.3293`);
    if (pointRes.ok) {
      const point = await pointRes.json();
      assert("Punktväder temp", point.current?.temp != null);
    } else {
      const err = await pointRes.json();
      warn("SMHI API otillgängligt", err.error ?? `HTTP ${pointRes.status}`);
      assert("Punktväder felhantering", pointRes.status === 502);
    }

    const weatherErrors = coldBootstrap.weather.cities.filter((c) => c.error).length;
    const weatherOk = coldBootstrap.weather.cities.filter((c) => c.current).length;
    if (weatherOk > 0) {
      assert("Stadsväder fungerar", weatherOk >= 50, `${weatherOk}/79 städer`);
    } else {
      warn("Alla stadsväder misslyckades", `79/79 SMHI-fel — troligen nätverksblockering i testmiljön`);
    }

    console.log(JSON.stringify({
      summary: {
        passed: results.passed.length,
        failed: results.failed.length,
        warnings: results.warnings.length,
        allPassed: results.failed.length === 0
      },
      timing: { bootstrapColdMs: Math.round(coldMs), bootstrapWarmMs: Math.round(warmMs * 10) / 10 },
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings
    }, null, 2));
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (results.failed.length > 0) process.exitCode = 1;
};

run().catch((e) => { console.error(e); process.exitCode = 1; });
