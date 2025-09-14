// server/index.ts
import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "node:path";
import fs from "node:fs";
import { createServer } from "node:http";
import cors from "cors";
import helmet from "helmet";

import { env } from "./env";
import { setupVite, serveStatic, log } from "./vite";

// Routers
import vendorsRouter from "./routes/vendors"; // /api/vendors/*
import catalogRouter from "./routes/catalog"; // /api/categories, /api/products, /api/orders/vendor/:id
import checkoutRouter from "./routes/checkout"; // /api/checkout/*

const app = express();

/* ------------------------- Middleware ------------------------- */
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

const corsOrigins = (env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(helmet());

// Tiny API logger
app.use("/api", (req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    log(
      `${req.method} ${req.originalUrl} ${res.statusCode} in ${Date.now() - t0}ms`,
    );
  });
  next();
});

/* --------------------------- Health --------------------------- */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/* ---------------------------- Routes -------------------------- */
// Important: mount vendors first so /api/vendors is handled here
app.use("/api/vendors", vendorsRouter);

// Catalog: categories, products, orders listing for vendor
app.use("/api", catalogRouter);

// Checkout: order creation + notifications
app.use("/api/checkout", checkoutRouter);

/* --------------------------- 404 JSON ------------------------- */
app.use("/api", (_req, res) => res.status(404).json({ message: "Not Found" }));

/* ----------------------- Error handling ----------------------- */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const message = String(err?.message || "Internal Server Error");
  try {
    // eslint-disable-next-line no-console
    console.error(err);
  } catch {}
  res.status(status).json({ message });
});

/* ---------------------------- Start --------------------------- */
(async () => {
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Serve built client (dist/public)
    serveStatic(app);

    // SPA fallback for non-API routes
    const indexFile = path.resolve(process.cwd(), "dist/public/index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
      return next();
    });
  }

  const port = Number(env.PORT || 5000);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
