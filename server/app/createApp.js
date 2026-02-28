import express from "express";
import path from "node:path";
import { createApiRouter } from "../routes/createApiRouter.js";

export const createApp = ({ staticDirectory }) => {
  const app = express();

  app.get("/healthz", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  app.use("/api", createApiRouter());

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
