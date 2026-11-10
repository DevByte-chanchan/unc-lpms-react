'use strict';

module.exports = (sequelize, DataTypes) => {
    const Faculty = sequelize.define(
        'Faculty',
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            sex: {
                type: DataTypes.STRING(16),
                allowNull: true,
            },
            birthdate: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            contact_number: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },
            department_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            position: {
                type: DataTypes.STRING(64),
                allowNull: false,
                defaultValue: 'Instructor',
            },
            employment_type: {
                type: DataTypes.STRING(64),
                allowNull: false,
                defaultValue: 'Full-time',
            },
            status: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'Active',
            },
            academic_period_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
        },
        {
            tableName: 'faculty',
            underscored: true,
        }
    );

    Faculty.associate = function (models) {
        if (models.Department) {
            Faculty.belongsTo(models.Department, { foreignKey: 'department_id', targetKey: 'dept_id', as: 'department' });
        }
        if (models.UserAccount) {
            Faculty.hasOne(models.UserAccount, { foreignKey: 'faculty_id', as: 'userAccount' });
        }
    };

    return Faculty;
};
