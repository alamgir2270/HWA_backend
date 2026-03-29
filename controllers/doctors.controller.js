const { Doctor, User, Department } = require("../models");

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        { model: User, attributes: ["user_id", "email", "full_name", "phone"] },
        { model: Department, attributes: ["department_id", "name"] }
      ],
    });
    
    // Format response to include department names
    const formattedDoctors = doctors.map(doc => {
      const docData = doc.toJSON();
      if (docData.Department) {
        docData.department = docData.Department.name;
      }
      return docData;
    });
    
    res.json({ success: true, data: formattedDoctors });
  } catch (err) {
    console.error("getAllDoctors error:", err);
    res.status(500).json({ success: false, message: "Failed to load doctors" });
  }
};

exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ["user_id", "email", "full_name", "phone"] },
        { model: Department, attributes: ["department_id", "name"] }
      ],
    });
    if (!doctor)
      return res.status(404).json({ success: false, message: "Doctor not found" });
    
    // Format response to include department name
    const docData = doctor.toJSON();
    if (docData.Department) {
      docData.department = docData.Department.name;
    }
    
    res.json({ success: true, data: docData });
  } catch (err) {
    console.error("getDoctor error:", err);
    res.status(500).json({ success: false, message: "Failed to load doctor" });
  }
};

// Get current authenticated doctor's profile
exports.getCurrentDoctor = async (req, res) => {
  try {
    const user = req.user;
    const doctor = await Doctor.findOne({ 
      where: { user_id: user.user_id || user.id }, 
      include: [
        { model: User, attributes: ["user_id", "email", "full_name", "phone"] },
        { model: Department, attributes: ["department_id", "name"] }
      ] 
    });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
    
    // Format response to include department name
    const doctorData = doctor.toJSON();
    if (doctorData.Department) {
      doctorData.department = doctorData.Department.name;
    }
    
    res.json({ success: true, data: doctorData });
  } catch (err) {
    console.error("getCurrentDoctor error:", err);
    res.status(500).json({ success: false, message: "Failed to load doctor" });
  }
};

// Ensure a doctor profile exists for the authenticated user. Creates a minimal profile if missing.
exports.ensureDoctor = async (req, res) => {
  try {
    const user = req.user;
    const existingDoctor = await Doctor.findOne({ where: { user_id: user.user_id || user.id } });
    if (!existingDoctor) {
      await Doctor.create({ user_id: user.user_id || user.id });
    }
    res.json({ success: true, message: "Doctor profile ensured" });
  } catch (err) {
    console.error("ensureDoctor error:", err);
    res.status(500).json({ success: false, message: "Failed to ensure doctor profile" });
  }
};

// Update a doctor's profile (self or admin)
exports.updateDoctor = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    // Only admin or the doctor owner can update
    if (user.role !== "admin" && doctor.user_id !== (user.user_id || user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized to update this doctor" });
    }

    // Update doctor fields
    await doctor.update(req.body);

    // If admin or owner provided user-level fields, update linked User record as well
    const userUpdates = {};
    if (req.body.email) userUpdates.email = req.body.email;
    if (req.body.full_name) userUpdates.full_name = req.body.full_name;
    if (req.body.phone) userUpdates.phone = req.body.phone;
    if (Object.keys(userUpdates).length > 0) {
      try {
        const userRecord = await User.findByPk(doctor.user_id);
        if (userRecord) await userRecord.update(userUpdates);
      } catch (e) {
        console.warn('Failed updating linked User for doctor:', e.message);
      }
    }

    const updated = await Doctor.findByPk(doctor.doctor_id, { include: [{ model: User, attributes: ["user_id", "email", "full_name", "phone"] }] });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateDoctor error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
