const router = require("express").Router();
const { register, login, forgotPassword, resetPassword, changePassword } = require("../controllers/auth.controller");
const validators = require("../middleware/validation.middleware");
const authenticate = require("../middleware/auth.middleware");

router.post("/register", validators.registerValidator, register);
router.post("/login", validators.loginValidator, login);
router.post("/forgot-password", validators.forgotPasswordValidator, forgotPassword);
router.post("/reset-password", validators.resetPasswordValidator, resetPassword);
router.post("/change-password", authenticate, changePassword);

module.exports = router;
