// models/reference.js
module.exports = (sequelize, DataTypes) => {
    const Reference = sequelize.define('Reference', {
        reference_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        type: { type: DataTypes.STRING(30), allowNull: false },
        author: { type: DataTypes.STRING(200) },
        isbn: { type: DataTypes.STRING(100) },
        link: { type: DataTypes.STRING(500) },
        publication_year: { type: DataTypes.DATE }
    }, { tableName: 'References' });
    return Reference;
};
