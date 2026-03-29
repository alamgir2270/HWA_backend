const bcrypt = require("bcrypt");
const crypto = require("crypto");
let nodemailer;
const { sequelize, User, Doctor } = require("../models");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, email, phone } = req.body;
    const user = await User.findByPk(req.user.user_id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // Check if new email is already in use by another user
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
    }

    // Update fields
    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDoctor = async (req, res) => {
  const { full_name, email, specialty, password, sendReset, department_id, department_name, department_description } = req.body;
  const t = await sequelize.transaction();
  try {
    if (!email || !full_name) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // generate temp password if not provided
    const tempPassword = password || crypto.randomBytes(4).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(tempPassword, salt);

    const user = await User.create({
      email,
      password_hash: hashed,
      salt,
      role: "doctor",
      full_name,
    }, { transaction: t });

    // If admin supplied department_id or department_name, resolve/create department
    let assignedDeptId = null;
    if (department_id) {
      assignedDeptId = department_id;
    } else if (department_name) {
      // create a new department with optional description
      const Department = require("../models").Department;
      const deptPayload = { name: department_name };
      if (department_description) deptPayload.description = department_description;
      const newDept = await Department.create(deptPayload, { transaction: t });
      assignedDeptId = newDept.department_id;
    }

    const doctor = await Doctor.create({
      user_id: user.user_id,
      specialty: specialty || null,
      department_id: assignedDeptId,
    }, { transaction: t });

    await t.commit();

    // Send email with credentials or reset link (if SMTP configured)
    try {
      if (process.env.SMTP_HOST) {
        try {
          nodemailer = require("nodemailer");
        } catch (reqErr) {
          console.warn("nodemailer not installed, skipping email send");
          nodemailer = null;
        }

        if (nodemailer) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });

          if (sendReset) {
            // create a reset token (random) and store in user.reset_token
            const resetToken = crypto.randomBytes(24).toString("hex");
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await user.update({ reset_token: resetToken, reset_token_expires: resetExpires });
            const resetUrl = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
            await transporter.sendMail({
              from: process.env.SMTP_FROM || "no-reply@localhost",
              to: email,
              subject: "Set your password",
              text: `Hello ${full_name},\n\nPlease set your password using the link: ${resetUrl}\n\nThis link expires in 1 hour.`,
            });
          } else {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || "no-reply@localhost",
              to: email,
              subject: "Your doctor account",
              text: `Hello ${full_name},\n\nAn account has been created for you.\nEmail: ${email}\nTemporary password: ${tempPassword}\nPlease change after login.`,
            });
          }
        }
      }
    } catch (mailErr) {
      console.warn("Failed to send doctor welcome email:", mailErr && mailErr.message ? mailErr.message : mailErr);
    }

    res.status(201).json({ success: true, data: { user: { user_id: user.user_id, email: user.email, full_name: user.full_name }, doctor: { doctor_id: doctor.doctor_id } } });
  } catch (err) {
    await t.rollback();
    console.error("createDoctor error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { name, description } = req.body;

    if (!department_id) {
      return res.status(400).json({ success: false, message: "Department ID is required" });
    }

    if (!name && !description) {
      return res.status(400).json({ success: false, message: "At least one field (name or description) is required" });
    }

    const Department = require("../models").Department;
    const dept = await Department.findByPk(department_id);

    if (!dept) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    // Update fields
    if (name) dept.name = name;
    if (description) dept.description = description;

    await dept.save();

    res.json({
      success: true,
      message: "Department updated successfully",
      data: {
        department_id: dept.department_id,
        name: dept.name,
        description: dept.description,
      },
    });
  } catch (err) {
    console.error("updateDepartment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

