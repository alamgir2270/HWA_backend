module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define(
    "Patient",
    {
      patient_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      image_url: { type: DataTypes.STRING(1024), allowNull: true },
      dob: { type: DataTypes.DATEONLY },
      gender: { type: DataTypes.STRING(10) },
      address: { type: DataTypes.TEXT },
      emergency_contact: { type: DataTypes.STRING(100) },
      insurance_info: { type: DataTypes.TEXT },
      encryption_key_ref: { type: DataTypes.STRING(255) },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "patients",
      timestamps: false,
    }
  );
  return Patient;
};
