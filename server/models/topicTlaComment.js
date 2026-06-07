// models/topicTLAComment.js
module.exports = (sequelize, DataTypes) => {
    const TopicTLAComment = sequelize.define('TopicTLAComment', {
        topic_tla_comment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        comment_id: { type: DataTypes.INTEGER, allowNull: false },
        topic_tla_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'TopicTLAComments' });

    TopicTLAComment.associate = (models) => {
        TopicTLAComment.belongsTo(models.Comment, { foreignKey: 'comment_id' });

        // Maps the connection to the correct TopicTLA junction model instance
        TopicTLAComment.belongsTo(models.TopicTLA, {
            foreignKey: 'topic_tla_id',
            targetKey: 'topic_tla_id'
        });
    };

    return TopicTLAComment;
};