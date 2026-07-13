'use strict';
module.exports = (sequelize, DataTypes) => {
    const CommentTarget = sequelize.define('CommentTarget', {
        comment_target_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        comment_id: { type: DataTypes.INTEGER, allowNull: false },
        target_id: { type: DataTypes.INTEGER, allowNull: false }
    }, {
        tableName: 'CommentTargets'
    });

    CommentTarget.associate = function(models) {
        CommentTarget.belongsTo(models.Comment, { foreignKey: 'comment_id' });
    };

    return CommentTarget;
};