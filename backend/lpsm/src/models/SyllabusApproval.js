'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SyllabusApproval extends Model {
    static associate(models) {
      SyllabusApproval.hasMany(models.SyllabusVersion, {
        foreignKey: 'course_code',
        sourceKey: 'course_code',
        as: 'versions'
      });
    }
  }

  SyllabusApproval.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    course_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    course_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instructor_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    semester: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    current_stage: {
      type: DataTypes.ENUM('submitted', 'parallel_review', 'program_head', 'dean', 'approved', 'returned'),
      defaultValue: 'submitted'
    },
    oic_status: {
      type: DataTypes.ENUM('pending', 'approved', 'returned'),
      defaultValue: 'pending'
    },
    oic_comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    oic_reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SyllabusApproval',
    tableName: 'syllabus_approvals',
    timestamps: true,
    underscored: true
  });

  return SyllabusApproval;
};
