'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SyllabusContent extends Model {
    static associate(models) {
      SyllabusContent.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  SyllabusContent.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    course_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    semester: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    content: {
      type: DataTypes.JSON,
      allowNull: false
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SyllabusContent',
    tableName: 'syllabus_content',
    timestamps: true,
    underscored: true
  });

  return SyllabusContent;
};
