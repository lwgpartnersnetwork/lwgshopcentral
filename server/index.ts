// server/index.ts
import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
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

/* -----------------------------------------------------------------------------
   App
----------------------------------------------------------------------------- */
const app = express();

/** Basic hardening + body parsing */
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

/* -----------------------------------------------------------------------------
   CORS (allow-list)
   - CORS_ORIGINS="https://www.example.com,https://example.com"
   - or WEB_ORIGIN_1..WEB_ORIGIN_5 individually
   If none are set, allow all (useful while bootstrapping).
----------------------------------------------------------------------------- */
const rawOrigins: string[] = [
  // support both env schema and raw process env
  ((env as unknown as { CORS_ORIGINS?: string }).CORS_ORIGINS ?? process.env.CORS_ORIGINS ?? ""),
  process.env.WEB_ORIGIN_1 ?? "",
  process.env.WEB_ORIGIN_2 ?? "",
  process.env.WEB_ORIGIN_3 ?? "",
  process.env.WEB_ORIGIN_4 ?? "",
  process.env.WEB_ORIGIN_5 ?? "",
];

const corsOrigins = rawOrigins
  .flatMap((s) => s.split(",")) // support CSV in CORS_ORIGINS
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    // If no allow-list provided -> allow all (easy onboarding).
    origin(origin, cb) {
      if (!origin) return cb(null, true); // non-browser clients (curl/postman)
      if (corsOrigins.length === 0) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

/** Helmet base protections */
app.use(helmet());

/** Tiny API logger */
app.use("/api", (req, res, next) => {
  const t = Date.now();
  res.on("finish", () => {
    log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${Date.now() - t}ms`);
  });
  next();
});

/* -----------------------------------------------------------------------------
   Health
----------------------------------------------------------------------------- */
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

/* -----------------------------------------------------------------------------
   API routes
----------------------------------------------------------------------------- */
app.use("/api", catalogRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/vendor-requests", vendorRequestsRouter); // compat path for Admin
app.use("/api", adminRouter); // also exposes /api/vendors/:id/approval

/** 404 for API */
app.use("/api", (_req, res) => res.status(404).json({ message: "Not Found" }));

/** Centralized error handler */
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

/* -----------------------------------------------------------------------------
   Bootstrap HTTP server + dev/prod asset handling
----------------------------------------------------------------------------- */
(async () => {
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Serve built client assets
    serveStatic(app);

    // SPA fallback for non-/api routes
    const indexFile = path.resolve(process.cwd(), "dist/public/index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
      return next();
    });
  }

  const port = Number(process.env.PORT ?? env.PORT ?? 5000);
  // Render expects 0.0.0.0; this also works fine locally.
  const host = process.env.HOST || "0.0.0.0";

  server.listen(port, host, () => {
    log(`API listening on http://${host}:${port}`);
    if (corsOrigins.length === 0) {
      log("CORS: * (all origins) — set CORS_ORIGINS or WEB_ORIGIN_1..5 to restrict");
    } else {
      log(`CORS allow list: ${corsOrigins.join(", ")}`);
    }
  });

  // Optional: surface unhandled errors
  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("Unhandled Rejection:", reason);
  });
  process.on("uncaughtException", (e) => {
    // eslint-disable-next-line no-console
    console.error("Uncaught Exception:", e);
  });
})();
