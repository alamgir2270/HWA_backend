const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// Load Models
const User = require("./users.model")(sequelize, DataTypes);
const Admin = require("./admins.model")(sequelize, DataTypes);
const Patient = require("./patients.model")(sequelize, DataTypes);

// FIXED — clinics.js not clinics.model.js
const Clinic = require("./clinics")(sequelize, DataTypes);

const Department = require("./departments.model")(sequelize, DataTypes);
const Doctor = require("./doctors.model")(sequelize, DataTypes);
const Appointment = require("./appointments.model")(sequelize, DataTypes);
const AuditLog = require("./audit_logs.model")(sequelize, DataTypes);
const Bill = require("./bills.model")(sequelize, DataTypes);
const Feedback = require("./feedback.model")(sequelize, DataTypes);
const MedicalHistory = require("./medical_history.model")(sequelize, DataTypes);
const HealthStatus = require("./health_status.model")(sequelize, DataTypes);
const Notification = require("./notifications.model")(sequelize, DataTypes);
const Prescription = require("./prescriptions.model")(sequelize, DataTypes);
const LabResult = require("./lab_results.model")(sequelize, DataTypes);

/* ============================
   ALL ASSOCIATIONS HERE
============================ */

// users → admins / patients / doctors
User.hasOne(Admin, { foreignKey: "user_id", onDelete: "CASCADE" });
Admin.belongsTo(User, { foreignKey: "user_id" });

User.hasOne(Patient, { foreignKey: "user_id", onDelete: "CASCADE" });
Patient.belongsTo(User, { foreignKey: "user_id" });

User.hasOne(Doctor, { foreignKey: "user_id", onDelete: "CASCADE" });
Doctor.belongsTo(User, { foreignKey: "user_id" });

// clinic → departments
Clinic.hasMany(Department, { foreignKey: "clinic_id", onDelete: "CASCADE" });
Department.belongsTo(Clinic, { foreignKey: "clinic_id" });

// departments → doctors
Department.hasMany(Doctor, { foreignKey: "department_id", onDelete: "SET NULL" });
Doctor.belongsTo(Department, { foreignKey: "department_id" });

// clinic → doctors
Clinic.hasMany(Doctor, { foreignKey: "clinic_id", onDelete: "SET NULL" });
Doctor.belongsTo(Clinic, { foreignKey: "clinic_id" });

// patient/doctor/clinic → appointments
Patient.hasMany(Appointment, { foreignKey: "patient_id", onDelete: "CASCADE" });
Appointment.belongsTo(Patient, { foreignKey: "patient_id" });

Doctor.hasMany(Appointment, { foreignKey: "doctor_id", onDelete: "CASCADE" });
Appointment.belongsTo(Doctor, { foreignKey: "doctor_id" });

Clinic.hasMany(Appointment, { foreignKey: "clinic_id", onDelete: "SET NULL" });
Appointment.belongsTo(Clinic, { foreignKey: "clinic_id" });

// patient → health_status
Patient.hasMany(HealthStatus, { foreignKey: "patient_id", onDelete: "CASCADE" });
HealthStatus.belongsTo(Patient, { foreignKey: "patient_id" });

// users → health_status (recorded_by)
User.hasMany(HealthStatus, { foreignKey: "recorded_by", onDelete: "SET NULL" });
HealthStatus.belongsTo(User, { foreignKey: "recorded_by", as: "recordedBy" });
User.hasMany(AuditLog, { foreignKey: "user_id", onDelete: "SET NULL" });
AuditLog.belongsTo(User, { foreignKey: "user_id" });

// patient → bills
Patient.hasMany(Bill, { foreignKey: "patient_id", onDelete: "CASCADE" });
Bill.belongsTo(Patient, { foreignKey: "patient_id" });

Admin.hasMany(Bill, { foreignKey: "admin_id", onDelete: "SET NULL" });
Bill.belongsTo(Admin, { foreignKey: "admin_id" });

Appointment.hasMany(Bill, { foreignKey: "appointment_id", onDelete: "SET NULL" });
Bill.belongsTo(Appointment, { foreignKey: "appointment_id" });

// appointment → feedback
Appointment.hasMany(Feedback, { foreignKey: "appointment_id", onDelete: "SET NULL" });
Feedback.belongsTo(Appointment, { foreignKey: "appointment_id" });

Patient.hasMany(Feedback, { foreignKey: "patient_id", onDelete: "CASCADE" });
Feedback.belongsTo(Patient, { foreignKey: "patient_id" });

Doctor.hasMany(Feedback, { foreignKey: "doctor_id", onDelete: "CASCADE" });
Feedback.belongsTo(Doctor, { foreignKey: "doctor_id" });

// patient → medical_history
Patient.hasMany(MedicalHistory, { foreignKey: "patient_id", onDelete: "CASCADE" });
MedicalHistory.belongsTo(Patient, { foreignKey: "patient_id" });

User.hasMany(MedicalHistory, { foreignKey: "recorded_by", onDelete: "SET NULL" });
MedicalHistory.belongsTo(User, { foreignKey: "recorded_by" });

// users → notifications
User.hasMany(Notification, { foreignKey: "user_id", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "user_id" });

// appointment → prescriptions
Appointment.hasMany(Prescription, { foreignKey: "appointment_id", onDelete: "SET NULL" });
Prescription.belongsTo(Appointment, { foreignKey: "appointment_id" });

Doctor.hasMany(Prescription, { foreignKey: "doctor_id", onDelete: "SET NULL" });
Prescription.belongsTo(Doctor, { foreignKey: "doctor_id" });

Patient.hasMany(Prescription, { foreignKey: "patient_id", onDelete: "CASCADE" });
Prescription.belongsTo(Patient, { foreignKey: "patient_id" });

// appointment/patient/doctor → lab results
Appointment.hasMany(LabResult, { foreignKey: "appointment_id", onDelete: "SET NULL" });
LabResult.belongsTo(Appointment, { foreignKey: "appointment_id" });

Patient.hasMany(LabResult, { foreignKey: "patient_id", onDelete: "CASCADE" });
LabResult.belongsTo(Patient, { foreignKey: "patient_id" });

Doctor.hasMany(LabResult, { foreignKey: "performed_by", onDelete: "SET NULL" });
LabResult.belongsTo(Doctor, { foreignKey: "performed_by", as: "PerformedByDoctor" });

User.hasMany(LabResult, { foreignKey: "uploaded_by", onDelete: "SET NULL" });
LabResult.belongsTo(User, { foreignKey: "uploaded_by", as: "UploadedByUser" });

// Export Everything
module.exports = {
  sequelize,
  User,
  Admin,
  Patient,
  Clinic,
  Department,
  Doctor,
  Appointment,
  AuditLog,
  Bill,
  Feedback,
  MedicalHistory,
  HealthStatus,
  Notification,
  Prescription,
  LabResult,
};
