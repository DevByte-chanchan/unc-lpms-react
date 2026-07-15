'use strict';
module.exports = (sequelize, DataTypes) => {
    const ProgramOutcome = sequelize.define('ProgramOutcome', {
        po_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: { type: DataTypes.INTEGER, allowNull: false },
        description: { type: DataTypes.STRING(200), allowNull: false }
    }, {
        tableName: 'ProgramOutcomes'
    });

    ProgramOutcome.associate = function(models) {
        ProgramOutcome.belongsTo(models.Program, { foreignKey: 'program_id' });
        ProgramOutcome.hasMany(models.ProgramOutcomeAlignment, { foreignKey: 'po_id' });
    };

    return ProgramOutcome;
};
