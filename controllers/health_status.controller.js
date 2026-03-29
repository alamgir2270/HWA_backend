const { HealthStatus, Patient, User } = require("../models");

exports.getHealthStatus = async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    // Filter by role: patients see their own, doctors see their patients', admins see all
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      where.patient_id = patient?.patient_id;
    } else if (user.role === "doctor") {
      // For now, doctors can see all health status (could be filtered by their patients later)
      // This can be enhanced to only show patients assigned to the doctor
    }

    const healthStatuses = await HealthStatus.findAll({
      where,
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email"] }],
        },
        {
          model: User,
          as: "recordedBy",
          attributes: ["full_name"],
          required: false,
        },
      ],
      order: [["recorded_date", "DESC"], ["created_at", "DESC"]],
    });

    res.json({ success: true, data: healthStatuses });
  } catch (err) {
    console.error("getHealthStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPatientHealthStatus = async (req, res) => {
  try {
    const user = req.user;
    const { patientId } = req.params;

    // Find the patient
    const patient = await Patient.findOne({
      where: { patient_id: patientId },
      include: [{ model: User, attributes: ["full_name", "email"] }],
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Check permissions
    if (user.role === "patient" && patient.user_id !== user.user_id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const healthStatuses = await HealthStatus.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: User,
          as: "recordedBy",
          attributes: ["full_name"],
          required: false,
        },
      ],
      order: [["recorded_date", "DESC"]],
    });

    // Get latest health status
    const latestStatus = healthStatuses.length > 0 ? healthStatuses[0] : null;

    res.json({
      success: true,
      data: {
        patient: patient,
        healthStatuses: healthStatuses,
        latestStatus: latestStatus,
      },
    });
  } catch (err) {
    console.error("getPatientHealthStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createHealthStatus = async (req, res) => {
  try {
    const user = req.user;
    const {
      patient_id,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      temperature,
      weight_kg,
      height_cm,
      target_weight_kg,
      exercise_minutes_week,
      water_intake_liters,
      notes,
      doctor_recommendations,
      recorded_date,
    } = req.body;

    // Calculate BMI if weight and height are provided
    let bmi = null;
    if (weight_kg && height_cm) {
      const height_m = height_cm / 100;
      bmi = (weight_kg / (height_m * height_m)).toFixed(1);
    }

    // Determine overall status based on vitals
    let overall_status = "good";
    let risk_level = "low";

    if (bmi) {
      if (bmi < 18.5 || bmi > 30) {
        overall_status = "fair";
        risk_level = "moderate";
      }
      if (bmi < 16 || bmi > 35) {
        overall_status = "poor";
        risk_level = "high";
      }
    }

    if (blood_pressure_systolic && blood_pressure_diastolic) {
      if (blood_pressure_systolic >= 140 || blood_pressure_diastolic >= 90) {
        overall_status = "fair";
        risk_level = "moderate";
      }
      if (blood_pressure_systolic >= 160 || blood_pressure_diastolic >= 100) {
        overall_status = "poor";
        risk_level = "high";
      }
    }

    const healthStatus = await HealthStatus.create({
      patient_id,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      temperature,
      weight_kg,
      height_cm,
      bmi,
      overall_status,
      risk_level,
      target_weight_kg,
      exercise_minutes_week,
      water_intake_liters,
      notes,
      doctor_recommendations,
      recorded_date: recorded_date || new Date(),
      recorded_by: user.role === "doctor" || user.role === "admin" ? user.user_id : null,
    });

    res.status(201).json({ success: true, data: healthStatus });
  } catch (err) {
    console.error("createHealthStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateHealthStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updates = req.body;

    const healthStatus = await HealthStatus.findByPk(id);
    if (!healthStatus) {
      return res.status(404).json({ success: false, message: "Health status not found" });
    }

    // Check permissions - only doctors and admins can update, or the patient themselves
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      if (healthStatus.patient_id !== patient?.patient_id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    // Recalculate BMI if weight or height changed
    if (updates.weight_kg || updates.height_cm || healthStatus.weight_kg || healthStatus.height_cm) {
      const weight = updates.weight_kg || healthStatus.weight_kg;
      const height = updates.height_cm || healthStatus.height_cm;
      if (weight && height) {
        const height_m = height / 100;
        updates.bmi = (weight / (height_m * height_m)).toFixed(1);
      }
    }

    await healthStatus.update(updates);
    res.json({ success: true, data: healthStatus });
  } catch (err) {
    console.error("updateHealthStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteHealthStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const healthStatus = await HealthStatus.findByPk(id);
    if (!healthStatus) {
      return res.status(404).json({ success: false, message: "Health status not found" });
    }

    // Check permissions - only doctors and admins can delete
    if (user.role !== "doctor" && user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await healthStatus.destroy();
    res.json({ success: true, message: "Health status deleted successfully" });
  } catch (err) {
    console.error("deleteHealthStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};