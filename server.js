require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { sequelize } = require("./models");
const errorHandler = require("./middleware/error.middleware");

const app = express();

// middleware
app.use(express.json());

// CORS Configuration - allow both localhost and production URLs
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://hwa-frontend.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(helmet());
app.use(morgan("dev"));
if (process.env.NODE_ENV === 'production') {
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));
} else {
  console.log('⚠️  Rate limiting is disabled in development mode');
}

// serve uploads (prescriptions PDFs etc.)
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/patients", require("./routes/patients.routes"));
app.use("/api/doctors", require("./routes/doctors.routes"));
app.use("/api/appointments", require("./routes/appointments.routes"));
app.use("/api/prescriptions", require("./routes/prescriptions.routes"));
app.use("/api/bills", require("./routes/bills.routes"));
app.use("/api/lab-results", require("./routes/lab_results.routes"));
app.use("/api/medical-history", require("./routes/medical_history.routes"));
app.use("/api/health-status", require("./routes/health_status.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
// Admin routes (create doctors, manage admin tasks)
app.use("/api/admin", require("./routes/admin.routes"));
// Public read-only APIs
app.use("/api/public", require("./routes/public.routes"));

// health check
app.get("/", (req, res) => res.send("Backend is running!"));

// error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Sync database and align schema with models during startup in development/local environments
const syncOptions = { alter: process.env.NODE_ENV === "production" ? false : true };
console.log(`Database sync options: ${JSON.stringify(syncOptions)}; schema will be aligned to models during startup if not in production.`);
sequelize.sync(syncOptions).then(() => {
  console.log("All models synced successfully");
  // Bind explicitly to 0.0.0.0 to accept IPv4 and IPv6 localhost requests consistently
  const HOST = process.env.HOST || "0.0.0.0";
  app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
