const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Prescription, Doctor, Patient, User, Bill } = require("../models");
let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  nodemailer = null;
}

exports.getPrescriptions = async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    // Filter by role: doctors see their prescriptions, patients see theirs, admins see all
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      where.doctor_id = doctor?.doctor_id;
    } else if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      where.patient_id = patient?.patient_id;
    }

    const prescriptions = await Prescription.findAll({
      where,
      include: [
        { model: Doctor, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
      order: [["issued_at", "DESC"]],
    });

    res.json({ success: true, data: prescriptions });
  } catch (err) {
    console.error("getPrescriptions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPrescription = async (req, res) => {
  try {
    const user = req.user;
    const { patient_id } = req.body;

    // Get doctor_id from current user if doctor
    let doctor_id = req.body.doctor_id;
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      doctor_id = doctor?.doctor_id;
    }

    // ⚠️ Check if patient has any unpaid bills before allowing prescription
    const unpaidBills = await Bill.findOne({
      where: {
        patient_id: patient_id,
        payment_status: "unpaid"
      }
    });
    
    if (unpaidBills) {
      return res.status(402).json({
        success: false,
        message: "Cannot send prescription: Patient has unpaid bills. Please request payment before issuing prescription.",
        unpaidAmount: unpaidBills.total_amount,
        billId: unpaidBills.bill_id
      });
    }

    // Build snapshots for doctor and patient to store on the prescription
    const doctor = await Doctor.findOne({ where: { user_id: user.user_id }, include: [{ model: User }] });
    const patient = await Patient.findOne({ where: { patient_id }, include: [{ model: User }] });

    const doctorSnapshot = {
      doctor_id: doctor?.doctor_id,
      name: doctor?.User?.full_name,
      email: doctor?.User?.email,
      specialty: doctor?.specialty,
    };

    const patientSnapshot = {
      patient_id: patient?.patient_id,
      name: patient?.User?.full_name,
      email: patient?.User?.email,
      dob: patient?.dob,
      gender: patient?.gender,
    };

    // medications should be an array of objects in req.body.medications
    const meds = Array.isArray(req.body.medications) ? req.body.medications : [];

    const prescription = await Prescription.create({
      medications: meds,
      advice: req.body.advice || "",
      doctor_snapshot: doctorSnapshot,
      patient_snapshot: patientSnapshot,
      appointment_id: req.body.appointment_id || null,
      doctor_id,
      patient_id,
      issued_at: new Date(),
      downloadable_flag: true,
    });

    // generate PDF and save to uploads/prescriptions/<id>.pdf
    try {
      const uploadsDir = path.join(__dirname, "..", "uploads", "prescriptions");
      fs.mkdirSync(uploadsDir, { recursive: true });
      const fileName = `${prescription.prescription_id}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      console.log("📄 Starting PDF generation for prescription:", prescription.prescription_id);
      console.log("📄 Doctor snapshot:", doctorSnapshot);
      console.log("📄 Patient snapshot:", patientSnapshot);
      console.log("📄 Medications:", meds);
      console.log("📄 Advice:", prescription.advice);

      await new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
          const stream = fs.createWriteStream(filePath);
          
          // Handle stream errors
          stream.on("error", (err) => {
            console.error("❌ Stream error:", err);
            reject(err);
          });

          doc.on("error", (err) => {
            console.error("❌ PDFDocument error:", err);
            reject(err);
          });

          doc.pipe(stream);

          // Header - Doctor Details
          doc.fontSize(18).font("Helvetica-Bold").text((doctorSnapshot.name || "Doctor").toString(), { align: "left" });
          doc.fontSize(11).font("Helvetica").fillColor("#666");
          if (doctorSnapshot.specialty) doc.text((doctorSnapshot.specialty || "").toString());
          if (doctorSnapshot.email) doc.text(`Email: ${(doctorSnapshot.email || "").toString()}`);
          doc.moveDown();

          // Prescription Issue Details
          doc.fontSize(10).fillColor("#333").text(`Prescription Issued: ${new Date(prescription.issued_at).toLocaleDateString()}`);
          doc.text(`Prescription ID: ${prescription.prescription_id}`);
          doc.moveDown();

          // Patient Info Section
          doc.fontSize(14).font("Helvetica-Bold").text("Patient Information", { underline: true });
          doc.fontSize(11).font("Helvetica").fillColor("#000");
          doc.text(`Name: ${(patientSnapshot.name || "N/A").toString()}`);
          doc.text(`Email: ${(patientSnapshot.email || "N/A").toString()}`);
          doc.text(`DOB: ${(patientSnapshot.dob || "N/A").toString()}   |   Gender: ${(patientSnapshot.gender || "N/A").toString()}`);
          doc.moveDown();

          // Medications Section
          doc.fontSize(14).font("Helvetica-Bold").text("Medications & Dosage", { underline: true });
          doc.fontSize(11).font("Helvetica").fillColor("#000");
          
          if (meds && meds.length > 0) {
            meds.forEach((m, idx) => {
              const medName = (m.medication_name || m.name || "Unknown").toString();
              const dosage = (m.dosage || "").toString();
              const frequency = (m.frequency || "").toString();
              doc.font("Helvetica-Bold").text(`${idx + 1}. ${medName}`, { continued: false });
              doc.font("Helvetica").text(`    Dosage: ${dosage}`);
              doc.text(`    Frequency: ${frequency}`);
              if (m.notes) {
                doc.fillColor("#666").text(`    Notes: ${(m.notes || "").toString()}`);
                doc.fillColor("#000");
              }
              doc.moveDown(0.3);
            });
          } else {
            doc.text("No medications prescribed");
          }
          doc.moveDown();

          // Advice / Instructions Section
          if (prescription.advice) {
            doc.fontSize(14).font("Helvetica-Bold").text("Doctor's Instructions", { underline: true });
            doc.fontSize(11).font("Helvetica").fillColor("#000").text((prescription.advice || "").toString());
            doc.moveDown();
          }

          // Footer
          doc.fontSize(9).fillColor("#999");
          doc.text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
          doc.text("This is a digital prescription issued by Healthcare Management System", { align: "center" });
          
          console.log("📄 Ending PDF document");
          doc.end();

          stream.on("finish", () => {
            console.log("✅ PDF generation complete:", filePath);
            resolve();
          });
        } catch (err) {
          console.error("❌ Error in PDF generation promise:", err);
          reject(err);
        }
      });

      // Update prescription with file_url
      const publicPath = `/uploads/prescriptions/${prescription.prescription_id}.pdf`;
      prescription.file_url = publicPath;
      await prescription.save();
      console.log("✅ Prescription saved with file_url:", publicPath);

      // Optionally send email with attachment if SMTP configured
      if (nodemailer && process.env.SMTP_HOST) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: process.env.SMTP_USER
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined,
          });

          if (patientSnapshot.email) {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || (doctorSnapshot.email || "no-reply@localhost"),
              to: patientSnapshot.email,
              subject: `Prescription from ${doctorSnapshot.name}`,
              text: `Dear ${patientSnapshot.name || "Patient"},\n\nPlease find your prescription attached.\n\nRegards, ${doctorSnapshot.name}`,
              attachments: [
                { filename: `${prescription.prescription_id}.pdf`, path: path.join(__dirname, "..", "uploads", "prescriptions", `${prescription.prescription_id}.pdf`) },
              ],
            });
          }
        } catch (emailErr) {
          console.warn("Failed to send prescription email:", emailErr.message);
        }
      }
    } catch (pdfErr) {
      console.error("❌ Failed to generate prescription PDF:", pdfErr.message);
      console.error("❌ PDF Error Stack:", pdfErr.stack);
    }

    const prescWithData = await Prescription.findByPk(prescription.prescription_id, {
      include: [
        { model: Doctor, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
    });

    res.status(201).json({ success: true, data: prescWithData });
  } catch (err) {
    console.error("createPrescription error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id, {
      include: [
        { model: Doctor, include: [{ model: User, attributes: ["full_name", "email"] }] },
        { model: Patient, include: [{ model: User, attributes: ["full_name", "email"] }] },
      ],
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    res.json({ success: true, data: prescription });
  } catch (err) {
    console.error("getPrescription error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
