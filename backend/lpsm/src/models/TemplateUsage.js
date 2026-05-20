'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TemplateUsage extends Model {
    static associate(models) {
      TemplateUsage.belongsTo(models.LearningPlanTemplate, {
        foreignKey: 'template_id',
        as: 'template'
      });
      TemplateUsage.belongsTo(models.LearningPlan, {
        foreignKey: 'new_lp_id',
        as: 'newLearningPlan'
      });
    }
  }

  TemplateUsage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    new_lp_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    modifications_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TemplateUsage',
    tableName: 'template_usages',
    timestamps: true,
    underscored: true
  });

  return TemplateUsage;
};
