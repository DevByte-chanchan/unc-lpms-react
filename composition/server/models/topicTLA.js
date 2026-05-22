// models/topicTla.js
module.exports = (sequelize, DataTypes) => {
    const TopicTLA = sequelize.define('TopicTLA', {
        topic_tla_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        ilo_topic_id: { type: DataTypes.INTEGER, allowNull: false },
        tla_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'TopicTLAs' });

    TopicTLA.associate = models => {
        TopicTLA.belongsTo(models.ILOTopic, { foreignKey: 'ilo_topic_id', as: 'iloTopic', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        TopicTLA.belongsTo(models.TeachingAndLearningActivity, { foreignKey: 'tla_id', as: 'tla', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    };

    return TopicTLA;
};
