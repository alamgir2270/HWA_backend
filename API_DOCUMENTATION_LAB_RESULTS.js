/**
 * ================================================
 * LABORATORY TEST RESULTS - API DOCUMENTATION
 * ================================================
 * 
 * Comprehensive API guide for the Laboratory Test Results feature
 * Includes role-based access control, file upload, and secure data handling
 * 
 * Version: 1.0
 * Last Updated: 2026-02-27
 * Base URL: http://localhost:5000/api/lab-results
 */

// ================================================
// 1. GET ALL LAB RESULTS (Paginated)
// ================================================
/**
 * GET /api/lab-results?page=1&limit=10
 * 
 * Retrieves lab results with role-based filtering and pagination
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: 
 *   - DOCTOR: Views results for their patients only
 *   - PATIENT: Views their own results only
 *   - ADMIN: Views all results
 * 
 * Query Parameters:
 *   - page (integer, optional): Page number (default: 1)
 *   - limit (integer, optional): Results per page (default: 10)
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "lab_result_id": "uuid",
 *       "patient_id": "uuid",
 *       "appointment_id": "uuid or null",
 *       "test_name": "Blood Type",
 *       "test_category": "Blood Test",
 *       "test_description": "Complete blood count test",
 *       "status": "pending|completed", // Test request status
 *       "result_status": "normal|abnormal|critical|pending", // Result interpretation
 *       "result_value": "O+",
 *       "unit": "Blood type",
 *       "reference_range": "Standard blood groups",
 *       "result_date": "2026-02-27",
 *       "report_file_path": "/uploads/lab_reports/file.pdf or null",
 *       "notes": "Additional clinical notes",
 *       "lab_technician": "John Smith",
 *       "lab_location": "XYZ Laboratory",
 *       "performed_by": "doctor-uuid",
 *       "created_at": "2026-02-27T10:00:00Z",
 *       "updated_at": "2026-02-27T10:30:00Z",
 *       "Patient": { ... patient data ... },
 *       "Doctor": { ... doctor data ... }
 *     }
 *   ],
 *   "count": 10,
 *   "pagination": {
 *     "total": 45,
 *     "page": 1,
 *     "limit": 10,
 *     "totalPages": 5
 *   }
 * }
 * 
 * Error: 403 Forbidden
 * {
 *   "success": false,
 *   "message": "Unauthorized: Cannot access other patient's data"
 * }
 */

// ================================================
// 2. GET LAB RESULTS FOR SPECIFIC PATIENT
// ================================================
/**
 * GET /api/lab-results/patient/:patientId
 * 
 * Retrieves all lab results for a specific patient
 * 
 * Authentication: Required (Bearer Token)
 * Authorization:
 *   - PATIENT: Can access only own results
 *   - DOCTOR: Can access results for patients under their care
 *   - ADMIN: Can access any patient's results
 * 
 * Path Parameters:
 *   - patientId (UUID): ID of the patient
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": [ ... array of lab results ... ],
 *   "count": 5
 * }
 * 
 * Error: 403 Forbidden
 * {
 *   "success": false,
 *   "message": "Unauthorized: This patient is not under your care"
 * }
 */

// ================================================
// 3. GET SINGLE LAB RESULT
// ================================================
/**
 * GET /api/lab-results/:id
 * 
 * Retrieves detailed information about a single lab result
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: Same as GET /patient/:patientId
 * 
 * Path Parameters:
 *   - id (UUID): Lab result ID
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": { ... complete lab result object ... }
 * }
 * 
 * Error: 404 Not Found
 * {
 *   "success": false,
 *   "message": "Lab result not found"
 * }
 * 
 * Error: 403 Forbidden
 * {
 *   "success": false,
 *   "message": "Unauthorized: Cannot access other patient's data"
 * }
 */

