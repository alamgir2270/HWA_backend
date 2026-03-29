const { Patient, User, Doctor, Appointment } = require("../models");

exports.getAllPatients = async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    // For doctors, show only their patients
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      if (!doctor) {
        return res.json({ success: true, data: [] });
      }

      // Get all appointments for this doctor, extract unique patient_ids
      const appointments = await Appointment.findAll({
        where: { doctor_id: doctor.doctor_id },
        attributes: ["patient_id"],
        raw: true,
      });

      const patientIds = [...new Set(appointments.map((a) => a.patient_id))];
      where.patient_id = patientIds.length > 0 ? { [require("sequelize").Op.in]: patientIds } : null;

      if (!where.patient_id) {
        return res.json({ success: true, data: [] });
      }
    }
    // For admins, show all patients (no filter)

    const patients = await Patient.findAll({
      where,
      include: [{ model: User, attributes: ["email", "full_name", "phone"] }],
      order: [["patient_id", "ASC"]],
    });

    res.json({ success: true, data: patients });
  } catch (err) {
    console.error("getAllPatients error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [{ model: User, attributes: ["email", "full_name", "phone"] }],
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    console.error("getPatient error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Ensure a patient profile exists for the authenticated user. Creates a minimal profile if missing.
exports.ensurePatient = async (req, res) => {
  try {
    const user = req.user;
    const existing = await Patient.findOne({ where: { user_id: user.user_id || user.id } });
    if (existing) return res.json({ success: true, data: existing });

    const created = await Patient.create({ user_id: user.user_id || user.id });
    const withUser = await Patient.findByPk(created.patient_id, { include: [{ model: User, attributes: ["user_id", "email", "full_name", "phone"] }] });
    res.status(201).json({ success: true, data: withUser });
  } catch (err) {
    console.error("ensurePatient error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current authenticated patient's profile
exports.getCurrentPatient = async (req, res) => {
  try {
    const user = req.user;
    const patient = await Patient.findOne({ where: { user_id: user.user_id || user.id }, include: [{ model: User, attributes: ["user_id", "email", "full_name", "phone"] }] });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });
    res.json({ success: true, data: patient });
  } catch (err) {
    console.error("getCurrentPatient error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update patient profile (self or admin)
exports.updatePatient = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const patient = await Patient.findByPk(id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    // Only admin or the patient owner can update
    if (user.role !== "admin" && patient.user_id !== (user.user_id || user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized to update this patient" });
    }

    await patient.update(req.body);
    // If caller provided a phone value, update the linked User record as well
    if (req.body.phone) {
      try {
        const userRecord = await User.findByPk(patient.user_id);
        if (userRecord) {
          await userRecord.update({ phone: req.body.phone });
        }
      } catch (e) {
        console.warn("Could not update linked User.phone:", e.message);
      }
    }

    const updated = await Patient.findByPk(patient.patient_id, { include: [{ model: User, attributes: ["user_id", "email", "full_name", "phone"] }] });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updatePatient error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
