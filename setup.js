require("dotenv").config();
const bcrypt = require("bcrypt");
const { sequelize, User, Department, Doctor, Clinic } = require("./models");

// ENV config
const DB_DOMAIN = process.env.DB_DOMAIN || "healthcare.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || `admin@${DB_DOMAIN}`;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
const SKIP_SEED = process.env.SKIP_SEED === "true";

async function setupDatabase() {
  try {
    console.log("🔧 Starting database setup...");
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Skip Seed: ${SKIP_SEED}\n`);

    // ✅ Safe sync (NO force in production)
    await sequelize.sync({ alter: false });
    console.log("✅ Database synced");

    // ✅ Only skip if explicitly set
    if (SKIP_SEED) {
      console.log("⏭️ Seeding skipped (SKIP_SEED=true)");
      return;
    }

    // =========================
    // 🏥 CLINIC
    // =========================
    let clinic = await Clinic.findOne();
    if (!clinic) {
      clinic = await Clinic.create({
        name: "Central Healthcare",
        address: "123 Medical St",
        phone: "555-1234",
      });
      console.log("✅ Clinic created");
    }

    // =========================
    // 📋 DEPARTMENTS
    // =========================
    const departmentNames = [
      "General Medicine",
      "Cardiology",
      "Orthopedics",
      "Pediatrics",
    ];

    const departments = {};

    for (const name of departmentNames) {
      let dept = await Department.findOne({ where: { name } });
      if (!dept) {
        dept = await Department.create({
          name,
          clinic_id: clinic.clinic_id,
        });
        console.log(`✅ Department: ${name}`);
      }
      departments[name] = dept;
    }

    // =========================
    // 👤 ADMIN
    // =========================
    let admin = await User.findOne({ where: { email: ADMIN_EMAIL } });

    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);

      await User.create({
        email: ADMIN_EMAIL.toLowerCase(),
        password_hash: hash,
        salt,
        full_name: "System Administrator",
        role: "admin",
        is_active: true,
      });

      console.log("✅ Admin created");
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}\n`);
    } else {
      console.log("⏭️ Admin already exists\n");
    }

    // =========================
    // 👨‍⚕️ DOCTORS
    // =========================
    const DOCTOR_PASSWORD =
      process.env.DOCTOR_PASSWORD || "Doctor@123456";

    const doctors = [
      ["doctor1", "Dr. James Smith", "General Medicine"],
      ["doctor2", "Dr. Emily Johnson", "General Medicine"],
      ["cardio", "Dr. Sarah Chen", "Cardiology"],
      ["cardio2", "Dr. Michael Brown", "Cardiology"],
      ["ortho", "Dr. Ahmed Khan", "Orthopedics"],
      ["ortho2", "Dr. Lisa Anderson", "Orthopedics"],
      ["pediatric", "Dr. Maria Lopez", "Pediatrics"],
      ["pediatric2", "Dr. Robert Davis", "Pediatrics"],
    ];

    for (const [username, name, deptName] of doctors) {
      const email = `${username}@${DB_DOMAIN}`.toLowerCase();

      let user = await User.findOne({ where: { email } });

      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(DOCTOR_PASSWORD, salt);

        user = await User.create({
          email,
          password_hash: hash,
          salt,
          full_name: name,
          role: "doctor",
          is_active: true,
        });

        await Doctor.create({
          user_id: user.user_id,
          department_id: departments[deptName].department_id,
          specialty: deptName,
          clinic_id: clinic.clinic_id,
          rating_cache: 4.5,
        });

        console.log(`✅ Doctor: ${name}`);
      } else {
        console.log(`⏭️ Doctor exists: ${email}`);
      }
    }

    // =========================
    // 👤 PATIENT
    // =========================
    const PATIENT_EMAIL =
      process.env.PATIENT_EMAIL || `patient@${DB_DOMAIN}`;
    const PATIENT_PASSWORD =
      process.env.PATIENT_PASSWORD || "Patient@123456";

    let patient = await User.findOne({
      where: { email: PATIENT_EMAIL },
    });

    if (!patient) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(PATIENT_PASSWORD, salt);

      await User.create({
        email: PATIENT_EMAIL.toLowerCase(),
        password_hash: hash,
        salt,
        full_name: "Test Patient",
        role: "patient",
        is_active: true,
      });

      console.log("✅ Patient created");
    } else {
      console.log("⏭️ Patient exists");
    }

    console.log("\n🎉 SETUP COMPLETE!");
    console.log("\n🔑 LOGIN INFO:");
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`Doctor: doctor1@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log(`Patient: ${PATIENT_EMAIL} / ${PATIENT_PASSWORD}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

setupDatabase();
