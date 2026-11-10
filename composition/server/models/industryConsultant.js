'use strict';

module.exports = (sequelize, DataTypes) => {
    const IndustryConsultant = sequelize.define(
        'IndustryConsultant',
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
            assigned_course_code: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },
            assigned_course_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            academic_period_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
        },
        {
            tableName: 'industry_consultants',
            underscored: true,
        }
    );

    IndustryConsultant.associate = function (models) {
        if (models.UserAccount) {
            IndustryConsultant.hasOne(models.UserAccount, { foreignKey: 'industry_consultant_id', as: 'userAccount' });
        }
    };

    return IndustryConsultant;
};
