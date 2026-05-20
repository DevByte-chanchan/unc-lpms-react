'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LearningPlanVersion extends Model {
    static associate(models) {
      LearningPlanVersion.belongsTo(models.LearningPlan, {
        foreignKey: 'learning_plan_id',
        as: 'learningPlan'
      });
      LearningPlanVersion.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  LearningPlanVersion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    learning_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    version_no: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    snapshot_data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Full copy of LP data at that point'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    trigger_event: {
      type: DataTypes.ENUM('submitted', 'returned', 'resubmitted', 'approved'),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'LearningPlanVersion',
    tableName: 'learning_plan_versions',
    timestamps: true,
    underscored: true
  });

  return LearningPlanVersion;
};
