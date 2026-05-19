'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ApprovalStage extends Model {
    static associate(models) {
      ApprovalStage.belongsTo(models.LearningPlan, {
        foreignKey: 'learning_plan_id',
        as: 'learningPlan'
      });
      ApprovalStage.hasMany(models.ApprovalComment, {
        foreignKey: 'approval_stage_id',
        as: 'comments'
      });
    }
  }
  ApprovalStage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    learning_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'learning_plans',
        key: 'id'
      }
    },
    stage: {
      type: DataTypes.ENUM('industry_consultant', 'director_of_libraries', 'program_head', 'dean'),
      allowNull: false
    },
    reviewer_role: {
      type: DataTypes.ENUM('industry_consultant', 'director_of_libraries', 'program_head', 'dean'),
      allowNull: false
    },
    reviewer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'returned'),
      defaultValue: 'pending'
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ApprovalStage',
    tableName: 'approval_stages',
    timestamps: true,
    underscored: true
  });
  return ApprovalStage;
};
