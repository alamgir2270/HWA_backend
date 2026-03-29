# 🧪 LABORATORY TEST RESULTS FEATURE - IMPLEMENTATION GUIDE

## 📋 TABLE OF CONTENTS
1. [Feature Overview](#feature-overview)
2. [Architecture & Flow](#architecture--flow)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Security Implementation](#security-implementation)
6. [File Upload Handling](#file-upload-handling)
7. [Role-Based Access Control](#role-based-access-control)
8. [Frontend Components](#frontend-components)
9. [Error Handling](#error-handling)
10. [Testing Guide](#testing-guide)
11. [Deployment Checklist](#deployment-checklist)

---

## 🎯 FEATURE OVERVIEW

### Objective
Implement a secure and structured Laboratory Test Results system where:
- **Doctors** can request lab tests for their patients
- **Lab technicians/Admins** can upload reports (PDF/images)
- **Patients** can securely access and download their results
- **Admins** can manage and monitor all test results

### Core Capabilities
✅ Secure lab test request creation  
✅ File upload with validation (PDF, JPG, PNG)  
✅ Role-based access control  
✅ Report download with authorization checks  
✅ Status tracking (Pending → Completed)  
✅ Search, filter, and pagination  
✅ Comprehensive audit trail  

---

## 🏗️ ARCHITECTURE & FLOW

### Workflow Diagram
```
DOCTOR                          SYSTEM                      PATIENT
  │                               │                           │
  ├─ Requests Lab Test ──────────>│                           │
  │                               │ Creates test (status:     │
  │                               │ "pending")                │
  │                               │                           │
  │                      LAB TECHNICIAN                       │
  │                               │                           │
  │                               │<── Uploads Report ────────│
  │                               │ (file + metadata)         │
  │                               │ Status: "completed"       │
  │                               │                           │
  │<──── View Result ─────────────│                           │
  │                               ├─── Report Ready ────────>│
  │                               │                           │
  │                               │<──── Download Report ─────│
```

### Component Layers
```
┌──────────────────────────────────────────────────────┐
│              FRONTEND LAYER                           │
├──────────────────────────────────────────────────────┤
│  LabResultsManagement.jsx (Doctor)                   │
│  PatientLabResults.jsx (Patient)                     │
├──────────────────────────────────────────────────────┤
│              API LAYER                                │
├──────────────────────────────────────────────────────┤
│  /api/lab-results/* (Routes)                         │
├──────────────────────────────────────────────────────┤
│              CONTROLLER LAYER                         │
├──────────────────────────────────────────────────────┤
│  lab_results.controller.js (9 functions)             │
├──────────────────────────────────────────────────────┤
│              MODEL & DATABASE LAYER                   │
├──────────────────────────────────────────────────────┤
│  LabResult Model (Sequelize ORM)                     │
│  lab_results Table (PostgreSQL/MySQL)                │
├──────────────────────────────────────────────────────┤
│              FILE STORAGE LAYER                       │
├──────────────────────────────────────────────────────┤
│  /uploads/lab_reports/ (Server filesystem)           │
└──────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA

### LabResult Model Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lab_result_id` | UUID | ✓ | Primary key, auto-generated |
| `patient_id` | UUID | ✓ | Foreign key to Patient |
| `appointment_id` | UUID | | Optional: Link to appointment |
| `performed_by` | UUID | | Doctor who ordered the test |
| `test_name` | VARCHAR(150) | ✓ | Name of the test |
| `test_description` | TEXT | | Detailed description |
| `test_category` | ENUM | ✓ | Blood Test, Imaging, etc. |
| `result_value` | VARCHAR(100) | | Test result (numeric/text) |
| `unit` | VARCHAR(50) | | Measurement unit (mg/dL, etc.) |
| `reference_range` | VARCHAR(100) | | Normal range for comparison |
| `result_status` | ENUM | | normal, abnormal, critical, pending |
| `result_date` | DATE | | When test was performed |
| `report_file_path` | VARCHAR(255) | | Server path to report file |
| `status` | ENUM | ✓ | pending, completed, cancelled |
| `lab_technician` | VARCHAR(150) | | Name of technician |
| `lab_location` | VARCHAR(200) | | Laboratory name/location |
| `uploaded_by` | UUID | | User who uploaded report |
| `notes` | TEXT | | Clinical or technical notes |
| `created_at` | TIMESTAMP | ✓ | Record creation time |
| `updated_at` | TIMESTAMP | ✓ | Last update time |

### Relationships
```javascript
LabResult.belongsTo(Patient)          // Many-to-One
LabResult.belongsTo(Doctor)           // Many-to-One (via performed_by)
LabResult.belongsTo(Appointment)      // Many-to-One (optional)
LabResult.belongsTo(User)             // Many-to-One (via uploaded_by)
```

---

## 📡 API ENDPOINTS

### 1. Get All Lab Results
```http
GET /api/lab-results?page=1&limit=10
Authorization: Bearer <token>
```
- **Role:** DOCTOR, PATIENT, ADMIN
- **Response:** Paginated list with role-based filtering
- **Status Codes:** 200, 403, 500

### 2. Get Results for Specific Patient
```http
GET /api/lab-results/patient/:patientId
Authorization: Bearer <token>
```
- **Role:** PATIENT, DOCTOR (for own patients), ADMIN
- **Response:** All results for specified patient
- **Validation:** Patient access control enforced

### 3. Get Single Lab Result
```http
GET /api/lab-results/:id
Authorization: Bearer <token>
```
- **Role:** DOCTOR, PATIENT (own), ADMIN
- **Response:** Complete lab result with details
- **Authorization:** Checks patient access rights

### 4. Create Lab Test Request
```http
POST /api/lab-results
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "patient_id": "uuid",
  "appointment_id": "uuid or null",
  "test_name": "Blood Type",
  "test_category": "Blood Test",
  "test_description": "Optional description"
}
```
- **Role:** DOCTOR, ADMIN
- **Status:** pending (awaiting report)
- **Response:** 201 Created with new lab result

### 5. Upload Lab Report
```http
PUT /api/lab-results/:id/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- file (required): PDF or image (max 10MB)
- result_value (optional)
- unit (optional)
- reference_range (optional)
- result_status (optional)
- notes (optional)
```
- **Role:** ADMIN, LAB_TECHNICIAN
- **Auto-update:** Status → "completed"
- **File Storage:** `/uploads/lab_reports/`

### 6. Download Lab Report
```http
GET /api/lab-results/:id/download
Authorization: Bearer <token>
```
- **Role:** PATIENT (own), DOCTOR (own patients), ADMIN
- **Security:** Only completed reports downloadable
- **Response:** Binary file (PDF/image)

### 7. Update Lab Result Metadata
```http
PUT /api/lab-results/:id
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "result_status": "abnormal",
  "result_value": "120",
  "unit": "mg/dL",
  "reference_range": "70-100",
  "notes": "Updated notes"
}
```
- **Role:** DOCTOR (own), ADMIN
- **Note:** For file updates, use /upload endpoint

### 8. Delete Lab Result
```http
DELETE /api/lab-results/:id
Authorization: Bearer <token>
```
- **Role:** ADMIN only
- **Warning:** Irreversible action
- **Side Effect:** Removes associated file

### 9. Search & Filter Results
```http
GET /api/lab-results/search?status=completed&test_name=blood&page=1&limit=10
Authorization: Bearer <token>
```
- **Query Params:** status, result_status, test_name, test_category, page, limit
- **Admin Only:** patient_id, doctor_id filters
- **Response:** Filtered paginated results

---

## 🔐 SECURITY IMPLEMENTATION

### Authentication & Authorization

#### Role-Based Access Control
```javascript
// Middleware enforcement
router.post("/", auth, role(["doctor", "admin"]), createLabResult);
router.put("/:id/upload", auth, role(["admin", "lab_technician"]), uploadLabReport);
router.get("/", auth, getLabResults); // Role-based filtering in controller

// Controller-level authorization
if (user.role === "patient") {
  // Patient can only see own results
  where.patient_id = patientId;
} else if (user.role === "doctor") {
  // Doctor can only see their patients' results
  where.appointment_id = doctorAppointmentIds;
}
```

### File Upload Security
```javascript
// Multer configuration
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png"
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

### Data Privacy

#### Patient Data Protection
- Patients cannot access other patients' data
- All patient queries filtered by `user_id`
- Download requires ownership verification

#### Doctor Data Restriction
- Doctors only see patients from their appointments
- Cannot request tests for non-patient doctors
- Updates limited to own test requests

#### Admin Oversight
- Admins have unrestricted read access
- Delete operations require confirmed intent
- All admin actions should be logged

### File Security
```javascript
// Prevent directory traversal
const fileName = path.basename(req.file.path); // Safe
// NOT: req.file.filename (could contain ../)

// Unique file naming
const uniqueName = `${Date.now()}-${randomString()}-${originalName}`;

// Path validation on download
const filePath = labResult.report_file_path;
if (!fs.existsSync(filePath)) {
  return res.status(404).json({ error: "File not found" });
}
```

---

## 📁 FILE UPLOAD HANDLING

### Directory Structure
```
Healthcare_web/
├── hwm_backend/
│   ├── uploads/
│   │   └── lab_reports/
│   │       ├── 1708942234567-a1b2c3d4-bloodtest.pdf
│   │       ├── 1708942345678-e5f6g7h8-imaging.jpg
│   │       └── 1708942456789-i9j0k1l2-xray.png
│   └── server.js
└── hwm_frontend/
```

### Upload Flow
```javascript
// Backend: File saved with unique name
const uniqueName = `${Date.now()}-${randomString()}-${file.originalname}`;
const filePath = `/uploads/lab_reports/${uniqueName}`; // Relative path

// Database: Store path reference
labResult.report_file_path = filePath;
labResult.status = "completed";

// Frontend: Download by requesting endpoint
GET /api/lab-results/:id/download
// Backend returns file via res.download()
```

### File Cleanup
```javascript
// Old report deleted when new one uploaded
if (labResult.report_file_path && fs.existsSync(oldPath)) {
  fs.unlink(oldPath, (err) => {
    if (err) console.warn("Could not delete old file");
  });
}

// Files deleted when result deleted
if (labResult.report_file_path) {
  fs.unlink(labResult.report_file_path, (err) => { ... });
}
```

---

## 👥 ROLE-BASED ACCESS CONTROL

### Permission Matrix

| Action | Doctor | Patient | Admin | Lab Tech |
|--------|--------|---------|-------|----------|
| Create Test Request | Own patients only | ✗ | ✓ | ✗ |
| Upload Report | ✗ | ✗ | ✓ | ✓ |
| View Results | Own patients only | Own only | ✓ | ✗ |
| Download Report | Own patients only | Own only | ✓ | ✗ |
| Update Metadata | Own results only | ✗ | ✓ | ✗ |
| Delete Result | ✗ | ✗ | ✓ | ✗ |
| Search All | ✗ | ✗ | ✓ | ✗ |

### Implementation Examples

#### Doctor Access Control
```javascript
// Doctor creates test
const doctor = await Doctor.findOne({ where: { user_id: user.user_id } });
if (appointment.doctor_id !== doctor.doctor_id) {
  return res.status(403).json({ message: "Cannot request for other doctor's patients" });
}

// Doctor views results
const appointments = await Appointment.findAll({ where: { doctor_id: doctor.doctor_id } });
where.appointment_id = { [Op.in]: appointmentIds };
```

#### Patient Access Control
```javascript
// Patient views own results only
const patient = await Patient.findOne({ where: { user_id: user.user_id } });
if (patient.patient_id !== labResult.patient_id) {
  return res.status(403).json({ message: "Cannot access other patient's data" });
}
```

#### Lab Tech Upload
```javascript
if (user.role !== "admin" && user.role !== "lab_technician") {
  return res.status(403).json({ message: "Only lab techs can upload" });
}
```

---

## 🎨 FRONTEND COMPONENTS

### Doctor Component: LabResultsManagement.jsx
**Location:** `src/pages/doctor/LabResultsManagement.jsx`

**Features:**
- Request new lab tests with patient selection
- View pending and completed tests
- Upload test reports with metadata
- Filter by status and test name
- Pagination and search

**Key Functions:**
```javascript
fetchLabResults()           // Get all tests for doctor's patients
handleCreateTestRequest()   // Submit new test request
handleUploadReport()        // Upload PDF/image report
filteredResults             // Client-side filtering
```

### Patient Component: PatientLabResults.jsx
**Location:** `src/pages/patient/LabResults.jsx`

**Features:**
- View all personal lab results
- Filter by status (Pending/Completed)
- Search by test name
- View result details
- Download completed reports

**Key Functions:**
```javascript
fetchLabResults()           // Get patient's tests
handleDownloadReport()      // Secure report download
filteredResults             // Client-side filtering
PatientLabResultCard()      // Result card component
DetailRow()                 // Details modal component
```

### Component Integration
```javascript
// In Doctor Dashboard
import LabResultsManagement from "./LabResultsManagement";

// In Patient Dashboard
import PatientLabResults from "../patient/LabResults";

// Route setup
<Route path="/doctor/lab-results" element={<LabResultsManagement />} />
<Route path="/patient/lab-results" element={<PatientLabResults />} />
```

---

## ⚠️ ERROR HANDLING

### Error Status Codes
```javascript
400 Bad Request      // Missing fields, invalid file type
403 Forbidden        // Authorization denied
404 Not Found        // Resource not found
500 Internal Server  // Server error
```

### Common Errors & Solutions

#### File Upload Errors
```javascript
// Error: "No file uploaded"
// Solution: Check form has enctype="multipart/form-data"
<form encType="multipart/form-data">
  <input type="file" name="file" required />
</form>

// Error: "Invalid file type"
// Solution: Only upload PDF or images
// Allowed: .pdf, .jpg, .jpeg, .png
// Max size: 10MB

// Error: File too large
// Solution: Compress PDF or image
```

#### Authorization Errors
```javascript
// Error: "Unauthorized: Cannot access other patient's data"
// Solution: Patient can only view own results
// Use /api/lab-results (filtered by system)

// Error: "Only lab technicians can upload reports"
// Solution: Request admin/lab_technician role
```

#### Report Download Errors
```javascript
// Error: "Report not available or still pending"
// Solution: Wait for lab tech to upload report
// Check status in list view

// Error: "Report file not found on server"
// Solution: Contact admin - file may be deleted
```

---

## 🧪 TESTING GUIDE

### Manual Testing Checklist

#### 1. Test Request Creation
- [ ] Doctor can create test request
- [ ] Test defaults to "pending" status
- [ ] Patient selection works
- [ ] Appointment linking is optional
- [ ] Required fields validation works

#### 2. Report Upload
- [ ] Lab tech can upload PDF
- [ ] Lab tech can upload JPG
- [ ] Lab tech can upload PNG
- [ ] File size validation works (reject >10MB)
- [ ] Status auto-updates to "completed"
- [ ] Old report deleted on new upload
- [ ] Patient cannot upload report

#### 3. Download & Viewing
- [ ] Patient can download own completed report
- [ ] Patient cannot download pending report
- [ ] Patient cannot access other patient's report
- [ ] Doctor can download for own patients
- [ ] Admin can download any report
- [ ] File downloads with correct name

#### 4. Search & Filter
- [ ] Filter by pending status
- [ ] Filter by completed status
- [ ] Search by test name
- [ ] Pagination works
- [ ] Role-based filtering correct

#### 5. Security
- [ ] Patient data isolation enforced
- [ ] Doctor access limited to own patients
- [ ] Lab tech can only upload
- [ ] Admin has full access
- [ ] Unauthorized access rejected

### API Testing (cURL)

#### Create Test Request
```bash
curl -X POST http://localhost:5000/api/lab-results \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "patient-uuid",
    "test_name": "Blood Type",
    "test_category": "Blood Test"
  }'
```

#### Upload Report
```bash
curl -X PUT http://localhost:5000/api/lab-results/lab-id/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@report.pdf" \
  -F "result_status=normal" \
  -F "result_value=O+" \
  -F "unit=Blood type"
```

#### Download Report
```bash
curl -X GET http://localhost:5000/api/lab-results/lab-id/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_report.pdf
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All endpoints tested and working
- [ ] File upload validated (PDF, JPG, PNG only)
- [ ] File size limit enforced (10MB)
- [ ] Authorization checks in place
- [ ] Error messages clear and helpful
- [ ] Database migrations run
- [ ] Environment variables configured

### Deployment Steps
1. **Backend Changes**
   - [ ] Update `lab_results.controller.js` with new code
   - [ ] Update `lab_results.routes.js` with all endpoints
   - [ ] Update `lab_results.model.js` with proper fields
   - [ ] Migrate database (if schema changed)
   - [ ] Test all API endpoints

2. **Frontend Changes**
   - [ ] Create `LabResultsManagement.jsx` (doctor)
   - [ ] Create `PatientLabResults.jsx` (patient)
   - [ ] Update routing files to include new routes
   - [ ] Test file upload functionality
   - [ ] Verify authorization checks work

3. **File System**
   - [ ] Create `/uploads/lab_reports/` directory
   - [ ] Set proper permissions (readable by node process)
   - [ ] Ensure write access for file uploads
   - [ ] Configure backup for uploaded files

4. **Configuration**
   - [ ] Set `VITE_API_URL` in frontend .env
   - [ ] Verify multer configuration in backend
   - [ ] Check file size limits
   - [ ] Confirm upload directory path

5. **Testing**
   - [ ] Create test lab request
   - [ ] Upload test report
   - [ ] Download completed report
   - [ ] Verify access controls
   - [ ] Check error handling

6. **Monitoring**
   - [ ] Monitor uploaded files size
   - [ ] Check error logs
   - [ ] Verify authorization logs
   - [ ] Monitor server disk space

### Post-Deployment
- [ ] Monitor system for errors
- [ ] Check uploaded file integrity
- [ ] Verify access logs
- [ ] Get user feedback
- [ ] Plan regular maintenance

---

## 📚 ADDITIONAL RESOURCES

### Files Created/Modified
- **Backend:**
  - `/hwm_backend/controllers/lab_results.controller.js` (Enhanced)
  - `/hwm_backend/routes/lab_results.routes.js` (Enhanced)
  - `/hwm_backend/models/lab_results.model.js` (Enhanced)
  - `/hwm_backend/API_DOCUMENTATION_LAB_RESULTS.js` (New)

- **Frontend:**
  - `/hwm_frontend/src/pages/doctor/LabResultsManagement.jsx` (New)
  - `/hwm_frontend/src/pages/patient/LabResults.jsx` (New)

### Related Documentation
- API Documentation: `API_DOCUMENTATION_LAB_RESULTS.js`
- Database Schema: See model file associations
- Security Guide: See Security Implementation section

---

## 🎓 LEARNING OUTCOMES

After implementing this feature, you will understand:
✓ Role-based access control implementation  
✓ File upload handling with validation  
✓ Secure authorization checks  
✓ RESTful API design principles  
✓ React component state management  
✓ Database relationships and queries  
✓ Error handling best practices  
✓ Frontend-backend integration  

---

## 📞 SUPPORT

For issues or questions:
1. Check error messages and error handling section
2. Review API documentation
3. Verify authorization and authentication
4. Check file permissions and uploads directory
5. Review browser console and server logs

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-27  
**Status:** Production Ready
