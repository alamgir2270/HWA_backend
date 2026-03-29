// Validation utilities for healthcare app
const { body, param, validationResult } = require("express-validator");

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for different entities
 */
const validators = {
  // AUTH VALIDATORS
  registerValidator: [
    body("email")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain uppercase, lowercase, and number"
      ),
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be 2-100 characters"),
    body("role")
      .optional()
      .isIn(["patient", "doctor", "admin"])
      .withMessage("Invalid role"),
    handleValidationErrors,
  ],

  loginValidator: [
    body("email")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password is required"),
    handleValidationErrors,
  ],

  forgotPasswordValidator: [
    body("email")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    handleValidationErrors,
  ],

  resetPasswordValidator: [
    body("token")
      .notEmpty()
      .withMessage("Reset token is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain uppercase, lowercase, and number"
      ),
    handleValidationErrors,
  ],

  // PATIENT VALIDATORS
  createPatientValidator: [
    body("user_id")
      .isUUID()
      .withMessage("Invalid user ID format"),
    body("dob")
      .isDate()
      .withMessage("Invalid date of birth")
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error("Date of birth cannot be in future");
        }
        return true;
      }),
    body("gender")
      .isIn(["male", "female", "other"])
      .withMessage("Invalid gender"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("emergency_contact")
      .optional()
      .isMobilePhone()
      .withMessage("Invalid phone number"),
    handleValidationErrors,
  ],

  // DOCTOR VALIDATORS
  createDoctorValidator: [
    body("user_id")
      .isUUID()
      .withMessage("Invalid user ID format"),
    body("specialty")
      .trim()
      .notEmpty()
      .withMessage("Specialty is required")
      .isLength({ max: 100 })
      .withMessage("Specialty must be less than 100 characters"),
    body("license_no")
      .trim()
      .notEmpty()
      .withMessage("License number is required")
      .isLength({ max: 100 })
      .withMessage("License number must be less than 100 characters"),
    body("department_id")
      .optional()
      .isUUID()
      .withMessage("Invalid department ID"),
    handleValidationErrors,
  ],

  // APPOINTMENT VALIDATORS
  createAppointmentValidator: [
    body("patient_id")
      .isUUID()
      .withMessage("Invalid patient ID"),
    body("doctor_id")
      .isUUID()
      .withMessage("Invalid doctor ID"),
    body("appointment_date")
      .isISO8601()
      .withMessage("Invalid date format")
      .custom((value) => {
        if (new Date(value) < new Date()) {
          throw new Error("Appointment date cannot be in past");
        }
        return true;
      }),
    body("status")
      .optional()
      .isIn(["scheduled", "completed", "cancelled", "no_show"])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be less than 500 characters"),
    handleValidationErrors,
  ],

  // PRESCRIPTION VALIDATORS
  createPrescriptionValidator: [
    body("patient_id")
      .isUUID()
      .withMessage("Invalid patient ID"),
    body("doctor_id")
      .isUUID()
      .withMessage("Invalid doctor ID"),
    body("medication_name")
      .trim()
      .notEmpty()
      .withMessage("Medication name is required"),
    body("dosage")
      .trim()
      .notEmpty()
      .withMessage("Dosage is required"),
    body("frequency")
      .trim()
      .notEmpty()
      .withMessage("Frequency is required"),
    body("start_date")
      .isISO8601()
      .withMessage("Invalid start date"),
    body("end_date")
      .optional()
      .isISO8601()
      .withMessage("Invalid end date")
      .custom((value, { req }) => {
        if (value && new Date(value) < new Date(req.body.start_date)) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
    handleValidationErrors,
  ],

  // ID VALIDATORS
  uuidParamValidator: [
    param("id")
      .isUUID()
      .withMessage("Invalid ID format"),
    handleValidationErrors,
  ],

  // PAGINATION VALIDATORS
  paginationValidator: [
    body("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be >= 1"),
    body("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    handleValidationErrors,
  ],
};

module.exports = validators;
