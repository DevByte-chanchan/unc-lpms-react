'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Week extends Model {
    static associate(models) {
      Week.belongsTo(models.CourseOutcome, { foreignKey: 'co_id', as: 'courseOutcome' });
      Week.hasMany(models.Subtopic, { foreignKey: 'week_id', as: 'subtopics' });
      Week.hasMany(models.WeeklyReference, { foreignKey: 'week_id', as: 'weeklyReferences' });
      Week.hasMany(models.TeachingAndLearningActivity, { foreignKey: 'week_id', as: 'teachingAndLearningActivities' });
      if (models.Comment) {
        Week.hasMany(models.Comment, { foreignKey: 'week_id', as: 'comments' });
      }
    }
  }
  Week.init({
    week_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    co_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Week',
    tableName: 'Weeks',
  });
  return Week;
};
