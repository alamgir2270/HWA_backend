const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const { getMedicalHistory, createMedicalHistory, getMedicalHistoryEntry } = require("../controllers/medical_history.controller");

router.get("/", auth, getMedicalHistory);
router.post("/", auth, role(["doctor","admin"]), createMedicalHistory);
router.get("/:id", auth, getMedicalHistoryEntry);

module.exports = router;
