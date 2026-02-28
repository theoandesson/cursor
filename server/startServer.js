import { createApp } from "./app/createApp.js";

export const startServer = async ({
  host,
  port,
  staticDirectory,
  onListening
}) => {
  const app = createApp({ staticDirectory });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      onListening?.();
      resolve({ app, server });
    });

    server.on("error", (error) => {
      reject(error);
    });
  });
};