// ================================================
// 4. CREATE LAB TEST REQUEST
// ================================================
/**
 * POST /api/lab-results
 * 
 * Doctor or Admin creates a new lab test request for a patient
 * Test starts with status: "pending" (awaiting report upload)
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: DOCTOR, ADMIN only
 * 
 * Request Body (application/json):
 * {
 *   "patient_id": "uuid-of-patient", // REQUIRED
 *   "appointment_id": "uuid-or-null", // Optional: link to specific appointment
 *   "test_name": "Blood Type", // REQUIRED: Name of the test
 *   "test_category": "Blood Test", // REQUIRED: One of enum values
 *   "test_description": "Complete blood count" // Optional: Detailed description
 * }
 * 
 * Allowed Test Categories:
 *   - "Blood Test"
 *   - "Urine Test"
 *   - "Imaging"
 *   - "ECG"
 *   - "X-Ray"
 *   - "Ultrasound"
 *   - "CT Scan"
 *   - "MRI"
 *   - "Other"
 * 
 * Response: 201 Created
 * {
 *   "success": true,
 *   "message": "Lab test request created successfully. Awaiting report upload.",
 *   "data": {
 *     "lab_result_id": "newly-created-uuid",
 *     "patient_id": "patient-uuid",
 *     "test_name": "Blood Type",
 *     "test_category": "Blood Test",
 *     "status": "pending",
 *     "result_status": "pending",
 *     "performed_by": "doctor-uuid",
 *     "created_at": "2026-02-27T10:00:00Z",
 *     "updated_at": "2026-02-27T10:00:00Z",
 *     "Patient": { ... patient data ... },
 *     "Doctor": { ... doctor data ... }
 *   }
 * }
 * 
 * Error: 400 Bad Request
 * {
 *   "success": false,
 *   "message": "Missing required fields: patient_id, test_name, test_category"
 * }
 * 
 * Error: 403 Forbidden (Doctor requesting for wrong patient)
 * {
 *   "success": false,
 *   "message": "Unauthorized: Cannot request tests for other doctor's appointments"
 * }
 */

// ================================================
// 5. UPLOAD LAB REPORT
// ================================================
/**
 * PUT /api/lab-results/:id/upload
 * 
 * Lab technician or admin uploads test report file and marks as "completed"
 * Automatically updates status from "pending" to "completed"
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: ADMIN, LAB_TECHNICIAN only
 * 
 * Request: Content-Type: multipart/form-data
 * 
 * Path Parameters:
 *   - id (UUID): Lab result ID
 * 
 * Form Fields:
 *   - file (File, REQUIRED): PDF or image file (max 10MB)
 *     Allowed MIME types:
 *       - application/pdf
 *       - image/jpeg
 *       - image/png
 *       - image/jpg
 *   
 *   - result_value (string, optional): Numeric or text result
 *     Example: "120", "O+" "Normal", etc.
 *   
 *   - unit (string, optional): Unit of measurement
 *     Example: "mg/dL", "mmol/L", "Blood type", etc.
 *   
 *   - reference_range (string, optional): Normal reference for comparison
 *     Example: "70-100", "95-105", "Standard groups", etc.
 *   
 *   - result_status (string, optional): Result interpretation
 *     Values: "normal", "abnormal", "critical", "pending"
 *     Default: "pending"
 *   
 *   - notes (string, optional): Additional clinical notes
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "message": "Lab report uploaded successfully. Status updated to 'Completed'.",
 *   "data": {
 *     "lab_result_id": "uuid",
 *     "status": "completed", // CHANGED from "pending"
 *     "result_status": "abnormal", // From request body
 *     "result_value": "150",
 *     "unit": "mg/dL",
 *     "reference_range": "70-100",
 *     "report_file_path": "/uploads/lab_reports/...",
 *     "lab_technician": "Jane Doe",
 *     "result_date": "2026-02-27",
 *     "uploaded_by": "technician-uuid",
 *     "updated_at": "2026-02-27T15:30:00Z",
 *     ... rest of lab result data ...
 *   }
 * }
 * 
 * Error: 400 Bad Request
 * {
 *   "success": false,
 *   "message": "No file uploaded. Please attach a PDF or image file."
 * }
 * 
 * Error: 400 Bad Request (File too large)
 * {
 *   "success": false,
 *   "message": "Invalid file type. Only PDF and images (JPG, PNG) are allowed."
 * }
 * 
 * Error: 403 Forbidden (Unauthorized role)
 * {
 *   "success": false,
 *   "message": "Unauthorized: Only lab technicians and admins can upload reports"
 * }
 * 
 * Error: 404 Not Found
 * {
 *   "success": false,
 *   "message": "Lab result not found"
 * }
 */

