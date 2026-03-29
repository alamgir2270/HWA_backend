// config/db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
  }
);

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected successfully!");

    // Sync all models (auto create tables)
    await sequelize.sync({ alter: false });
    console.log("✅ All models synchronized!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
}

module.exports = { sequelize, connectDB };
