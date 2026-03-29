module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      appointment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: { type: DataTypes.UUID },
      doctor_id: { type: DataTypes.UUID },
      clinic_id: { type: DataTypes.UUID },

      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE },

      status: {
        type: DataTypes.ENUM(
          "scheduled",
          "confirmed",
          "completed",
          "cancelled",
          "no_show"
        ),
        defaultValue: "scheduled",
      },

      reason: { type: DataTypes.TEXT },
      created_by: { type: DataTypes.UUID },
      notified_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "appointments",
      timestamps: false,
    }
  );

  return Appointment;
};
