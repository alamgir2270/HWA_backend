/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent response format
 */
module.exports = (err, req, res, next) => {
  // Log full error with stack trace for debugging
  console.error("🔥 ERROR:", err && err.message ? err.message : err);
  if (err && err.stack) {
    console.error("📍 Stack trace:", err.stack);
  }

  // Default error response
  let status = 500;
  let message = "Internal server error";
  let details = null;

  // Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    status = 400;
    message = "Validation error";
    details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    status = 409;
    message = "Resource already exists";
    details = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`,
    }));
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid or expired token";
  }

  if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Token has expired";
  }

  // Custom error status
  if (err.status) {
    status = err.status;
    message = err.message;
  }

  // Send standardized error response with full error details for debugging
  res.status(status).json({
    success: false,
    message,
    // Always include error message and stack trace in development or when error occurs
    error: err.message || "Unknown error",
    ...(err.stack && { stack: err.stack.split('\n').slice(0, 5) }),
    ...(details && { details }),
  });
};
