// server/index.ts
import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "node:path";
import fs from "node:fs";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "node:http";

import { env } from "./env";
import { setupVite, serveStatic, log } from "./vite";

import catalogRouter from "./routes/catalog";
import checkoutRouter from "./routes/checkout";
import vendorsRouter from "./routes/vendors";
import vendorRequestsRouter from "./routes/vendor-requests"; // compat for older UI
import adminRouter from "./routes/admin"; // exposes /api/admin/vendors/* and /api/vendors/:id/approval

const app = express();

// Basic hardening + body parsing
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// CORS (allow list via CORS_ORIGINS="http://localhost:5173,https://example.com")
const corsEnv =
  // support both optional env schema field and raw process env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((env as any).CORS_ORIGINS as string | undefined) ??
  process.env.CORS_ORIGINS ??
  "";
const corsOrigins = corsEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  }),
);

// Helmet (basic)
app.use(helmet());

// Tiny API logger
app.use("/api", (req, res, next) => {
  const t = Date.now();
  res.on("finish", () => {
    log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${Date.now() - t}ms`);
  });
  next();
});

// Health
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// API routes
app.use("/api", catalogRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/vendor-requests", vendorRequestsRouter); // compat path for Admin
app.use("/api", adminRouter); // also exposes /api/vendors/:id/approval

// 404 for API
app.use("/api", (_req, res) => res.status(404).json({ message: "Not Found" }));

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const anyErr = err as { status?: number; statusCode?: number; message?: string };
  const status = Number(anyErr?.status || anyErr?.statusCode || 500);
  const message = String(anyErr?.message || "Internal Server Error");
  try {
    // eslint-disable-next-line no-console
    console.error(err);
  } catch {}
  res.status(status).json({ message });
});

// Bootstrap HTTP server + dev/prod asset handling
(async () => {
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);

    // SPA fallback for non-/api routes
    const indexFile = path.resolve(process.cwd(), "dist/public/index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
      return next();
    });
  }

  const port = Number(env.PORT || 5000);
  // On Windows some Node setups can throw ENOTSUP with 0.0.0.0 + reusePort.
  // Bind to localhost by default; allow override via HOST if you need to expose.
  const host = process.env.HOST || "127.0.0.1";

  // Simple, compatible listen (no reusePort)
  server.listen(port, host, () => {
    log(`API listening on http://${host}:${port}`);
    if (!corsOrigins.length) {
      log("CORS: * (all origins) — set CORS_ORIGINS to restrict");
    } else {
      log(`CORS allow list: ${corsOrigins.join(", ")}`);
    }
  });

  // Optional: surface unhandled errors during development
  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("Unhandled Rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    // eslint-disable-next-line no-console
    console.error("Uncaught Exception:", err);
  });
})();
