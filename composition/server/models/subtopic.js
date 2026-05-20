// models/subtopic.js
module.exports = (sequelize, DataTypes) => {
    const Subtopic = sequelize.define('Subtopic', {
        subtopic_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        topic_id: { type: DataTypes.INTEGER, allowNull: false },
        title: { type: DataTypes.STRING(70), allowNull: false },
        sequence_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    }, { tableName: 'Subtopics' });
    return Subtopic;
};
