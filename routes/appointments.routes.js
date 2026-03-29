const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require("../controllers/appointments.controller");

// Allow doctors, patients, and admins to view their own appointments
router.get("/", auth, getAppointments);
router.post("/", auth, role("patient"), createAppointment);
router.patch("/:id", auth, updateAppointment);
router.put("/:id", auth, updateAppointment);
router.delete("/:id", auth, deleteAppointment);

module.exports = router;
