const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const { getAllPatients, getPatient, ensurePatient, getCurrentPatient, updatePatient } = require("../controllers/patients.controller");

router.get("/", auth, role(["doctor", "admin"]), getAllPatients);
router.post("/ensure", auth, ensurePatient);
router.get("/me", auth, getCurrentPatient);
router.get("/:id", auth, getPatient);
router.patch("/:id", auth, updatePatient);

module.exports = router;
