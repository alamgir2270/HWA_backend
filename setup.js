require("dotenv").config();
const bcrypt = require("bcrypt");
const { sequelize, User, Department, Doctor, Clinic } = require("./models");

// Environment-based configuration (for Supabase & production compatibility)
const DB_DOMAIN = process.env.DB_DOMAIN || "healthcare.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || `admin@${DB_DOMAIN}`;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
const SKIP_SEED = process.env.SKIP_SEED === "true";

async function setupDatabase() {
  try {
    console.log("🔧 Starting database setup...");
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database Domain: ${DB_DOMAIN}`);
    console.log(`   Skip Seed: ${SKIP_SEED}\n`);

    // Sync database - production safe (no alter in production)
    const syncOptions = process.env.NODE_ENV === "production" 
      ? { alter: false, force: false }
      : { alter: true };
    
    await sequelize.sync(syncOptions);
    console.log("✅ Database synced");

    // Skip seeding if in production or explicitly disabled
    if (SKIP_SEED || process.env.NODE_ENV === "production") {
      console.log("⏭️  Skipping seed data (SKIP_SEED=true or production mode)\n");
      return;
    }

    // Create default clinic if it doesn't exist
    let clinic = await Clinic.findOne();
    if (!clinic) {
      clinic = await Clinic.create({
        name: "Central Healthcare",
        address: "123 Medical St",
        phone: "555-1234",
      });
      console.log("✅ Created default clinic");
    }

    // Create departments
    const departmentNames = [
      { name: "General Medicine", description: "General healthcare and preventive medicine" },
      { name: "Cardiology", description: "Heart and cardiovascular diseases" },
      { name: "Orthopedics", description: "Bones, joints, and musculoskeletal system" },
      { name: "Pediatrics", description: "Healthcare for children" },
    ];

    console.log("\n📋 Creating departments...");
    const departments = {};
    for (const dept of departmentNames) {
      let d = await Department.findOne({ where: { name: dept.name } });
      if (!d) {
        d = await Department.create({
          name: dept.name,
          description: dept.description,
          clinic_id: clinic.clinic_id,
        });
        console.log(`  ✅ Created: ${dept.name}`);
      } else {
        console.log(`  ⏭️  Already exists: ${dept.name}`);
      }
      departments[dept.name] = d;
    }

    // Create admin user
    console.log("📝 Creating Admin account...");
    let adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) {
      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        adminUser = await User.create({
          email: ADMIN_EMAIL,
          password_hash: hashedPassword,
          salt: salt,
          full_name: "System Administrator",
          role: "admin",
          phone: "+88017XXXXXXXX",
          is_active: true,
        });
        console.log("✅ Admin Account Created:");
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}\n`);
      } catch (err) {
        console.error(`❌ Error creating admin user: ${err.message}\n`);
      }
    } else {
      console.log("⏭️  Admin already exists\n");
    }

    // Create doctor users and profiles
    console.log("\n👨‍⚕️  Creating specialist doctors...\n");
    
    // Use environment-based doctor configuration for Supabase compatibility
    const DOCTOR_PASSWORD = process.env.DOCTOR_PASSWORD || "Doctor@123456";
    
    const doctorsToCreate = [
      {
        email: `doctor1@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. James Smith",
        phone: "+88018XXXXXXXX",
        specialty: "General Medicine",
        department: "General Medicine",
        license_no: "DOC-BD-2024-001",
        bio: "Experienced general physician with 10+ years of practice",
        available_days: "Mon,Tue,Wed,Thu,Fri",
        available_hours: "09:00-17:00",
      },
      {
        email: `doctor2@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Emily Johnson",
        phone: "+88018XXXXXXXX",
        specialty: "General Medicine",
        department: "General Medicine",
        license_no: "DOC-BD-2024-001A",
        bio: "Skilled physician specializing in preventive medicine",
        available_days: "Tue,Wed,Thu,Fri,Sat",
        available_hours: "10:00-18:00",
      },
      {
        email: `cardio@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Sarah Chen",
        phone: "+88018XXXXXXXX",
        specialty: "Cardiology",
        department: "Cardiology",
        license_no: "DOC-BD-2024-002",
        bio: "Specialist in cardiovascular diseases with 15+ years experience",
        available_days: "Mon,Wed,Thu,Fri",
        available_hours: "10:00-16:00",
      },
      {
        email: `cardio2@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Michael Brown",
        phone: "+88018XXXXXXXX",
        specialty: "Cardiology",
        department: "Cardiology",
        license_no: "DOC-BD-2024-002A",
        bio: "Expert in interventional cardiology and heart disease management",
        available_days: "Mon,Tue,Wed,Thu,Fri",
        available_hours: "09:00-15:00",
      },
      {
        email: `ortho@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Ahmed Khan",
        phone: "+88018XXXXXXXX",
        specialty: "Orthopedics",
        department: "Orthopedics",
        license_no: "DOC-BD-2024-003",
        bio: "Expert orthopedic surgeon specializing in joint replacement",
        available_days: "Mon,Tue,Thu,Fri,Sat",
        available_hours: "08:00-14:00",
      },
      {
        email: `ortho2@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Lisa Anderson",
        phone: "+88018XXXXXXXX",
        specialty: "Orthopedics",
        department: "Orthopedics",
        license_no: "DOC-BD-2024-003A",
        bio: "Specialist in sports medicine and orthopedic trauma",
        available_days: "Tue,Wed,Thu,Fri,Sat",
        available_hours: "08:30-16:30",
      },
      {
        email: `pediatric@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Maria Lopez",
        phone: "+88018XXXXXXXX",
        specialty: "Pediatrics",
        department: "Pediatrics",
        license_no: "DOC-BD-2024-004",
        bio: "Compassionate pediatrician caring for children's health",
        available_days: "Mon,Tue,Wed,Thu,Fri",
        available_hours: "09:00-17:00",
      },
      {
        email: `pediatric2@${DB_DOMAIN}`,
        password: DOCTOR_PASSWORD,
        name: "Dr. Robert Davis",
        phone: "+88018XXXXXXXX",
        specialty: "Pediatrics",
        department: "Pediatrics",
        license_no: "DOC-BD-2024-004A",
        bio: "Experienced pediatrician with focus on child development",
        available_days: "Mon,Tue,Wed,Thu,Fri,Sat",
        available_hours: "09:30-17:30",
      },
    ];

    for (const doctorInfo of doctorsToCreate) {
      try {
        let doctorUser = await User.findOne({ where: { email: doctorInfo.email } });
        if (!doctorUser) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(doctorInfo.password, salt);
          doctorUser = await User.create({
            email: doctorInfo.email,
            password_hash: hashedPassword,
            salt: salt,
            full_name: doctorInfo.name,
            phone: doctorInfo.phone,
            role: "doctor",
            is_active: true,
          });
          console.log(`✅ ${doctorInfo.name}`);
          console.log(`   Department: ${doctorInfo.department}`);
          console.log(`   Email: ${doctorInfo.email}`);
          console.log(`   Password: ${doctorInfo.password}\n`);

          // Create doctor profile
          await Doctor.create({
            user_id: doctorUser.user_id,
            department_id: departments[doctorInfo.department].department_id,
            specialty: doctorInfo.specialty,
            license_no: doctorInfo.license_no,
            bio: doctorInfo.bio,
            available_days: doctorInfo.available_days,
            available_hours: doctorInfo.available_hours,
            clinic_id: clinic.clinic_id,
            rating_cache: 4.5,
          });
        } else {
          console.log(`✅ Updating: ${doctorInfo.email}`);
          
          // Update existing doctor profile
          const doctorProfile = await Doctor.findOne({ where: { user_id: doctorUser.user_id } });
          if (doctorProfile) {
            await doctorProfile.update({
              department_id: departments[doctorInfo.department].department_id,
              specialty: doctorInfo.specialty,
              license_no: doctorInfo.license_no,
              bio: doctorInfo.bio,
              available_days: doctorInfo.available_days,
              available_hours: doctorInfo.available_hours,
              clinic_id: clinic.clinic_id,
              rating_cache: 4.5,
            });
          } else {
            await Doctor.create({
              user_id: doctorUser.user_id,
              department_id: departments[doctorInfo.department].department_id,
              specialty: doctorInfo.specialty,
              license_no: doctorInfo.license_no,
              bio: doctorInfo.bio,
              available_days: doctorInfo.available_days,
              available_hours: doctorInfo.available_hours,
              clinic_id: clinic.clinic_id,
              rating_cache: 4.5,
            });
          }
        }
      } catch (err) {
        console.error(`❌ Error creating doctor ${doctorInfo.name}: ${err.message}`);
      }
    }

    // Create test patient user
    console.log("👤 Creating test patient user...");
    const PATIENT_EMAIL = process.env.PATIENT_EMAIL || `patient@${DB_DOMAIN}`;
    const PATIENT_PASSWORD = process.env.PATIENT_PASSWORD || "Patient@123456";
    
    let patientUser = await User.findOne({ where: { email: PATIENT_EMAIL } });
    if (!patientUser) {
      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(PATIENT_PASSWORD, salt);
        patientUser = await User.create({
          email: PATIENT_EMAIL,
          password_hash: hashedPassword,
          salt: salt,
          full_name: "John Patient",
          phone: "+88019XXXXXXXX",
          role: "patient",
          is_active: true,
        });
        console.log("✅ Created patient user");
        console.log(`   Email: ${PATIENT_EMAIL}`);
        console.log(`   Password: ${PATIENT_PASSWORD}\n`);
      } catch (err) {
        console.error(`❌ Error creating patient: ${err.message}`);
      }
    } else {
      console.log("⏭️  Patient user already exists\n");
    }

    console.log("\n✨ Database setup complete!");
    console.log("\n🔑 Test Credentials:");
    console.log(`  👤 Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
    console.log("  👨‍⚕️ Doctors (2 per department):");
    console.log("     📋 GENERAL MEDICINE:");
    console.log(`        1. Dr. James Smith - doctor1@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log(`        2. Dr. Emily Johnson - doctor2@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log("     ❤️  CARDIOLOGY:");
    console.log(`        3. Dr. Sarah Chen - cardio@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log(`        4. Dr. Michael Brown - cardio2@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log("     🦴 ORTHOPEDICS:");
    console.log(`        5. Dr. Ahmed Khan - ortho@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log(`        6. Dr. Lisa Anderson - ortho2@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log("     👶 PEDIATRICS:");
    console.log(`        7. Dr. Maria Lopez - pediatric@${DB_DOMAIN} / ${DOCTOR_PASSWORD}`);
    console.log(`        8. Dr. Robert Davis - pediatric2@${DB_DOMAIN} / ${DOCTOR_PASSWORD}\n`);
    console.log(`  👤 Patient: ${PATIENT_EMAIL} / ${PATIENT_PASSWORD}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Setup error:", err);
    process.exit(1);
  }
}

setupDatabase();
