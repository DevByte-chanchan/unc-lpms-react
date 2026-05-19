'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ApprovalComment extends Model {
    static associate(models) {
      ApprovalComment.belongsTo(models.LearningPlan, {
        foreignKey: 'learning_plan_id',
        as: 'learningPlan'
      });
      ApprovalComment.belongsTo(models.ApprovalStage, {
        foreignKey: 'approval_stage_id',
        as: 'approvalStage'
      });
    }
  }
  ApprovalComment.init({
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
    approval_stage_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'approval_stages',
        key: 'id'
      }
    },
    from_role: {
      type: DataTypes.ENUM('industry_consultant', 'director_of_libraries', 'program_head', 'dean'),
      allowNull: false
    },
    to_role: {
      type: DataTypes.ENUM('instructor', 'program_head'),
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    from_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ApprovalComment',
    tableName: 'approval_comments',
    timestamps: true,
    underscored: true
  });
  return ApprovalComment;
};
