/**
 * Analytics Controller
 * Provides admin dashboard statistics and reports
 * All endpoints require admin role
 */

const { sequelize } = require("../config/db");
const {
  User,
  Doctor,
  Patient,
  Appointment,
  Prescription,
  Bill,
  Feedback,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Get Dashboard Overview Stats
 * GET /api/analytics/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get all stats in parallel
    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      totalRevenue,
      appointmentStats,
      averageRating,
    ] = await Promise.all([
      User.count(),
      Doctor.count(),
      Patient.count(),
      Appointment.count(),
      // Sum paid_amount to reflect actual revenue received
      Bill.sum("paid_amount"),
      getAppointmentStats(),
      getFeedbackStats(),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: totalUsers || 0,
          totalDoctors: totalDoctors || 0,
          totalPatients: totalPatients || 0,
          totalAppointments: totalAppointments || 0,
          totalRevenue: totalRevenue || 0,
          averageRating: averageRating || 0,
        },
        appointmentStats,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Analytics.getDashboardStats error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Detailed Appointment Statistics
 * GET /api/analytics/appointments/stats
 */
exports.getAppointmentStats = async (req, res) => {
  try {
    const stats = await getAppointmentStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Analytics.getAppointmentStats error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Doctor Performance Metrics
 * GET /api/analytics/doctors/performance
 */
exports.getDoctorPerformance = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        {
          model: User,
          attributes: ["full_name", "email"],
        },
        {
          model: Appointment,
          attributes: ["status"],
          required: false,
        },
      ],
      subQuery: false,
      raw: false,
    });

    const performance = doctors.map((doc) => {
      const appointments = doc.Appointments || [];
      const completedCount = appointments.filter(
        (a) => a.status === "completed"
      ).length;
      const cancelledCount = appointments.filter(
        (a) => a.status === "cancelled"
      ).length;
      const totalAppointments = appointments.length;

      return {
        doctorId: doc.doctor_id,
        name: doc.User?.full_name,
        email: doc.User?.email,
        specialty: doc.specialty,
        totalAppointments,
        completedAppointments: completedCount,
        cancelledAppointments: cancelledCount,
        completionRate:
          totalAppointments > 0
            ? ((completedCount / totalAppointments) * 100).toFixed(2)
            : 0,
        averageRating: doc.rating_cache || 0,
      };
    });

    res.json({ success: true, data: performance });
  } catch (err) {
    console.error('Analytics.getDoctorPerformance error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Revenue & Billing Statistics
 * GET /api/analytics/revenue
 */
exports.getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Use payment_date for billing date filters
    const whereClause = startDate || endDate ? { payment_date: dateFilter } : {};

    // Get billing data
    const [totalRevenue, billCount, averageBillAmount] = await Promise.all([
      // Sum paid_amount to calculate revenue received in period
      Bill.sum("paid_amount", { where: whereClause }),
      Bill.count({ where: whereClause }),
      Bill.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn("AVG", sequelize.col("paid_amount")), "averageAmount"],
        ],
        raw: true,
      }),
    ]);

    // Get revenue trend by month (last 6 months)
    const monthlyRevenue = await sequelize.query(
      `
      SELECT 
        DATE_TRUNC('month', payment_date) as month,
        SUM(paid_amount) as totalAmount,
        COUNT(*) as billCount
      FROM bills
      WHERE payment_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month ASC
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue || 0,
        totalBills: billCount || 0,
        averageBillAmount:
          averageBillAmount[0]?.averageAmount || 0,
        monthlyRevenue: monthlyRevenue || [],
        period: {
          startDate: startDate || "N/A",
          endDate: endDate || "N/A",
        },
      },
    });
  } catch (err) {
    console.error('Analytics.getRevenueStats error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get User Growth Statistics
 * GET /api/analytics/users/growth
 */
exports.getUserGrowth = async (req, res) => {
  try {
    // User growth by month (last 6 months)
    const monthlyGrowth = await sequelize.query(
      `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        role,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), role
      ORDER BY month ASC
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    // User breakdown by role
    const usersByRole = await User.findAll({
      attributes: [
        "role",
        [sequelize.fn("COUNT", sequelize.col("user_id")), "count"],
      ],
      group: ["role"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        monthlyGrowth,
        usersByRole,
      },
    });
  } catch (err) {
    console.error('Analytics.getUserGrowth error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Prescription Statistics
 * GET /api/analytics/prescriptions/stats
 */
exports.getPrescriptionStats = async (req, res) => {
  try {

    // Prescription model uses `issued_at` not `start_date`/`end_date`.
    // Define "active" as prescriptions issued in the last 30 days.
    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalPrescriptions, activePrescriptions, completedPrescriptions] =
      await Promise.all([
        Prescription.count(),
        Prescription.count({ where: { issued_at: { [Op.gte]: days30 } } }),
        Prescription.count({ where: { issued_at: { [Op.lt]: days30 } } }),
      ]);

    // Top medications: older schema may not have `medication_name` column.
    // Try to aggregate by `medication_name`, but fall back to empty list on error.
    let topMedications = [];
    try {
      topMedications = await Prescription.findAll({
        attributes: [
          "medication_name",
          [sequelize.fn("COUNT", sequelize.col("medication_name")), "count"],
        ],
        group: ["medication_name"],
        order: [[sequelize.fn("COUNT", sequelize.col("medication_name")), "DESC"]],
        limit: 10,
        raw: true,
      });
    } catch (e) {
      console.warn("Top medications aggregation unavailable (missing column):", e.message);
      topMedications = [];
    }

    res.json({
      success: true,
      data: {
        totalPrescriptions: totalPrescriptions || 0,
        activePrescriptions: activePrescriptions || 0,
        completedPrescriptions: completedPrescriptions || 0,
        topMedications: topMedications || [],
      },
    });
  } catch (err) {
    console.error('Analytics.getPrescriptionStats error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get System Health Report
 * GET /api/analytics/system/health
 */
exports.getSystemHealth = async (req, res) => {
  try {
    // Database connection check
    await sequelize.authenticate();

    // Get counts for data integrity check
    const [userCount, appointmentCount, billCount] = await Promise.all([
      User.count(),
      Appointment.count(),
      Bill.count(),
    ]);

    res.json({
      success: true,
      data: {
        databaseStatus: "connected",
        dataIntegrity: {
          users: userCount,
          appointments: appointmentCount,
          bills: billCount,
        },
        serverTime: new Date(),
      },
    });
  } catch (err) {
    console.error('Analytics.getSystemHealth error:', err && err.stack ? err.stack : err);
    res.status(503).json({
      success: false,
      message: "System health check failed",
      error: err.message,
    });
  }
};

/* ====================================
   HELPER FUNCTIONS
==================================== */

/**
 * Helper: Get appointment statistics
 */
async function getAppointmentStats() {
  const [
    totalAppointments,
    scheduledCount,
    completedCount,
    cancelledCount,
    noShowCount,
  ] = await Promise.all([
    Appointment.count(),
    Appointment.count({
      where: { status: "scheduled" },
    }),
    Appointment.count({
      where: { status: "completed" },
    }),
    Appointment.count({
      where: { status: "cancelled" },
    }),
    Appointment.count({
      where: { status: "no_show" },
    }),
  ]);

  return {
    total: totalAppointments || 0,
    scheduled: scheduledCount || 0,
    completed: completedCount || 0,
    cancelled: cancelledCount || 0,
    noShow: noShowCount || 0,
    completionRate:
      totalAppointments > 0
        ? ((completedCount / totalAppointments) * 100).toFixed(2)
        : 0,
  };
}

/**
 * Helper: Get feedback/rating statistics
 */
async function getFeedbackStats() {
  const feedback = await Feedback.findAll({
    attributes: [
      [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
    ],
    raw: true,
  });

  return feedback[0]?.averageRating || 0;
}

module.exports = exports;
