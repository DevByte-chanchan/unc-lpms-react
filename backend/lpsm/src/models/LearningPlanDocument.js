'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LearningPlanDocument extends Model {
    static associate(models) {
      LearningPlanDocument.belongsTo(models.LearningPlan, {
        foreignKey: 'learning_plan_id',
        as: 'learningPlan'
      });
    }
  }
  LearningPlanDocument.init({
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
    uploader_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    uploader_role: {
      type: DataTypes.ENUM('program_head', 'director_of_libraries'),
      allowNull: false
    },
    document_type: {
      type: DataTypes.ENUM('peo_alignment', 'coaep', 'co_po_alignment', 'references'),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    original_filename: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'LearningPlanDocument',
    tableName: 'learning_plan_documents',
    timestamps: true,
    underscored: true
  });
  return LearningPlanDocument;
};
