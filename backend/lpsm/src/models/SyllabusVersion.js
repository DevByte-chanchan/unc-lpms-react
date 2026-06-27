'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SyllabusVersion extends Model {
    static associate(models) {
      SyllabusVersion.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  SyllabusVersion.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    course_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    version_no: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    snapshot_data: {
      type: DataTypes.JSON,
      allowNull: false
    },
    trigger_event: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SyllabusVersion',
    tableName: 'syllabus_versions',
    timestamps: true,
    underscored: true
  });

  return SyllabusVersion;
};
