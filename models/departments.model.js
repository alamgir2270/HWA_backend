module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      department_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      clinic_id: { type: DataTypes.UUID },
      name: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT },
      floor_location: { type: DataTypes.STRING(50) },
    },
    {
      tableName: "departments",
      timestamps: false,
    }
  );

  return Department;
};
