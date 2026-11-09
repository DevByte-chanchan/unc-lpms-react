// models/subtopic.js
module.exports = (sequelize, DataTypes) => {
    const Subtopic = sequelize.define('Subtopic', {
        subtopic_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        week_id: { type: DataTypes.INTEGER, allowNull: false },
        topic_id: { type: DataTypes.INTEGER, allowNull: false },
        title: { type: DataTypes.STRING(200), allowNull: false },
        sequence_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        is_orientation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    }, { tableName: 'Subtopics' });

    Subtopic.associate = function(models) {
        Subtopic.belongsTo(models.Week, { foreignKey: 'week_id', as: 'week', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        Subtopic.belongsTo(models.Topic, { foreignKey: 'topic_id', as: 'topic', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    };

    return Subtopic;
};
