const express = require("express");
const router = express.Router();
const healthStatusController = require("../controllers/health_status.controller");
const auth = require("../middleware/auth.middleware");

// All routes require authentication
router.use(auth);

// GET /api/health-status - Get all health status records (filtered by role)
router.get("/", healthStatusController.getHealthStatus);

// GET /api/health-status/patient/:patientId - Get health status for a specific patient
router.get("/patient/:patientId", healthStatusController.getPatientHealthStatus);

// POST /api/health-status - Create new health status record
router.post("/", healthStatusController.createHealthStatus);

// PUT /api/health-status/:id - Update health status record
router.put("/:id", healthStatusController.updateHealthStatus);

// DELETE /api/health-status/:id - Delete health status record
router.delete("/:id", healthStatusController.deleteHealthStatus);

module.exports = router;