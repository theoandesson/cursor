import express from "express";
import path from "node:path";
import { compressionSetup } from "../middleware/compressionSetup.js";
import { requestTiming } from "../middleware/requestTiming.js";
import { createApiRouter } from "../routes/createApiRouter.js";

const ASSET_EXTENSION_PATTERN = /\.[a-z0-9]+$/i;

export const createApp = ({ staticDirectory }) => {
  const app = express();

  app.use(compressionSetup);

  app.get("/healthz", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  app.use("/api", requestTiming, createApiRouter());

  app.use(
    express.static(staticDirectory, {
      extensions: ["html"],
      index: "index.html",
      maxAge: "1h",
      setHeaders(res, filePath) {
        if (filePath.endsWith("/sw.js")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    })
  );

  const indexFile = path.join(staticDirectory, "index.html");
  app.get(/.*/, (request, response) => {
    if (ASSET_EXTENSION_PATTERN.test(request.path)) {
      response.status(404).send("Not found");
      return;
    }

    response.sendFile(indexFile, (error) => {
      if (error) {
        response.status(500).send("Kunde inte ladda applikationen.");
      }
    });
  });

  app.use((error, _request, response, _next) => {
    console.error("Ohanterat serverfel:", error);
    if (response.headersSent) {
      return;
    }
    response.status(500).json({ error: "Internt serverfel." });
  });

  return app;
};
