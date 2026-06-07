'use strict';
module.exports = (sequelize, DataTypes) => {
    const ProgramOutcomeAlignment = sequelize.define('ProgramOutcomeAlignment', {
        po_alignment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_id: { type: DataTypes.INTEGER, allowNull: false },
        po_id: { type: DataTypes.INTEGER, allowNull: false },
        attainment_level: { type: DataTypes.CHAR(1), allowNull: false }
    }, {
        tableName: 'ProgramOutcomeAlignments'
    });

    ProgramOutcomeAlignment.associate = function(models) {
        ProgramOutcomeAlignment.belongsTo(models.CourseOutcome, { foreignKey: 'co_id' });
        ProgramOutcomeAlignment.belongsTo(models.ProgramOutcome, { foreignKey: 'po_id' });
    };

    return ProgramOutcomeAlignment;
};
