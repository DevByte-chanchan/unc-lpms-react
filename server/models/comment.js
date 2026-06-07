// models/comment.js
module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('Comment', {
        comment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        commenter_role: { type: DataTypes.STRING(30), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        resolved_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    }, { tableName: 'Comments' });



    return Comment;
};