// models/reference.js
module.exports = (sequelize, DataTypes) => {
    const Reference = sequelize.define('Reference', {
        reference_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        type: { type: DataTypes.STRING(30), allowNull: false },
        author: { type: DataTypes.STRING(200) },
        isbn: { type: DataTypes.STRING(100) },
        link: { type: DataTypes.STRING(500) },
        publisher: { type: DataTypes.STRING(200) },
        publication_year: { type: DataTypes.DATE },
        // What the library holds. Unknown copies stay NULL; status says whether the title can still be used.
        copies: { type: DataTypes.INTEGER },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'available' },
        category: { type: DataTypes.STRING(50) },
        date_received: { type: DataTypes.DATEONLY },
        // Archived references stay on plans that already use them but cannot be picked for new links.
        archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: DataTypes.INTEGER }
    }, { tableName: 'References' });
    return Reference;
};
