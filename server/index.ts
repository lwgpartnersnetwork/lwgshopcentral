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

// ✅ default imports (see router files below)
import catalogRouter from "./routes/catalog";
import checkoutRouter from "./routes/checkout";

const app = express(); // ← MUST come before any app.use

// ---------- middleware ----------
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

// tiny API logger
app.use("/api", (req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    log(
      `${req.method} ${req.originalUrl} ${res.statusCode} in ${Date.now() - started}ms`,
    );
  });
  next();
});

// ---------- health ----------
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ---------- ROUTES ----------
app.use("/api", catalogRouter); // /api/categories, /api/vendors, /api/products, /api/orders/vendor/:id
app.use("/api/checkout", checkoutRouter);

// JSON 404 for unknown API routes
app.use("/api", (_req, res) => res.status(404).json({ message: "Not Found" }));

// centralized API error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const message = String(err?.message || "Internal Server Error");
  try {
    console.error(err);
  } catch {}
  res.status(status).json({ message });
});

// ---------- start ----------
(async () => {
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
