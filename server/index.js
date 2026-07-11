import { appConfig } from "./config/appConfig.js";
import { openLocalhost } from "./lib/openLocalhost.js";
import { startServer } from "./startServer.js";
import { isCacheWarm } from "./services/cityWeatherService.js";
import { startBackgroundRefresh, warmWeatherCache } from "./services/weatherWarmer.js";

const boot = async () => {
  const baseUrl = `http://${appConfig.host}:${appConfig.port}`;
  let stopBackgroundRefresh = null;

  await startServer({
    host: appConfig.host,
    port: appConfig.port,
    staticDirectory: appConfig.staticDirectory,
    onListening: () => {
      console.log(`Sverige 3D-karta startad: ${baseUrl}`);
      console.log("LOD: låg detalj vid rörelse, hög detalj i idle.");
    },
    onReady: async () => {
      try {
        await warmWeatherCache({ forecastHours: 24 });
        stopBackgroundRefresh = startBackgroundRefresh({ intervalMs: 5 * 60 * 1000 });
        console.log(
          `Vädercachestatus: ${isCacheWarm(24) ? "varm" : "kall"} (24h prognos).`
        );
      } catch (error) {
        console.error(
          "Kunde inte värma vädercachen vid start.",
          error instanceof Error ? error.message : error
        );
      }
    }
  });

  if (appConfig.autoOpenBrowser) {
    await openLocalhost(baseUrl);
  }

  const shutdown = () => {
    stopBackgroundRefresh?.();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

boot().catch((error) => {
  console.error("Kunde inte starta servern.", error);
  process.exitCode = 1;
});
