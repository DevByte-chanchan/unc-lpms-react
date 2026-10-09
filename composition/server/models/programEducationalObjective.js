'use strict';
module.exports = (sequelize, DataTypes) => {
    const ProgramEducationalObjective = sequelize.define('ProgramEducationalObjective', {
        peo_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: { type: DataTypes.INTEGER, allowNull: false },
        statement: { type: DataTypes.STRING(500), allowNull: false },
        mission_aligned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    }, {
        tableName: 'ProgramEducationalObjectives'
    });

    ProgramEducationalObjective.associate = function(models) {
        ProgramEducationalObjective.belongsTo(models.Program, { foreignKey: 'program_id' });
    };

    return ProgramEducationalObjective;
};
