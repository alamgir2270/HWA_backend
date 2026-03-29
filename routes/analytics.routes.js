/**
 * Analytics Routes
 * All routes require authentication and admin role
 */

const router = require("express").Router();
const analyticsController = require("../controllers/analytics.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// Apply auth and admin role check to all analytics routes
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// Dashboard Overview
router.get("/dashboard", analyticsController.getDashboardStats);

// Appointment Analytics
router.get("/appointments/stats", analyticsController.getAppointmentStats);

// Doctor Performance
router.get("/doctors/performance", analyticsController.getDoctorPerformance);

// Revenue & Billing
router.get("/revenue", analyticsController.getRevenueStats);

// User Growth
router.get("/users/growth", analyticsController.getUserGrowth);

// Prescription Statistics
router.get("/prescriptions/stats", analyticsController.getPrescriptionStats);

// System Health
router.get("/system/health", analyticsController.getSystemHealth);

module.exports = router;
