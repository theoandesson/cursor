import { createApp } from "./app/createApp.js";

export const startServer = async ({
  host,
  port,
  staticDirectory,
  onListening,
  onReady
}) => {
  const app = createApp({ staticDirectory });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, async () => {
      onListening?.();

      const readyContext = { app, server };
      if (onReady) {
        await onReady(readyContext);
      }

      resolve(readyContext);
    });

    server.on("error", (error) => {
      reject(error);
    });
  });
};
