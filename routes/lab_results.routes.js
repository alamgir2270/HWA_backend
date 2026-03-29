const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const {
  getLabResults,
  createLabResult,
  updateLabResult,
  getLabResult,
  getLabResultsByPatient,
  uploadLabReport,
  downloadLabReport,
  deleteLabResult,
  searchLabResults,
  upload,
} = require("../controllers/lab_results.controller");

/**
 * ================================
 * LAB RESULTS API ROUTES
 * ================================
 * Comprehensive endpoints for laboratory test requests and result management
 *
 * WORKFLOW:
 * 1. Doctor creates test request (POST /api/lab-results)
 * 2. Lab technician uploads report (PUT /api/lab-results/:id/upload)
 * 3. Patient/Doctor downloads report (GET /api/lab-results/:id/download)
 * 4. Filter & search results (GET /api/lab-results/search)
 */

// ===== SPECIFIC ROUTES FIRST (before generic :id route) =====

// ===== SEARCH & FILTER LAB RESULTS =====
// GET /api/lab-results/search?status=completed&test_name=blood&page=1&limit=10
// Supports: status, result_status, test_name, test_category, patient_id (admin), doctor_id (admin)
router.get("/search", auth, searchLabResults);

// ===== GET LAB RESULTS FOR SPECIFIC PATIENT =====
// GET /api/lab-results/patient/:patientId
// Auth: Patient (own), Doctor (patients under care), Admin
router.get("/patient/:patientId", auth, getLabResultsByPatient);

// ===== GET SINGLE LAB RESULT =====
// GET /api/lab-results/:id
// Returns full details including patient, doctor, and metadata
router.get("/:id", auth, getLabResult);

// ===== GET ALL LAB RESULTS (with pagination) =====
// GET /api/lab-results?page=1&limit=10
// Role-based: Doctor sees own patients, Patient sees own, Admin sees all
router.get("/", auth, getLabResults);

// ===== CREATE LAB TEST REQUEST =====
// POST /api/lab-results
// Role: Doctor, Admin
// Body: { patient_id, appointment_id (optional), test_name, test_description, test_category }
// Returns: Lab result with status "pending"
router.post("/", auth, role(["doctor", "admin"]), createLabResult);

// ===== UPLOAD LAB REPORT =====
// PUT /api/lab-results/:id/upload
// Role: Admin, Lab Technician
// Content-Type: multipart/form-data
// Body: file (PDF/Image), result_value, unit, reference_range, result_status, notes
// Auto-updates status to "completed" when report uploaded
router.put(
  "/:id/upload",
  auth,
  role(["admin", "lab_technician"]),
  upload.single("file"),
  uploadLabReport
);

// ===== UPDATE LAB RESULT METADATA =====
// PUT /api/lab-results/:id
// Role: Doctor (own), Admin
// Body: { result_status, result_value, unit, reference_range, notes }
// Note: Use /upload endpoint to update report file
router.put("/:id", auth, role(["doctor", "admin"]), updateLabResult);

// ===== DOWNLOAD LAB REPORT =====
// GET /api/lab-results/:id/download
// Role: Patient (own), Doctor (patients under care), Admin
// Returns: Binary file (PDF or image)
// Security: Only completed reports can be downloaded
router.get("/:id/download", auth, downloadLabReport);

// ===== DELETE LAB RESULT =====
// DELETE /api/lab-results/:id
// Role: Admin only
// Deletes record and associated report file
router.delete("/:id", auth, role(["admin"]), deleteLabResult);

module.exports = router;
