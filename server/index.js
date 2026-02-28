import { appConfig } from "./config/appConfig.js";
import { openLocalhost } from "./lib/openLocalhost.js";
import { startServer } from "./startServer.js";

const boot = async () => {
  const baseUrl = `http://${appConfig.host}:${appConfig.port}`;

  await startServer({
    host: appConfig.host,
    port: appConfig.port,
    staticDirectory: appConfig.staticDirectory,
    onListening: () => {
      console.log(`Sverige 3D-karta startad: ${baseUrl}`);
      console.log("LOD: låg detalj vid rörelse, hög detalj i idle.");
    }
  });

  if (appConfig.autoOpenBrowser) {
    await openLocalhost(baseUrl);
  }
};

boot().catch((error) => {
  console.error("Kunde inte starta servern.", error);
  process.exitCode = 1;
});
