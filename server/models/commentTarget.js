// models/commentTarget.js
// Junction of a comment to one or more selected targets (Topic/Reference/TLA primary keys).
module.exports = (sequelize, DataTypes) => {
    const CommentTarget = sequelize.define('CommentTarget', {
        comment_target_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        comment_id: { type: DataTypes.INTEGER, allowNull: false },
        target_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'CommentTargets' });

    CommentTarget.associate = (models) => {
        CommentTarget.belongsTo(models.Comment, { foreignKey: 'comment_id' });
    };

    return CommentTarget;
};
