// server/index.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "node:path";
import fs from "node:fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db"; // ensure DB init happens

const app = express();

// Basic hardening / parsing
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

/**
 * Tiny API logger (only for /api/*).
 * Shows status + duration + a short preview of JSON response.
 */
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();

  const started = Date.now();
  const originalJson = res.json.bind(res);
  let captured: unknown;

  // capture JSON body
  (res as any).json = (payload: unknown, ...rest: any[]) => {
    captured = payload;
    return originalJson(payload, ...rest);
  };

  res.on("finish", () => {
    const ms = Date.now() - started;
    let line = `${req.method} ${req.originalUrl} ${res.statusCode} in ${ms}ms`;

    if (captured !== undefined) {
      try {
        let preview = JSON.stringify(captured);
        if (preview.length > 150) preview = preview.slice(0, 147) + "…";
        if (preview) line += ` :: ${preview}`;
      } catch {
        // ignore preview errors
      }
    }
    log(line);
  });

  next();
});

/**
 * Health. If DB import failed, the process would have crashed already.
 * You can add a trivial SELECT ping here if you ever need to.
 */
app.get("/api/health", (_req: Request, res: Response) => {
  void db; // touches the import to prevent tree-shaking in some bundlers
  res.json({ status: "ok" });
});

(async () => {
  // Attach all API routes; our register returns the HTTP server instance
  const server = await registerRoutes(app);

  // JSON 404 for unknown API routes (before static handling)
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "Not Found" }),
  );

  // Centralized API error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = Number(err?.status || err?.statusCode || 500);
    const message = String(err?.message || "Internal Server Error");
    try {
      // eslint-disable-next-line no-console
      console.error(err);
    } catch {}
    res.status(status).json({ message });
  });

  // Frontend: Vite in dev, static build in prod
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // serve built assets from dist/public
    serveStatic(app);

    // Safety SPA fallback: send index.html for any non-/api route.
    // This guarantees deep links like /categories /support /become-vendor work.
    const indexFile = path.resolve(process.cwd(), "dist/public/index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
      return next();
    });
  }

  // Use platform PORT, default 5000 locally
  const port = Number(process.env.PORT || 5000);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
