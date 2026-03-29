const { Appointment, Patient, Doctor, User, Bill } = require("../models");

exports.getAppointments = async (req, res) => {
  try {
    const user = req.user; // From auth middleware
    let where = {};

    // Filter by role: doctors see their appointments, patients see theirs, admins see all
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      where.doctor_id = doctor?.doctor_id;
    } else if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      where.patient_id = patient?.patient_id;
    }
    // admin role: no filter, see all

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email", "phone"] }] },
        { model: Doctor, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
      order: [["start_time", "ASC"]],
    });

    res.json({ success: true, data: appointments });
  } catch (err) {
    console.error("getAppointments error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const user = req.user;
    const { doctor_id, start_time } = req.body;

    // Get patient_id from current user
    const patient = await Patient.findOne({ where: { user_id: user.user_id } });
    if (!patient) {
      return res.status(400).json({ success: false, message: "Patient profile not found" });
    }

    // Validate doctor exists
    const doctor = await Doctor.findByPk(doctor_id);
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Doctor not found" });
    }

    // Check doctor's availability days if provided (expects comma-separated weekdays e.g. "Mon,Tue")
    if (doctor.available_days && start_time) {
      try {
        const dt = new Date(start_time);
        const weekdayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const dayLabel = weekdayNames[dt.getDay()];
        const allowed = doctor.available_days.split(",").map((s) => s.trim());
        if (allowed.length > 0 && !allowed.includes(dayLabel)) {
          return res.status(409).json({ success: false, message: `Doctor not available on ${dayLabel}` });
        }
      } catch (e) {
        // ignore parse errors and continue
      }
    }

    // Check for conflicting appointment (exact same start_time for same doctor)
    if (start_time) {
      const conflict = await Appointment.findOne({ where: { doctor_id, start_time } });
      if (conflict) {
        return res.status(409).json({ success: false, message: "Selected time slot is already booked" });
      }
    }

    const appointment = await Appointment.create({
      ...req.body,
      patient_id: patient.patient_id,
      status: "scheduled",
    });

    // Auto-create Bill when appointment is booked
    try {
      const defaultFee = 800; // 800 BDT standard consultation fee
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from issue
      
      const billData = {
        appointment_id: appointment.appointment_id,
        patient_id: patient.patient_id,
        fee_type: "consultation", // ✅ Mark as consultation, not lab test
        total_amount: defaultFee,
        payment_status: "unpaid",
        issue_date: issueDate,
        due_date: dueDate,
      };
      await Bill.create(billData);
      console.log(`Auto-created Bill for appointment ${appointment.appointment_id} with amount ৳${defaultFee} (Due: ${dueDate.toDateString()})`);
    } catch (billErr) {
      console.warn("Failed to auto-create bill during appointment booking:", billErr.message);
      // Don't fail the appointment creation if billing fails; just log and continue
    }

    const apptWithData = await Appointment.findByPk(appointment.appointment_id, {
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: Doctor, include: [{ model: User }] },
      ],
    });

    res.status(201).json({ success: true, data: apptWithData });
  } catch (err) {
    console.error("createAppointment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const user = req.user;
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Only doctor (if it's their appt), patient, or admin can update
    const doctor = user.role === "doctor" ? await Doctor.findOne({ where: { user_id: user.user_id } }) : null;
    const patient = user.role === "patient" ? await Patient.findOne({ where: { user_id: user.user_id } }) : null;

    const isOwner =
      (user.role === "doctor" && doctor && doctor.doctor_id === appointment.doctor_id) ||
      (user.role === "patient" && patient && patient.patient_id === appointment.patient_id) ||
      user.role === "admin";

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Not authorized to update this appointment" });
    }

    const previousStatus = appointment.status;
    await appointment.update(req.body);

    // Auto-create Bill if appointment is marked as "completed" and no bill exists yet
    if (req.body.status === "completed" && previousStatus !== "completed") {
      try {
        const existingBill = await Bill.findOne({ where: { appointment_id: appointment.appointment_id } });
        if (!existingBill) {
          // Default consultation fee in Bangladeshi Taka (BDT)
          const defaultFee = 800; // 800 BDT standard consultation fee
          const issueDate = new Date();
          const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from issue
          
          const billData = {
            appointment_id: appointment.appointment_id,
            patient_id: appointment.patient_id,
            fee_type: "consultation", // ✅ Mark as consultation, not lab test
            total_amount: defaultFee,
            payment_status: "unpaid",
            issue_date: issueDate,
            due_date: dueDate,
          };
          await Bill.create(billData);
          console.log(`Auto-created Bill for appointment ${appointment.appointment_id} (Due: ${dueDate.toDateString()})`);
        }
      } catch (billErr) {
        console.warn("Failed to auto-create bill:", billErr.message);
        // Don't fail the appointment update if billing fails; just log and continue
      }
    }

    const updatedAppt = await Appointment.findByPk(appointment.appointment_id, {
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: Doctor, include: [{ model: User }] },
      ],
    });

    res.json({ success: true, data: updatedAppt });
  } catch (err) {
    console.error("updateAppointment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const user = req.user;
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Only patient or admin can delete
    if (user.role !== "admin" && user.role !== "patient") {
      return res.status(403).json({ success: false, message: "Only admin or patient can delete appointments" });
    }

    await appointment.destroy();
    res.json({ success: true, message: "Appointment deleted" });
  } catch (err) {
    console.error("deleteAppointment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
