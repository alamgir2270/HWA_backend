const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Patient, Doctor } = require("../models");

exports.register = async (req, res) => {
  try {
    const { email, password, name, mobile } = req.body;

    // ⚠️ SECURITY: Only allow patient registration via signup
    // Admin & Doctor accounts must be created by database admins only
    const role = "patient"; // Force patient role

    const exists = await User.findOne({ where: { email } });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    console.log('Register: creating user, email=', email);
    console.log('Register: salt=', salt);

    const user = await User.create({
      email,
      password_hash: hashed,
      salt: salt,
      full_name: name,
      phone: mobile || null,
      role,
    });

    // Auto-create patient profile
    if (role === "patient") {
      await Patient.create({ user_id: user.user_id });
    }

    res.status(201).json({
      success: true,
      message: "Patient account created successfully",
      data: {
        user_id: user.user_id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.user_id, role: user.role }, process.env.JWT_SECRET);

    // Ensure minimal profile records exist for patient/doctor roles
    try {
      if (user.role === "patient") {
        const existingPatient = await Patient.findOne({ where: { user_id: user.user_id } });
        if (!existingPatient) {
          await Patient.create({ user_id: user.user_id });
        }
      } else if (user.role === "doctor") {
        const existingDoctor = await Doctor.findOne({ where: { user_id: user.user_id } });
        if (!existingDoctor) {
          await Doctor.create({ user_id: user.user_id });
        }
      }
    } catch (e) {
      console.warn("Profile ensure on login failed:", e.message);
    }

    // remove sensitive fields before sending
    const userSafe = { user_id: user.user_id, email: user.email, full_name: user.full_name, role: user.role };

    res.json({ success: true, token, user: userSafe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Forgot Password - Generate reset token
 * POST /api/auth/forgot-password
 * Body: { email }
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({
        success: true,
        message: "If email exists, reset link has been sent",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user.id, type: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Store reset token in database
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.update({
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires,
    });

    // TODO: Send email with reset link
    // In production, use nodemailer or SendGrid
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await sendEmail(email, "Password Reset", resetLink);

    console.log(`🔑 Reset token generated for ${email}`);

    res.json({
      success: true,
      message: "If email exists, reset link has been sent",
      // FOR DEVELOPMENT ONLY - Remove in production
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Reset Password - Validate token and update password
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Check token type
    if (decoded.type !== "password_reset") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }

    // Find user and verify token matches
    const user = await User.findByPk(decoded.id);
    if (!user || user.reset_token !== token) {
      return res.status(401).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    // Check if token has expired
    if (new Date() > user.reset_token_expires) {
      return res.status(401).json({
        success: false,
        message: "Reset token has expired",
      });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password_hash: hashedPassword,
      password: hashedPassword, // for compatibility
      reset_token: null,
      reset_token_expires: null,
    });

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
/**
 * Change Password - Authenticated user changes their own password
 * POST /api/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({
      password_hash: hashedPassword,
    });

    console.log(`🔐 Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};