'use strict';
module.exports = (sequelize, DataTypes) => {
    const Program = sequelize.define('Program', {
        program_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dept_id: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        stakeholder_id: { type: DataTypes.INTEGER } // plain attribute
    }, {
        tableName: 'Programs'
    });

    Program.associate = function(models) {
        Program.belongsTo(models.Department, { foreignKey: 'dept_id' });
        Program.hasMany(models.ProgramCourseOffering, { foreignKey: 'program_id' });
        Program.hasMany(models.ProgramOutcome, { foreignKey: 'program_id' });
    };

    return Program;
};
