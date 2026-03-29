const router = require("express").Router();
const publicController = require("../controllers/public.controller");

// Public endpoints (no auth)
router.get("/departments", publicController.getDepartmentsWithDoctors);
router.get("/doctors/:id", publicController.getDoctorPublic);

module.exports = router;
