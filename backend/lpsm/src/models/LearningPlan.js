'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LearningPlan extends Model {
    static associate(models) {
      LearningPlan.hasMany(models.LearningPlanDocument, {
        foreignKey: 'learning_plan_id',
        as: 'documents'
      });
      LearningPlan.hasMany(models.ApprovalStage, {
        foreignKey: 'learning_plan_id',
        as: 'approvalStages'
      });
      LearningPlan.hasMany(models.ApprovalComment, {
        foreignKey: 'learning_plan_id',
        as: 'comments'
      });
      LearningPlan.hasMany(models.LearningPlanVersion, {
        foreignKey: 'learning_plan_id',
        as: 'versions'
      });
    }
  }
  LearningPlan.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    course_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    course_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    academic_year: {
      type: DataTypes.STRING,
      allowNull: true
    },
    semester: {
      type: DataTypes.ENUM('1st', '2nd', 'summer'),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'under_review', 'approved', 'returned'),
      defaultValue: 'draft'
    }
  }, {
    sequelize,
    modelName: 'LearningPlan',
    tableName: 'learning_plans',
    timestamps: true,
    underscored: true
  });
  return LearningPlan;
};
