const { MedicalHistory, Patient, User } = require("../models");

exports.getMedicalHistory = async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    // Filter by role: doctors see their patients' history, patients see theirs, admins see all
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      where.patient_id = patient?.patient_id;
    } else if (user.role === "doctor") {
      // Doctors can view history (filtered implicitly - may need appointments join)
      // For now, return empty or implement more complex query
      return res.json({ success: true, data: [] });
    }

    const history = await MedicalHistory.findAll({
      where,
      order: [["recorded_at", "DESC"]],
    });

    res.json({ success: true, data: history });
  } catch (err) {
    console.error("getMedicalHistory error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMedicalHistory = async (req, res) => {
  try {
    const user = req.user;
    const { patient_id, entry_type, description } = req.body;

    const history = await MedicalHistory.create({
      patient_id,
      entry_type,
      description,
      recorded_at: new Date(),
      recorded_by: user.user_id,
    });

    res.status(201).json({ success: true, data: history });
  } catch (err) {
    console.error("createMedicalHistory error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMedicalHistoryEntry = async (req, res) => {
  try {
    const history = await MedicalHistory.findByPk(req.params.id);

    if (!history) {
      return res.status(404).json({ success: false, message: "Medical history entry not found" });
    }

    res.json({ success: true, data: history });
  } catch (err) {
    console.error("getMedicalHistoryEntry error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
