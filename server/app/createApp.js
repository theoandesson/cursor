import express from "express";
import path from "node:path";
import { compressionSetup } from "../middleware/compressionSetup.js";
import { requestTiming } from "../middleware/requestTiming.js";
import { createApiRouter } from "../routes/createApiRouter.js";

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
      maxAge: "5m"
    })
  );

  const indexFile = path.join(staticDirectory, "index.html");
  app.get(/.*/, (_request, response) => {
    response.sendFile(indexFile);
  });

  return app;
};
