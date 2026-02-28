import express from "express";
import path from "node:path";

export const createApp = ({ staticDirectory }) => {
  const app = express();

  app.get("/healthz", (_request, response) => {
    response.status(200).json({ ok: true });
  });

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
