module.exports = (sequelize, DataTypes) => {
  const Prescription = sequelize.define(
    "Prescription",
    {
      prescription_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      appointment_id: { type: DataTypes.UUID },
      doctor_id: { type: DataTypes.UUID },
      patient_id: { type: DataTypes.UUID },

      // stores an array of medication objects: [{ name, dosage, frequency, notes }]
      medications: { type: DataTypes.JSON },
      // free-text clinical advice / notes from doctor
      advice: { type: DataTypes.TEXT },
      // snapshot objects to capture doctor/patient details at time of issue
      doctor_snapshot: { type: DataTypes.JSON },
      patient_snapshot: { type: DataTypes.JSON },
      file_url: { type: DataTypes.TEXT },

      issued_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      downloadable_flag: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: "prescriptions",
      timestamps: false,
    }
  );

  return Prescription;
};
