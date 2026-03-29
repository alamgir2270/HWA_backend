module.exports = (sequelize, DataTypes) => {
  const Doctor = sequelize.define(
    "Doctor",
    {
      doctor_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID },
      department_id: { type: DataTypes.UUID },
      clinic_id: { type: DataTypes.UUID },
      specialty: { type: DataTypes.STRING(100) },
      license_no: { type: DataTypes.STRING(100) },
      available_hours: { type: DataTypes.TEXT },
      available_days: { type: DataTypes.TEXT, defaultValue: "Mon,Tue,Wed,Thu,Fri" },
      image_url: { type: DataTypes.STRING(1024), allowNull: true },
      bio: { type: DataTypes.TEXT },
      rating_cache: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "doctors",
      timestamps: false,
    }
  );

  return Doctor;
};
