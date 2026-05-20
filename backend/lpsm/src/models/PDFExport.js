'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PDFExport extends Model {
    static associate(models) {
      PDFExport.belongsTo(models.LearningPlan, {
        foreignKey: 'learning_plan_id',
        as: 'learningPlan'
      });
      PDFExport.belongsTo(models.User, {
        foreignKey: 'exported_by',
        as: 'exportedByUser'
      });
    }
  }

  PDFExport.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    learning_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    exported_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    export_type: {
      type: DataTypes.ENUM('single', 'batch'),
      defaultValue: 'single'
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    batch_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    exported_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'PDFExport',
    tableName: 'pdf_exports',
    timestamps: true,
    underscored: true
  });

  return PDFExport;
};
