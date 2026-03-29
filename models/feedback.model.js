module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define(
    "Feedback",
    {
      feedback_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      appointment_id: { type: DataTypes.UUID },
      patient_id: { type: DataTypes.UUID },
      doctor_id: { type: DataTypes.UUID },

      rating: { type: DataTypes.INTEGER },
      comments: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "feedback",
      timestamps: false,
    }
  );

  return Feedback;
};
