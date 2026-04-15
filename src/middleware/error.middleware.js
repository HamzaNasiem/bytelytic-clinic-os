"use strict";

const env = require("../config/env");

/**
 * Global Express error handler — must be registered LAST with 4 params.
 * Catches anything passed to next(err) or thrown in async routes
 * (when using an async wrapper or express-async-errors).
 */
function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(
    `[error.middleware] ${req.method} ${req.path} status=${status}`,
    message,
  );

  const body = { error: message };

  // Never leak stack traces in production
  if (!env.isProd && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
