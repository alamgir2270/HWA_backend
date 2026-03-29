module.exports = (sequelize, DataTypes) => {
  const HealthStatus = sequelize.define(
    "HealthStatus",
    {
      health_status_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "patients",
          key: "patient_id",
        },
      },
      // Vital Signs
      blood_pressure_systolic: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      blood_pressure_diastolic: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      heart_rate: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      temperature: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
      },
      weight_kg: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      height_cm: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      bmi: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
      },
      // Health Status Indicators
      overall_status: {
        type: DataTypes.ENUM("excellent", "good", "fair", "poor", "critical"),
        defaultValue: "good",
      },
      risk_level: {
        type: DataTypes.ENUM("low", "moderate", "high", "very_high"),
        defaultValue: "low",
      },
      // Health Goals
      target_weight_kg: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      exercise_minutes_week: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      water_intake_liters: {
        type: DataTypes.DECIMAL(3, 1),
        defaultValue: 2.0,
      },
      // Notes and Recommendations
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      doctor_recommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Metadata
      recorded_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
      },
      recorded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "health_status",
      timestamps: true,
      indexes: [
        {
          fields: ["patient_id", "recorded_date"],
        },
        {
          fields: ["overall_status"],
        },
        {
          fields: ["risk_level"],
        },
      ],
    }
  );

  return HealthStatus;
};