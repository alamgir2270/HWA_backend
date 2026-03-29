module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define(
    "Clinic",
    {
      clinic_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(100), allowNull: false },
      address: { type: DataTypes.TEXT },
      contact: { type: DataTypes.STRING(100) },
      timezone: { type: DataTypes.STRING(50) },
      config_flags: { type: DataTypes.TEXT },
    },
    {
      tableName: "clinics",
      timestamps: false,
    }
  );
  return Clinic;
};
