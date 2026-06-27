'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProgramDocument extends Model {
    static associate(models) {
      
      
    }
  }

  ProgramDocument.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    program_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    academic_period_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    po_peo_file: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to Program Outcome and PEO Alignment document'
    },
    co_po_file: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to Course Outcomes & PO Alignment document'
    },
    coaep_file: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to COAEP document'
    },
    po_peo_filename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    co_po_filename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    coaep_filename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Program Head user ID'
    },
    uploaded_by_name: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProgramDocument',
    tableName: 'program_documents',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['program_id', 'academic_period_id'],
        name: 'idx_program_period_unique'
      }
    ]
  });

  return ProgramDocument;
};
