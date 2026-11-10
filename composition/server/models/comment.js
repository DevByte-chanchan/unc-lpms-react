'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    static associate(models) {
      Comment.belongsTo(models.CourseOfferingAssignment, { foreignKey: 'co_assign_id', as: 'assignment' });
      Comment.belongsTo(models.Week, { foreignKey: 'week_id', as: 'week' });
      Comment.hasMany(models.CommentTarget, { foreignKey: 'comment_id', as: 'targets' });
    }
  }

  Comment.init({
    comment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    co_assign_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stakeholder_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    commenter_role: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    resolved_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    resolved_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    week_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    comment_for: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Comment',
    tableName: 'Comments'
  });

  return Comment;
};
