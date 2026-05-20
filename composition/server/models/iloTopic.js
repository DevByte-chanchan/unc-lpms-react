// models/iloTopic.js
module.exports = (sequelize, DataTypes) => {
  const ILOTopic = sequelize.define('ILOTopic', {
    ilo_topic_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ilo_id: { type: DataTypes.INTEGER, allowNull: false },
    topic_id: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'ILOTopics' });
  return ILOTopic;
};
