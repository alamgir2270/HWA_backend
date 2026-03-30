require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { sequelize } = require("./models");
const errorHandler = require("./middleware/error.middleware");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());

// ================= CORS FIX =================
const allowedOrigins = [
  "https://hwa-frontend.vercel.app",
  "https://hwa-frontend-git-main-alamgir2270s-projects.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests without origin (Postman, Render health check)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❗ DO NOT throw error (prevents Render crash)
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight

// ================= SECURITY =================
app.use(helmet());
app.use(morgan("dev"));

if (process.env.NODE_ENV === "production") {
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));
} else {
  console.log("⚠️ Rate limiting is disabled in development mode");
}

// ================= STATIC FILES =================
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ROUTES =================
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

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;

const syncOptions = {
  alter: process.env.NODE_ENV === "production" ? false : true,
};

console.log(
  `Database sync options: ${JSON.stringify(syncOptions)}`
);

sequelize.sync(syncOptions).then(() => {
  console.log("All models synced successfully");

  const HOST = process.env.HOST || "0.0.0.0";

  app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
  });
});

// ================= GLOBAL ERROR =================
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
