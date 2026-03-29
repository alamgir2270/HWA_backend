module.exports = (sequelize, DataTypes) => {
  const MedicalHistory = sequelize.define(
    "MedicalHistory",
    {
      history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      patient_id: { type: DataTypes.UUID },
      entry_type: { type: DataTypes.STRING(100) },
      description: { type: DataTypes.TEXT },
      recorded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      recorded_by: { type: DataTypes.UUID },
    },
    {
      tableName: "medical_history",
      timestamps: false,
    }
  );

  return MedicalHistory;
};
