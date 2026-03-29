const { Department, Doctor, User } = require("../models");

// GET /api/public/departments
exports.getDepartmentsWithDoctors = async (req, res) => {
  try {
    // Public API: return essential doctor information for browsing/booking
    const depts = await Department.findAll({
      attributes: ["department_id", "name", "description"],
      include: [
        {
          model: Doctor,
          attributes: ["doctor_id", "specialty", "license_no", "available_hours", "available_days", "bio", "rating_cache", "department_id"],
          include: [
            { model: User, attributes: ["user_id", "full_name", "email", "phone"] },
            { model: Department, attributes: ["department_id", "name"] }
          ],
        },
      ],
      order: [["name", "ASC"]],
    });

    res.json({ success: true, data: depts });
  } catch (err) {
    console.error("Public API error:", err);
    res.status(500).json({ success: false, message: "Failed to load departments" });
  }
};

// GET /api/public/doctors/:id
exports.getDoctorPublic = async (req, res) => {
  try {
    const doc = await Doctor.findByPk(req.params.id, {
      attributes: ["doctor_id", "specialty", "license_no", "available_hours", "available_days", "bio", "rating_cache"],
      include: [
        { model: User, attributes: ["user_id", "email", "full_name", "phone"] },
        { model: Department, attributes: ["department_id", "name"] }
      ],
    });
    if (!doc) return res.status(404).json({ success: false, message: "Doctor not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error("Public doctor error:", err);
    res.status(500).json({ success: false, message: "Failed to load doctor" });
  }
};
