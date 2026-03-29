require("dotenv").config();
const bcrypt = require("bcrypt");
const { sequelize, User, Department, Doctor, Clinic } = require("./models");

async function setupDatabase() {
  try {
    console.log("🔧 Starting database setup...");

    // Sync database
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced");

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
    let adminUser = await User.findOne({ where: { email: "admin@healthcare.com" } });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Admin@123456", salt);
      adminUser = await User.create({
        email: "admin@healthcare.com",
        password_hash: hashedPassword,
        salt: salt,
        full_name: "System Administrator",
        role: "admin",
        phone: "+88017XXXXXXXX",
        is_active: true,
      });
      console.log("✅ Admin Account Created:");
      console.log("   Email: admin@healthcare.com");
      console.log("   Password: Admin@123456\n");
    } else {
      console.log("⏭️  Admin already exists\n");
    }

    // Create doctor users and profiles
    console.log("\n👨‍⚕️  Creating specialist doctors...\n");
    
    const doctorsToCreate = [
      {
        email: "doctor1@healthcare.com",
        password: "Doctor@123456",
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
        email: "doctor2@healthcare.com",
        password: "Doctor@123456",
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
        email: "cardio@healthcare.com",
        password: "Cardio@123456",
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
        email: "cardio2@healthcare.com",
        password: "Cardio@123456",
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
        email: "ortho@healthcare.com",
        password: "Ortho@123456",
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
        email: "ortho2@healthcare.com",
        password: "Ortho@123456",
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
        email: "pediatric@healthcare.com",
        password: "Pediatric@123456",
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
        email: "pediatric2@healthcare.com",
        password: "Pediatric@123456",
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
        
        // Always update existing doctor profile with complete info (even if already exists)
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
          // If doctor profile doesn't exist, create it
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
    }

    // Create test patient user
    console.log("👤 Creating test patient user...");
    let patientUser = await User.findOne({ where: { email: "patient@healthcare.com" } });
    if (!patientUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Patient@123456", salt);
      patientUser = await User.create({
        email: "patient@healthcare.com",
        password_hash: hashedPassword,
        salt: salt,
        full_name: "John Patient",
        phone: "+88019XXXXXXXX",
        role: "patient",
        is_active: true,
      });
      console.log("✅ Created patient user");
      console.log("   Email: patient@healthcare.com");
      console.log("   Password: Patient@123456\n");
    } else {
      console.log("⏭️  Patient user already exists\n");
    }

    console.log("\n✨ Database setup complete!");
    console.log("\n🔑 Test Credentials:");
    console.log("  👤 Admin: admin@healthcare.com / Admin@123456\n");
    console.log("  👨‍⚕️ Doctors (2 per department):");
    console.log("     📋 GENERAL MEDICINE:");
    console.log("        1. Dr. James Smith - doctor1@healthcare.com / Doctor@123456");
    console.log("        2. Dr. Emily Johnson - doctor2@healthcare.com / Doctor@123456");
    console.log("     ❤️  CARDIOLOGY:");
    console.log("        3. Dr. Sarah Chen - cardio@healthcare.com / Cardio@123456");
    console.log("        4. Dr. Michael Brown - cardio2@healthcare.com / Cardio@123456");
    console.log("     🦴 ORTHOPEDICS:");
    console.log("        5. Dr. Ahmed Khan - ortho@healthcare.com / Ortho@123456");
    console.log("        6. Dr. Lisa Anderson - ortho2@healthcare.com / Ortho@123456");
    console.log("     👶 PEDIATRICS:");
    console.log("        7. Dr. Maria Lopez - pediatric@healthcare.com / Pediatric@123456");
    console.log("        8. Dr. Robert Davis - pediatric2@healthcare.com / Pediatric@123456\n");
    console.log("  👤 Patient: patient@healthcare.com / Patient@123456");

    process.exit(0);
  } catch (err) {
    console.error("❌ Setup error:", err);
    process.exit(1);
  }
}

setupDatabase();
