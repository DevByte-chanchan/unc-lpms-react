'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LearningPlanTemplate extends Model {
    static associate(models) {
      LearningPlanTemplate.belongsTo(models.LearningPlan, {
        foreignKey: 'source_lp_id',
        as: 'sourceLearningPlan'
      });
      LearningPlanTemplate.hasMany(models.TemplateUsage, {
        foreignKey: 'template_id',
        as: 'usages'
      });
    }
  }

  LearningPlanTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    source_lp_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'LearningPlanTemplate',
    tableName: 'learning_plan_templates',
    timestamps: true,
    underscored: true
  });

  return LearningPlanTemplate;
};
