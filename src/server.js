"use strict";

// ── Step 1: Validate all env vars before anything else ────────
// If any required var is missing, env.js calls process.exit(1)
// with a clear list of what's missing. Nothing else runs.
const env = require("./config/env");

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { errorHandler } = require("./middleware/error.middleware");
const apiRouter = require("./api/index");
const reminderJob = require("./jobs/reminder.job");
const recallJob = require("./jobs/recall.job");
const insuranceJob = require("./jobs/insurance.job");
const noshowJob = require("./jobs/noshow.job");

// ─────────────────────────────────────────────────────────────
// LOGGER
// Rule: no console.log in production (CLAUDE.md §5).
// info-level output is suppressed in prod — use Railway logs
// or a log aggregator for observability instead.
// warn/error always write to stderr so they appear in Railway.
// ─────────────────────────────────────────────────────────────
const log = {
  info: (...args) => {
    if (!env.isProd) process.stdout.write(`[INFO]  ${args.join(" ")}\n`);
  },
  warn: (...args) => process.stderr.write(`[WARN]  ${args.join(" ")}\n`),
  error: (...args) => process.stderr.write(`[ERROR] ${args.join(" ")}\n`),
};

// ─────────────────────────────────────────────────────────────
// EXPRESS APP
// ─────────────────────────────────────────────────────────────
const app = express();

// ── Step 2: Core middleware ───────────────────────────────────

// CORS — allow dashboard URL + localhost in dev
const allowedOrigins = [
  env.dashboardUrl,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// HTTP request logging
// 'combined' → Apache standard format, good for log aggregators in prod
// 'dev'      → colorized short format, readable in dev terminal
app.use(morgan(env.isProd ? "combined" : "dev"));

// JSON body parser — used by all API routes
app.use(express.json());

// URL-encoded body parser — Twilio webhooks POST as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// ── Step 4: Health check ─────────────────────────────────────
// No auth — pinged by Railway health checks and Better Uptime every 5 min.
// Must respond before any other middleware runs in case DB is down.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Step 3: Mount all API routes ─────────────────────────────
app.use("/", apiRouter);

// 404 — catch-all for unmatched routes
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Step 6: Global error handler — MUST be last, MUST have 4 params ──
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// CRON JOBS
// ─────────────────────────────────────────────────────────────

// ── Step 5: Start all background jobs ────────────────────────
function startJobs() {
  try {
    reminderJob.start(); // every hour        — 24h appointment reminders
    recallJob.start(); // daily 20:00 UTC   — outbound recall calls
    insuranceJob.start(); // daily 09:00 UTC   — 48h insurance verification
    noshowJob.start(); // daily 18:00 UTC   — no-show prediction + confirmations
    log.info("[server] all cron jobs scheduled");
  } catch (e) {
    // Failing to register a job must not crash the server —
    // the HTTP layer should still serve webhooks and dashboard requests.
    log.error("[server] failed to start cron jobs:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// PROCESS-LEVEL SAFETY NETS
// Prevent silent crashes — log everything and let Railway restart.
// ─────────────────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  log.error("[server] uncaughtException:", err.message);
  log.error(err.stack || "(no stack)");
  // Exit so Railway/PM2 can restart with a clean slate
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log.error("[server] unhandledRejection:", reason?.message || String(reason));
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
const PORT = env.port;
const server = app.listen(PORT, () => {
  log.info(`[server] listening on port ${PORT} env=${env.nodeEnv}`);
  startJobs();
});

// ── Graceful shutdown ─────────────────────────────────────────
// Railway sends SIGTERM before stopping a container.
// We stop accepting new connections, let in-flight requests drain,
// then exit cleanly so no bookings or DB writes are cut mid-flight.
function shutdown(signal) {
  log.warn(`[server] ${signal} received — shutting down gracefully`);

  server.close(() => {
    log.warn("[server] HTTP server closed — all connections drained");
    process.exit(0);
  });

  // Force exit after 10 s in case some connection refuses to close
  setTimeout(() => {
    log.error("[server] graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000).unref(); // .unref() so the timer doesn't keep the process alive alone
}

process.on("SIGTERM", () => shutdown("SIGTERM")); // Railway stop / deploy
process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C in dev

module.exports = app; // exported so integration tests can import without starting