// ================================================
// 6. DOWNLOAD LAB REPORT
// ================================================
/**
 * GET /api/lab-results/:id/download
 * 
 * Patient, Doctor, or Admin downloads completed lab report
 * Strict Authorization: 
 *   - Only completed reports can be downloaded
 *   - Patients can only download their own reports
 *   - Doctors can download for patients under their care
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: PATIENT, DOCTOR, ADMIN
 * 
 * Path Parameters:
 *   - id (UUID): Lab result ID
 * 
 * Response: 200 OK
 * - Binary file (application/pdf or image/jpeg or image/png)
 * - Content-Disposition: attachment; filename="lab-report-uuid.pdf"
 * 
 * Error: 404 Not Found
 * {
 *   "success": false,
 *   "message": "Lab result not found"
 * }
 * 
 * Error: 400 Bad Request (Report pending)
 * {
 *   "success": false,
 *   "message": "Report not available or still pending. Please check back later."
 * }
 * 
 * Error: 403 Forbidden
 * {
 *   "success": false,
 *   "message": "Unauthorized: Cannot download other patient's reports"
 * }
 * 
 * Error: 404 Not Found (File deleted)
 * {
 *   "success": false,
 *   "message": "Report file not found on server"
 * }
 */

// ================================================
// 7. UPDATE LAB RESULT METADATA
// ================================================
/**
 * PUT /api/lab-results/:id
 * 
 * Doctor or Admin updates lab result metadata (non-file fields)
 * Does NOT update the report file (use /upload endpoint for that)
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: DOCTOR (own results), ADMIN (all results)
 * 
 * Request Body (application/json, all fields optional):
 * {
 *   "result_status": "abnormal", // "normal", "abnormal", "critical", "pending"
 *   "result_value": "125", // New result value
 *   "unit": "mg/dL", // New unit
 *   "reference_range": "70-100", // New reference range
 *   "notes": "Updated clinical notes" // Updated notes
 * }
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "message": "Lab result updated successfully",
 *   "data": { ... updated lab result object ... }
 * }
 * 
 * Error: 404 Not Found
 * {
 *   "success": false,
 *   "message": "Lab result not found"
 * }
 * 
 * Error: 403 Forbidden
 * {
 *   "success": false,
 *   "message": "Unauthorized: Cannot update other doctor's lab results"
 * }
 */

// ================================================
// 8. DELETE LAB RESULT
// ================================================
/**
 * DELETE /api/lab-results/:id
 * 
 * Admin only: Permanently delete a lab result and associated report file
 * This action is IRREVERSIBLE
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: ADMIN only
 * 
 * Path Parameters:
 *   - id (UUID): Lab result ID
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "message": "Lab result and associated report deleted successfully"
 * }
 * 
 * Error: 403 Forbidden
 * {
 *   "success": false,
 *   "message": "Unauthorized: Only admins can delete lab results"
 * }
 * 
 * Error: 404 Not Found
 * {
 *   "success": false,
 *   "message": "Lab result not found"
 * }
 */

// ================================================
// 9. SEARCH & FILTER LAB RESULTS
// ================================================
/**
 * GET /api/lab-results/search?status=completed&test_name=blood&page=1&limit=10
 * 
 * Advanced search with multiple filter criteria and pagination
 * Role-based filtering automatically applied
 * 
 * Authentication: Required (Bearer Token)
 * Authorization: Same as GET /api/lab-results
 * 
 * Query Parameters (all optional):
 *   - status (string): "pending" or "completed"
 *   - result_status (string): "normal", "abnormal", "critical", "pending"
 *   - test_name (string): Partial search in test name (case-insensitive)
 *   - test_category (string): Exact category match
 *   - patient_id (string): Filter by patient (ADMIN ONLY)
 *   - doctor_id (string): Filter by doctor (ADMIN ONLY)
 *   - page (integer): Page number (default: 1)
 *   - limit (integer): Results per page (default: 10)
 * 
 * Example Searches:
 *   - GET /api/lab-results/search?status=pending
 *   - GET /api/lab-results/search?test_name=blood&page=1&limit=20
 *   - GET /api/lab-results/search?status=completed&result_status=abnormal
 *   - GET /api/lab-results/search?test_category=Imaging
 *   - GET /api/lab-results/search?patient_id=xxx&doctor_id=yyy (ADMIN only)
 * 
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": [ ... filtered lab results ... ],
 *   "pagination": {
 *     "total": 15,
 *     "page": 1,
 *     "limit": 10,
 *     "totalPages": 2
 *   }
 * }
 * 
 * Error: 500 Internal Server Error
 * {
 *   "success": false,
 *   "message": "Search failed",
 *   "error": "Error details..."
 * }
 */

// ================================================
// WORKFLOW EXAMPLES
// ================================================

