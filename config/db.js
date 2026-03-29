const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

if (process.env.DATABASE_URL) {
  // ✅ Production (Render + Supabase)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // ✅ Local (your current config)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: "postgres",
      logging: false,
    }
  );
}

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected successfully!");

    const alterSchema = process.env.NODE_ENV === "production" ? false : true;
    await sequelize.sync({ alter: alterSchema });

    console.log("✅ All models synchronized!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
}

module.exports = { sequelize, connectDB };
