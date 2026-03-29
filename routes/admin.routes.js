const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const { createDoctor, getProfile, updateProfile, updateDepartment } = require("../controllers/admin.controller");

// Admin-only routes
router.post("/doctors", auth, role(["admin"]), createDoctor);
router.get("/profile", auth, role(["admin"]), getProfile);
router.put("/profile", auth, role(["admin"]), updateProfile);
router.put("/departments/:department_id", auth, role(["admin"]), updateDepartment);

module.exports = router;