/**
 * COMPLETE WORKFLOW: LAB TEST REQUEST TO RESULT DELIVERY
 * 
 * 1. DOCTOR CREATES TEST REQUEST
 *    POST /api/lab-results
 *    - Doctor selects patient
 *    - Enters test name, category, description
 *    - Status becomes "pending" (awaiting lab report)
 * 
 * 2. LAB TECHNICIAN UPLOADS REPORT
 *    PUT /api/lab-results/{id}/upload
 *    - Uploads PDF or image file with test report
 *    - Optionally enters result value, unit, reference range
 *    - Status auto-updates to "completed"
 * 
 * 3. PATIENT VIEWS & DOWNLOADS REPORT
 *    GET /api/lab-results (list all own results)
 *    GET /api/lab-results/{id} (view single result details)
 *    GET /api/lab-results/{id}/download (download report file)
 * 
 * 4. DOCTOR REVIEWS RESULTS
 *    GET /api/lab-results (doctor sees only their patients' results)
 *    PUT /api/lab-results/{id} (optionally update notes or status)
 */

// ================================================
// SECURITY RULES & BEST PRACTICES
// ================================================

/**
 * AUTHENTICATION:
 * - All endpoints require Bearer token in Authorization header
 * - Format: Authorization: Bearer <token>
 * 
 * FILE UPLOAD SECURITY:
 * - Maximum file size: 10MB
 * - Allowed types: PDF, JPG, PNG only
 * - Files stored securely in: /uploads/lab_reports/
 * - File names randomized to prevent directory traversal
 * - Old reports automatically deleted when new report uploaded
 * 
 * DATA PRIVACY:
 * - Patients cannot access other patients' data
 * - Doctors limited to their patients only
 * - Admins have unrestricted access
 * - All access logged and auditable
 * 
 * FILE SECURITY:
 * - Files only downloadable if status = "completed"
 * - File download path validated to prevent traversal attacks
 * - Downloaded file name unique per result
 * 
 * ERROR HANDLING:
 * - Use status codes consistently (400, 403, 404, 500)
 * - Return meaningful error messages
 * - Never expose server file paths to clients
 * - Log all errors with context
 */

// ================================================
// FRONTEND INTEGRATION EXAMPLES
// ================================================

/**
 * JAVASCRIPT - CREATE LAB TEST REQUEST
 * 
 * const createLabTest = async (patientId, testName, testCategory) => {
 *   const headers = {
 *     'Authorization': `Bearer ${localStorage.getItem('token')}`,
 *     'Content-Type': 'application/json'
 *   };
 * 
 *   const response = await fetch('http://localhost:5000/api/lab-results', {
 *     method: 'POST',
 *     headers,
 *     body: JSON.stringify({
 *       patient_id: patientId,
 *       test_name: testName,
 *       test_category: testCategory
 *     })
 *   });
 * 
 *   const data = await response.json();
 *   return data;
 * }
 */

/**
 * JAVASCRIPT - UPLOAD REPORT
 * 
 * const uploadReport = async (labResultId, file) => {
 *   const formData = new FormData();
 *   formData.append('file', file);
 *   formData.append('result_value', '120');
 *   formData.append('unit', 'mg/dL');
 *   formData.append('result_status', 'normal');
 * 
 *   const headers = {
 *     'Authorization': `Bearer ${localStorage.getItem('token')}`
 *     // Do NOT set Content-Type - browser will set it with boundary
 *   };
 * 
 *   const response = await fetch(
 *     `http://localhost:5000/api/lab-results/${labResultId}/upload`,
 *     { method: 'PUT', headers, body: formData }
 *   );
 * 
 *   return await response.json();
 * }
 */

/**
 * JAVASCRIPT - DOWNLOAD REPORT
 * 
 * const downloadReport = async (labResultId) => {
 *   const headers = {
 *     'Authorization': `Bearer ${localStorage.getItem('token')}`
 *   };
 * 
 *   const response = await fetch(
 *     `http://localhost:5000/api/lab-results/${labResultId}/download`,
 *     { headers }
 *   );
 * 
 *   const blob = await response.blob();
 *   const url = window.URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = 'lab-report.pdf';
 *   a.click();
 * }
 */

// ================================================
// STATUS CODES REFERENCE
// ================================================

/**
 * 200 OK - Request successful
 * 201 Created - Resource created successfully
 * 400 Bad Request - Invalid input or missing fields
 * 403 Forbidden - Unauthorized access (insufficient permissions)
 * 404 Not Found - Resource not found
 * 500 Internal Server Error - Server-side error
 */

module.exports = {
  description: "Laboratory Test Results API Documentation",
  version: "1.0",
  lastUpdated: "2026-02-27",
};
