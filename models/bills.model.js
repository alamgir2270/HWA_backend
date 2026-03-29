module.exports = (sequelize, DataTypes) => {
  const Bill = sequelize.define(
    "Bill",
    {
      bill_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      patient_id: { type: DataTypes.UUID },
      appointment_id: { type: DataTypes.UUID },
      lab_result_id: { type: DataTypes.UUID }, // ✅ NEW: Link to lab test
      admin_id: { type: DataTypes.UUID },

      // ✅ NEW: Fee type to distinguish doctor consultation vs lab test
      fee_type: {
        type: DataTypes.ENUM("consultation", "lab_test"),
        defaultValue: "consultation",
      },

      total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paid_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },

      payment_status: {
        type: DataTypes.ENUM("unpaid", "partial", "paid", "refunded"),
        defaultValue: "unpaid",
      },

      payment_method: { type: DataTypes.STRING(50) },

      issue_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      due_date: { type: DataTypes.DATE },
      payment_date: { type: DataTypes.DATE },
      remarks: { type: DataTypes.TEXT },
    },
    {
      tableName: "bills",
      timestamps: false,
    }
  );

  return Bill;
};
