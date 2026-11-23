// models/reference.js
module.exports = (sequelize, DataTypes) => {
    const Reference = sequelize.define('Reference', {
        reference_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        course_id: { type: DataTypes.INTEGER, allowNull: true },
        course_no: { type: DataTypes.STRING(20), allowNull: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        type: { type: DataTypes.STRING(30), allowNull: false },
        author: { type: DataTypes.STRING(200) },
        isbn: { type: DataTypes.STRING(100) },
        link: { type: DataTypes.STRING(500) },
        publication_year: { type: DataTypes.DATE },
        parent_reference_id: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'References' });

    Reference.associate = function(models) {
        Reference.belongsTo(models.Course, { foreignKey: 'course_id', as: 'Course' });
        Reference.belongsTo(models.Reference, { foreignKey: 'parent_reference_id', as: 'parentReference' });
    };

    return Reference;
};
