// models/topic.js
module.exports = (sequelize, DataTypes) => {
    const Topic = sequelize.define('Topic', {
        topic_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        ilo_id: { type: DataTypes.INTEGER, allowNull: false },
        title: { type: DataTypes.STRING(70), allowNull: false }
    }, { tableName: 'Topics' });
    return Topic;
};
