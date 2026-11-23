// models/topics.js
module.exports = (sequelize, DataTypes) => {
    const Topic = sequelize.define('Topic', {
        topic_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        course_id: { type: DataTypes.INTEGER, allowNull: true },
        parent_topic_id: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'Topics' });

    Topic.associate = function(models) {
        Topic.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });
        Topic.belongsTo(models.Topic, { foreignKey: 'parent_topic_id', as: 'parentTopic' });
    };

    return Topic;
};
