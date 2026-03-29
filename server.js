require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const { sequelize } = require("./models");
const errorHandler = require("./middleware/error.middleware");

const app = express();

// ✅ IMPORTANT: Render এর জন্য
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

// ================= Middleware =================
app.use(express.json());

// ✅ ✅ FIXED CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "https://hwa-frontend.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed: " + origin));
    }
  },
  credentials: true
}));

// Optional: preflight support
app.options("*", cors());

// ================= Security & Logs =================
app.use(helmet());
app.use(morgan("dev"));

if (process.env.NODE_ENV === "production") {
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));
} else {
  console.log("⚠️ Rate limiting is disabled in development mode");
}

// ================= Static =================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= Routes =================
app.get("/", (req, res) => res.send("Backend is running!"));

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
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/public", require("./routes/public.routes"));

// ================= Error Handler =================
app.use(errorHandler);

// ================= Start Server =================
const syncOptions = {
  alter: process.env.NODE_ENV === "production" ? false : true,
};

sequelize.sync(syncOptions)
  .then(() => {
    console.log("✅ All models synced successfully");

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ DB sync failed:", err.message);

    // Even if DB fails, server should still run
    app.listen(PORT, HOST, () => {
      console.log(`⚠️ Server running WITHOUT DB on ${HOST}:${PORT}`);
    });
  });

// ================= Global Error =================
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
