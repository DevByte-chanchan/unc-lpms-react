// models/topicTla.js
module.exports = (sequelize, DataTypes) => {
    const TopicTLA = sequelize.define('TopicTLA', {
        topic_tla_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        topic_id: { type: DataTypes.INTEGER, allowNull: false },
        tla_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'TopicTLAs' });
    return TopicTLA;
};
