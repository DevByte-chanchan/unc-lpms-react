'use strict';
module.exports = (sequelize, DataTypes) => {
    const Prerequisite = sequelize.define('Prerequisite', {
        prerequisite_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        course_id: { type: DataTypes.INTEGER, allowNull: false }, // the course that has prerequisites
        prerequisite_course_id: { type: DataTypes.INTEGER, allowNull: false } // the course_id of the prerequisite
    }, {
        tableName: 'Prerequisites'
    });

    Prerequisite.associate = function(models) {
        // course that owns the prerequisite
        Prerequisite.belongsTo(models.Course, { foreignKey: 'course_id', as: 'MainCourse' });
        // course that is the prerequisite
        Prerequisite.belongsTo(models.Course, { foreignKey: 'prerequisite_course_id', as: 'PrereqCourse' });
    };

    return Prerequisite;
};
