const jwt = require("jsonwebtoken");
const { User } = require("../models");
require("dotenv").config();

module.exports = async function (req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Ensure we expose both identifier shapes used across the codebase
    // Some controllers expect `user.user_id`, others expect `user.id`.
    // Provide both to avoid undefined WHERE parameters during queries.
    req.user = {
      user_id: user.user_id || user.id,
      id: user.id || user.user_id,
      role: user.role,
    };
    next();
  } catch (err) {
    // Log the error for easier debugging in development
    console.error("Auth middleware error:", err && err.message ? err.message : err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
