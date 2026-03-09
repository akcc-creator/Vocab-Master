import express from "express";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Mount the API routes
  app.use(apiApp);

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });

  app.use(vite.middlewares);

  // MUST bind to 0.0.0.0 for the preview to work
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});