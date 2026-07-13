'use strict';
module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('Comment', {
        comment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_assign_id: { type: DataTypes.INTEGER, allowNull: true },
        commenter_role: { type: DataTypes.STRING(30), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        resolved_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        resolved_date: { type: DataTypes.DATE, allowNull: true },
        ilo_id: { type: DataTypes.INTEGER, allowNull: true },
        comment_for: { type: DataTypes.ENUM('references', 'topics', 'tlas'), allowNull: true }
    }, {
        tableName: 'Comments'
    });

    Comment.associate = function(models) {
        Comment.belongsTo(models.CourseOfferingAssignment, { foreignKey: 'co_assign_id', as: 'assignment' });
        Comment.hasMany(models.CommentTarget, { foreignKey: 'comment_id', as: 'targets' });
    };

    return Comment;
};