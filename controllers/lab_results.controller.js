const { LabResult, Appointment, Patient, User, Doctor, Bill } = require("../models");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

/**
 * ================================
 * LAB RESULTS CONTROLLER
 * ================================
 * Implements a comprehensive Laboratory Test Results system with:
 * - Secure lab test request creation by doctors
 * - Report file upload by authorized lab/admin personnel
 * - Role-based access control (Doctor, Patient, Admin, Lab Technician)
 * - File validation and secure storage
 * - Download functionality with authorization checks
 * - Advanced filtering, searching, and pagination
 */

// ========== FILE UPLOAD CONFIGURATION ==========
const uploadDir = path.join(__dirname, "../uploads/lab_reports");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for lab report file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter: Allow only PDF and image files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF and images (JPG, PNG) are allowed."), false);
  }
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * ================================
 * 1. GET ALL LAB RESULTS
 * ================================
 * Retrieves lab results with role-based filtering:
 * - DOCTOR: Sees results for patients under their care
 * - PATIENT: Sees only their own results
 * - ADMIN: Sees all results in the system
 *
 * Query Parameters (optional):
 *   - page: Page number for pagination (default: 1)
 *   - limit: Results per page (default: 10)
 */
exports.getLabResults = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10 } = req.query;
    let where = {};

    // ===== ROLE-BASED FILTERING =====
    if (user.role === "doctor") {
      // Doctors can only see results for their patients
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      if (!doctor) {
        return res.status(403).json({ success: false, message: "Doctor profile not found" });
      }

      // Get all appointments for this doctor
      const appointments = await Appointment.findAll({
        where: { doctor_id: doctor.doctor_id },
        attributes: ["appointment_id"],
        raw: true,
      });

      const appointmentIds = appointments.map((a) => a.appointment_id);
      if (appointmentIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: "No lab results found for your patients",
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }

      where.appointment_id = { [require("sequelize").Op.in]: appointmentIds };
    } else if (user.role === "patient") {
      // Patients can only see their own results
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      if (!patient) {
        return res.status(403).json({ success: false, message: "Patient profile not found" });
      }
      where.patient_id = patient.patient_id;
    }
    // Admin has access to all results (no where clause needed)

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await LabResult.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email", "phone"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              attributes: ["doctor_id"],
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("getLabResults error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lab results",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 2. GET LAB RESULTS BY PATIENT
 * ================================
 * Retrieves all lab results for a specific patient
 * Enforces access control:
 * - PATIENT: Can only view own results
 * - DOCTOR: Can view results for their patients
 * - ADMIN: Can view any patient's results
 *
 * Route Parameters:
 *   - patientId: UUID of the patient
 */
exports.getLabResultsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const user = req.user;

    // ===== AUTHORIZATION CHECK =====
    if (user.role === "patient") {
      // Patient can only view their own results
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      if (!patient || patient.patient_id !== patientId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Cannot access other patient's data",
        });
      }
    } else if (user.role === "doctor") {
      // Doctor can only view results for patients under their care
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      const appointments = await Appointment.findAll({
        where: { doctor_id: doctor.doctor_id, patient_id: patientId },
      });
      if (appointments.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This patient is not under your care",
        });
      }
    }
    // Admin has unrestricted access

    const labResults = await LabResult.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              attributes: ["doctor_id"],
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: labResults,
      count: labResults.length,
    });
  } catch (err) {
    console.error("getLabResultsByPatient error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient lab results",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 3. GET SINGLE LAB RESULT
 * ================================
 * Retrieves detailed information about a single lab result
 * Includes authorization check to prevent unauthorized access
 *
 * Route Parameters:
 *   - id: UUID of the lab result
 */
exports.getLabResult = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const labResult = await LabResult.findByPk(id, {
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email", "phone"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              attributes: ["doctor_id"],
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
    });

    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: "Lab result not found",
      });
    }

    // ===== AUTHORIZATION CHECK =====
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      if (!patient || labResult.patient_id !== patient.patient_id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Cannot access other patient's data",
        });
      }
    } else if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      const appointment = await Appointment.findOne({
        where: { appointment_id: labResult.appointment_id, doctor_id: doctor.doctor_id },
      });
      if (!appointment) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This patient is not under your care",
        });
      }
    }

    res.json({ success: true, data: labResult });
  } catch (err) {
    console.error("getLabResult error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lab result",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 4. CREATE LAB TEST REQUEST
 * ================================
 * Doctor or Admin creates a lab test request for a patient
 * Initial status is set to "Pending" until report is uploaded
 *
 * Authorized Roles: DOCTOR, ADMIN
 *
 * Request Body Example:
 * {
 *   "patient_id": "uuid-of-patient",
 *   "appointment_id": "uuid-of-appointment",
 *   "test_name": "Blood Type",
 *   "test_description": "Full blood count test",
 *   "test_category": "Blood Test"
 * }
 *
 * Response: Lab result object with status "pending"
 */
exports.createLabResult = async (req, res) => {
  try {
    const { patient_id, appointment_id, test_name, test_description, test_category } = req.body;
    const user = req.user;

    // ===== VALIDATION =====
    if (!patient_id || !test_name || !test_category) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: patient_id, test_name, test_category",
      });
    }

    // Verify patient exists
    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // ===== AUTHORIZATION & DOCTOR ASSIGNMENT =====
    let performed_by = null;

    if (appointment_id) {
      const appointment = await Appointment.findByPk(appointment_id);
      if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
      }

      // Verify doctor ownership of appointment
      if (user.role === "doctor") {
        const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
        if (appointment.doctor_id !== doctor.doctor_id) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized: Cannot request tests for other doctor's appointments",
          });
        }
        performed_by = doctor.doctor_id;
      } else if (user.role === "admin") {
        performed_by = appointment.doctor_id;
      } else {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only doctors and admins can create lab test requests",
        });
      }
    } else {
      // No appointment specified - get requesting doctor's ID
      if (user.role === "doctor") {
        const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
        if (!doctor) {
          return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }
        performed_by = doctor.doctor_id;
      } else if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Only doctors and admins can create lab test requests",
        });
      }
    }

    // ===== CREATE LAB TEST REQUEST =====
    const labResult = await LabResult.create({
      patient_id,
      appointment_id: appointment_id || null,
      test_name,
      test_description: test_description || null,
      test_category,
      performed_by,
      status: "pending", // Default: awaiting report upload
      result_status: "pending",
    });

    // ===== AUTO-CREATE BILL FOR LAB TEST =====
    try {
      // ✅ Different fees for different lab tests
      const labTestFees = {
        "Blood Test": 500,
        "X-Ray": 800,
        "Ultrasound": 1000,
        "CT Scan": 2000,
        "ECG": 400,
        "Glucose Test": 300,
        "Cholesterol Test": 400,
        "Thyroid Test": 500,
        "Liver Function Test": 600,
        "Kidney Function Test": 600,
        "Urine Test": 250,
        "Stool Test": 300,
        "COVID-19 Test": 200,
        "Pregnancy Test": 300,
        "Allergy Test": 700,
      };

      const labTestFee = labTestFees[test_name] || 500; // Default 500 if test not in list
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days due date

      const billData = {
        patient_id,
        lab_result_id: labResult.lab_result_id, // ✅ Link to lab test
        fee_type: "lab_test", // ✅ Mark as lab test, not consultation
        bill_type: "Lab Test",
        description: `Lab Test: ${test_name}`,
        total_amount: labTestFee,
        paid_amount: 0,
        status: "unpaid",
        due_date: dueDate,
        is_paid: false,
      };

      await Bill.create(billData);
      console.log(
        `✅ Auto-created Bill for lab test '${test_name}' with amount ৳${labTestFee} (Patient: ${patient_id}, Due: ${dueDate.toDateString()})`
      );
    } catch (billErr) {
      console.warn("⚠️  Warning: Could not auto-create bill for lab test:", billErr.message);
      // Don't block the lab test creation if bill creation fails
    }

    const newLabResult = await LabResult.findByPk(labResult.lab_result_id, {
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
    });

    // ✅ Get the actual fee that was charged
    const labTestFees = {
      "Blood Test": 500,
      "X-Ray": 800,
      "Ultrasound": 1000,
      "CT Scan": 2000,
      "ECG": 400,
      "Glucose Test": 300,
      "Cholesterol Test": 400,
      "Thyroid Test": 500,
      "Liver Function Test": 600,
      "Kidney Function Test": 600,
      "Urine Test": 250,
      "Stool Test": 300,
      "COVID-19 Test": 200,
      "Pregnancy Test": 300,
      "Allergy Test": 700,
    };
    const actualFee = labTestFees[test_name] || 500;

    res.status(201).json({
      success: true,
      message: `Lab test request created successfully. Bill auto-created (৳${actualFee}). Patient must pay to proceed. Awaiting report upload.`,
      data: newLabResult,
    });
  } catch (err) {
    console.error("createLabResult error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create lab result",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 5. UPLOAD LAB REPORT
 * ================================
 * Lab technician or admin uploads test report file
 * Automatically updates status from "Pending" to "Completed"
 * Validates file type and enforces file size limits
 *
 * Authorized Roles: ADMIN, LAB_TECHNICIAN
 *
 * Request: Multipart/form-data
 * - file: PDF or image file (max 10MB)
 * - result_value: Test result value (optional)
 * - unit: Measurement unit (optional)
 * - reference_range: Normal reference range (optional)
 * - result_status: "normal", "abnormal", "critical" (optional)
 * - notes: Additional notes (optional)
 *
 * Route Parameters:
 *   - id: UUID of the lab result
 */
exports.uploadLabReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { result_value, unit, reference_range, notes, result_status } = req.body;
    const user = req.user;

    // ===== FILE VALIDATION =====
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a PDF or image file.",
      });
    }

    // ===== FIND LAB RESULT =====
    const labResult = await LabResult.findByPk(id);
    if (!labResult) {
      // Clean up uploaded file if result not found
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
      return res.status(404).json({ success: false, message: "Lab result not found" });
    }

    // ===== AUTHORIZATION CHECK =====
    if (user.role !== "admin" && user.role !== "lab_technician") {
      // Delete uploaded file if unauthorized
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only lab technicians and admins can upload reports",
      });
    }

    // ===== DELETE OLD REPORT (if exists) =====
    if (labResult.report_file_path && fs.existsSync(labResult.report_file_path)) {
      fs.unlink(labResult.report_file_path, (err) => {
        if (err) console.warn("Warning: Could not delete old report file:", err);
      });
    }

    // ===== UPDATE LAB RESULT WITH REPORT =====
    const updatePayload = {
      report_file_path: req.file.path,
      status: "completed", // Mark as completed when report is uploaded
      result_status: result_status || "pending",
      result_value: result_value || null,
      unit: unit || null,
      reference_range: reference_range || null,
      notes: notes || null,
      result_date: new Date(),
      uploaded_by: user.user_id,
      lab_technician: `${user.full_name}`,
    };

    const updatedLabResult = await labResult.update(updatePayload);

    const enrichedResult = await LabResult.findByPk(id, {
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      message: "Lab report uploaded successfully. Status updated to 'Completed'.",
      data: enrichedResult,
    });
  } catch (err) {
    // Clean up file on error
    if (req.file) {
      fs.unlink(req.file.path, (errDelete) => {
        if (errDelete) console.error("Error deleting file:", errDelete);
      });
    }
    console.error("uploadLabReport error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload lab report",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 6. DOWNLOAD LAB REPORT
 * ================================
 * Patient or Doctor downloads completed lab report
 * Enforces strict authorization:
 * - PATIENT: Can download only own reports
 * - DOCTOR: Can download reports for patients under their care
 * - ADMIN: Can download any report
 *
 * Security: Report must be "completed" status to download
 *
 * Route Parameters:
 *   - id: UUID of the lab result
 */
exports.downloadLabReport = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // ===== FIND LAB RESULT =====
    const labResult = await LabResult.findByPk(id);
    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: "Lab result not found",
      });
    }

    // ===== CHECK IF REPORT EXISTS & IS COMPLETED =====
    if (!labResult.report_file_path || labResult.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Report not available or still pending. Please check back later.",
      });
    }

    // ===== AUTHORIZATION CHECK =====
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      if (!patient || labResult.patient_id !== patient.patient_id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Cannot download other patient's reports",
        });
      }
    } else if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      const appointment = await Appointment.findOne({
        where: { appointment_id: labResult.appointment_id, doctor_id: doctor.doctor_id },
      });
      if (!appointment) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This patient is not under your care",
        });
      }
    }

    // ===== VERIFY FILE EXISTS ON SERVER =====
    if (!fs.existsSync(labResult.report_file_path)) {
      return res.status(404).json({
        success: false,
        message: "Report file not found on server",
      });
    }

    // ===== SEND FILE TO CLIENT =====
    const fileName = path.basename(labResult.report_file_path);
    res.download(labResult.report_file_path, fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Error downloading file" });
        }
      }
    });
  } catch (err) {
    console.error("downloadLabReport error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to download report",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 7. UPDATE LAB RESULT METADATA
 * ================================
 * Doctor or Admin updates non-file fields like result status, notes, etc.
 * Cannot modify report file path through this endpoint (use upload endpoint instead)
 *
 * Authorized Roles: DOCTOR (own results), ADMIN (all results)
 *
 * Request Body (all optional):
 * {
 *   "result_status": "normal" | "abnormal" | "critical",
 *   "result_value": "value",
 *   "unit": "mg/dL",
 *   "reference_range": "70-100",
 *   "notes": "Additional clinical notes"
 * }
 */
exports.updateLabResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { result_status, result_value, unit, reference_range, notes } = req.body;
    const user = req.user;

    const labResult = await LabResult.findByPk(id);
    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: "Lab result not found",
      });
    }

    // ===== AUTHORIZATION CHECK =====
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      if (labResult.performed_by !== doctor.doctor_id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Cannot update other doctor's lab results",
        });
      }
    } else if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only doctors and admins can update lab results",
      });
    }

    // ===== UPDATE FIELDS =====
    const updatePayload = {};
    if (result_status) updatePayload.result_status = result_status;
    if (result_value) updatePayload.result_value = result_value;
    if (unit) updatePayload.unit = unit;
    if (reference_range) updatePayload.reference_range = reference_range;
    if (notes !== undefined) updatePayload.notes = notes;

    const updatedLabResult = await labResult.update(updatePayload);

    const enrichedResult = await LabResult.findByPk(id, {
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      message: "Lab result updated successfully",
      data: enrichedResult,
    });
  } catch (err) {
    console.error("updateLabResult error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update lab result",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 8. DELETE LAB RESULT
 * ================================
 * Admin only: Permanently delete a lab result and associated report file
 * This action is irreversible and should be used carefully
 *
 * Authorized Roles: ADMIN only
 *
 * Route Parameters:
 *   - id: UUID of the lab result to delete
 */
exports.deleteLabResult = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // ===== AUTHORIZATION CHECK =====
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can delete lab results",
      });
    }

    const labResult = await LabResult.findByPk(id);
    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: "Lab result not found",
      });
    }

    // ===== DELETE ASSOCIATED FILE =====
    if (labResult.report_file_path && fs.existsSync(labResult.report_file_path)) {
      fs.unlink(labResult.report_file_path, (err) => {
        if (err) console.warn("Warning: Could not delete report file:", err);
      });
    }

    // ===== DELETE DATABASE RECORD =====
    await labResult.destroy();

    res.json({
      success: true,
      message: "Lab result and associated report deleted successfully",
    });
  } catch (err) {
    console.error("deleteLabResult error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete lab result",
      error: err.message,
    });
  }
};

