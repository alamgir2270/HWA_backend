module.exports = (sequelize, DataTypes) => {
  const LabResult = sequelize.define(
    "LabResult",
    {
      lab_result_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ===== RELATIONSHIPS =====
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      performed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ===== TEST INFORMATION =====
      test_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      test_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      test_category: {
        type: DataTypes.ENUM(
          "Blood Test",
          "Urine Test",
          "Imaging",
          "ECG",
          "X-Ray",
          "Ultrasound",
          "CT Scan",
          "MRI",
          "Other"
        ),
        allowNull: false,
      },

      // ===== TEST RESULTS =====
      result_value: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      reference_range: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      result_status: {
        type: DataTypes.ENUM("normal", "abnormal", "critical", "pending"),
        allowNull: true,
      },
      result_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      // ===== REPORT FILE =====
      report_file_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ===== STATUS & METADATA =====
      status: {
        type: DataTypes.ENUM("pending", "completed", "cancelled"),
        allowNull: false,
      },
      lab_technician: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      lab_location: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ===== TIMESTAMPS =====
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "lab_results",
      timestamps: true,
      underscored: true,
    }
  );

  // ===== MODEL ASSOCIATIONS =====
  LabResult.associate = (models) => {
    // Lab result belongs to a patient
    LabResult.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      onDelete: "CASCADE",
    });

    // Lab result can be linked to an appointment
    if (models.Appointment) {
      LabResult.belongsTo(models.Appointment, {
        foreignKey: "appointment_id",
        onDelete: "SET NULL",
      });
    }

    // Lab result is performed by a doctor
    if (models.Doctor) {
      LabResult.belongsTo(models.Doctor, {
        foreignKey: "performed_by",
        as: "Doctor",
        onDelete: "SET NULL",
      });
    }

    // Lab result is uploaded by a user
    if (models.User) {
      LabResult.belongsTo(models.User, {
        foreignKey: "uploaded_by",
        as: "UploadedBy",
        onDelete: "SET NULL",
      });
    }
  };

  return LabResult;
};
