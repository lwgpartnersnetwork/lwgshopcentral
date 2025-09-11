// server/index.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db"; // ensures DB is initialized (Neon + Drizzle)

const app = express();

// Basic hardening / parsing
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

/**
 * Slim API request logger (only logs /api/*). Keeps body preview short.
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json.bind(res);
  res.json = ((bodyJson: unknown, ...args: any[]) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  }) as any;

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    const ms = Date.now() - start;
    let line = `${req.method} ${path} ${res.statusCode} in ${ms}ms`;
    if (capturedJsonResponse !== undefined) {
      const preview = JSON.stringify(capturedJsonResponse);
      line += ` :: ${preview}`;
    }
    if (line.length > 80) line = line.slice(0, 79) + "…";
    log(line);
  });

  next();
});

/**
 * Lightweight health endpoint. If DB init fails on boot, import above would throw.
 * You can expand this to run a tiny query if you like.
 */
app.get("/api/health", (_req: Request, res: Response) => {
  // touch db so TS doesn’t tree-shake import in some setups
  void db;
  res.json({ status: "ok" });
});

(async () => {
  // Register your API routes (this should return a Node/HTTP server)
  const server = await registerRoutes(app);

  // Centralized error handler (send safe message to client)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // Also surface in logs for debugging
    try {
      // eslint-disable-next-line no-console
      console.error(err);
    } catch {}
  });

  // In dev, mount Vite after all API routes; in prod, serve built client
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Always use PORT provided by env (Replit uses this). Default 5000 locally.
  const port = Number(process.env.PORT || 5000);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
