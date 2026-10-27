'use strict';
// The Reference Library rules the Director of Libraries sets for everyone (one row, id 1).
module.exports = (sequelize, DataTypes) => {
    const CatalogSetting = sequelize.define('CatalogSetting', {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        recency_years: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        enforce_recency: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        require_availability: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        updated_by_name: { type: DataTypes.STRING(100), allowNull: true }
    }, { tableName: 'CatalogSettings' });
    return CatalogSetting;
};
