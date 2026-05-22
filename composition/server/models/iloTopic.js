// models/iloTopic.js
module.exports = (sequelize, DataTypes) => {
  const ILOTopic = sequelize.define('ILOTopic', {
    ilo_topic_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ilo_id: { type: DataTypes.INTEGER, allowNull: false },
    topic_id: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'ILOTopics' });

  ILOTopic.associate = models => {
    ILOTopic.belongsTo(models.IntendedLearningOutcome, { foreignKey: 'ilo_id', as: 'ilo', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    ILOTopic.belongsTo(models.Topic, { foreignKey: 'topic_id', as: 'topic', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    ILOTopic.hasMany(models.TopicTLA, { foreignKey: 'ilo_topic_id', as: 'topicTlas', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  };

  return ILOTopic;
};
