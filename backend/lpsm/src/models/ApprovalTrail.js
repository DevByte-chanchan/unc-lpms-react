'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ApprovalTrail extends Model {
    static associate(models) {
      ApprovalTrail.belongsTo(models.LearningPlan, {
        foreignKey: 'learning_plan_id',
        as: 'learningPlan'
      });
      ApprovalTrail.belongsTo(models.User, {
        foreignKey: 'reviewer_id',
        as: 'reviewer'
      });
    }
  }

  ApprovalTrail.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    learning_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reviewer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('submitted', 'approved', 'returned', 'viewed', 'exported', 'rollback'),
      allowNull: false
    },
    action_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ApprovalTrail',
    tableName: 'approval_trails',
    timestamps: true,
    underscored: true
  });

  return ApprovalTrail;
};