/**
 * ================================
 * 9. SEARCH & FILTER LAB RESULTS
 * ================================
 * Advanced search with multiple filter criteria and pagination
 * Role-based filtering is automatically applied
 *
 * Query Parameters:
 *   - status: "pending" | "completed"
 *   - result_status: "normal" | "abnormal" | "critical"
 *   - test_name: Search by test name (partial match)
 *   - test_category: Filter by category
 *   - patient_id: Filter by patient (Admin only)
 *   - doctor_id: Filter by doctor (Admin only)
 *   - page: Page number (default: 1)
 *   - limit: Results per page (default: 10)
 *
 * Example: /api/lab-results/search?status=completed&test_name=blood&page=1&limit=10
 */
exports.searchLabResults = async (req, res) => {
  try {
    const {
      status,
      result_status,
      test_name,
      test_category,
      patient_id,
      doctor_id,
      page = 1,
      limit = 10,
    } = req.query;
    const user = req.user;

    let where = {};

    // ===== ROLE-BASED FILTERING =====
    if (user.role === "patient") {
      const patient = await Patient.findOne({ where: { user_id: user.user_id } });
      where.patient_id = patient.patient_id;
    } else if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
      where.performed_by = doctor.doctor_id;
    }
    // Admin has no automatic restrictions

    // ===== APPLY SEARCH/FILTER PARAMETERS =====
    if (status) where.status = status.toLowerCase();
    if (result_status) where.result_status = result_status;
    if (test_name)
      where.test_name = { [require("sequelize").Op.iLike]: `%${test_name}%` };
    if (test_category) where.test_category = test_category;

    // Admin-only filters
    if (user.role === "admin") {
      if (patient_id) where.patient_id = patient_id;
      if (doctor_id) where.performed_by = doctor_id;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await LabResult.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "email"] }],
        },
        {
          model: Appointment,
          attributes: ["appointment_id", "doctor_id"],
          include: [
            {
              model: Doctor,
              include: [{ model: User, attributes: ["full_name"] }],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("searchLabResults error:", err);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: err.message,
    });
  }
};
