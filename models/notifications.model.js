module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      notification_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      user_id: { type: DataTypes.UUID },
      type: { type: DataTypes.STRING(100) },
      payload: { type: DataTypes.TEXT },
      read_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
      sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "notifications",
      timestamps: false,
    }
  );

  return Notification;
};
