module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      log_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID },
      action: { type: DataTypes.STRING(100), allowNull: false },
      resource_type: { type: DataTypes.STRING(100) },
      resource_id: { type: DataTypes.UUID },
      ip_address: { type: DataTypes.STRING(45) },
      metadata: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "audit_logs",
      timestamps: false,
    }
  );

  return AuditLog;
};
