require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const { sequelize } = require("./models");
const errorHandler = require("./middleware/error.middleware");

// ✅ Import setup.js for seeding
const setupDatabase = require("./setup");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());

// ================= CORS =================
const allowedOrigins = [
  "https://hwa-frontend.vercel.app",
  "https://hwa-frontend-git-main-alamgir2270s-projects.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman, Render health check
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));

// ================= SECURITY =================
app.use(helmet());
app.use(morgan("dev"));

if (process.env.NODE_ENV === "production") {
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));
} else {
  console.log("⚠️ Rate limiting is disabled in development mode");
}

// ================= STATIC FILES =================
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

// ================= SEED ROUTE (PRODUCTION SAFE) =================
// 🔐 Use secret key for safety
app.get("/seed", async (req, res) => {
  try {
    if (req.query.key !== process.env.SEED_KEY) {
      return res.status(403).send("❌ Forbidden: Invalid key");
    }

    await setupDatabase();
    res.send("✅ Database seeded successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error seeding database");
  }
});

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
const syncOptions = { alter: process.env.NODE_ENV === "production" ? false : true };

console.log(`Database sync options: ${JSON.stringify(syncOptions)}`);

sequelize.sync(syncOptions).then(() => {
  const HOST = process.env.HOST || "0.0.0.0";
  console.log("All models synced successfully");

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
