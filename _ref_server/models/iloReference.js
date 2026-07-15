// models/iloReference.js
module.exports = (sequelize, DataTypes) => {
    const ILOReference = sequelize.define('ILOReference', {
        ilo_reference_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        reference_id: { type: DataTypes.INTEGER, allowNull: false },
        ilo_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'ILOReferences' });
    return ILOReference;
};
