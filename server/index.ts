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

// Routers
import catalogRouter from "./routes/catalog"; // /api/categories, /api/products, /api/vendors (read)
import checkoutRouter from "./routes/checkout"; // /api/checkout
import vendorsRouter from "./routes/vendors"; // /api/vendors/... (apply/approve legacy)
import vendorRequestsRouter from "./routes/vendor-requests"; // /api/vendor-requests (submit/list/approve/reject)

const app = express();

// ---------- Core middleware ----------
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// CORS from env
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

// Basic security
app.use(helmet());

// Tiny API access log
app.use("/api", (req, res, next) => {
  const t = Date.now();
  res.on("finish", () =>
    log(
      `${req.method} ${req.originalUrl} ${res.statusCode} in ${Date.now() - t}ms`,
    ),
  );
  next();
});

// ---------- Health ----------
app.get("/api/health", (_req: Request, res: Response) =>
  res.json({ status: "ok" }),
);

// ---------- Routes ----------
app.use("/api", catalogRouter); // categories/products (and any simple lists)
app.use("/api/checkout", checkoutRouter); // checkout + emails/whatsapp
app.use("/api/vendors", vendorsRouter); // legacy vendor apply/approve endpoints
app.use("/api/vendor-requests", vendorRequestsRouter); // new application workflow used by Admin

// JSON 404 for unknown /api routes
app.use("/api", (_req, res) => res.status(404).json({ message: "Not Found" }));

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

// ---------- Start ----------
(async () => {
  const server = createServer(app);

  if (app.get("env") === "development") {
    // Use Vite dev server for client in dev
    await setupVite(app, server);
  } else {
    // Static client in prod
    serveStatic(app);

    // SPA fallback: send index.html for non-/api routes
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
