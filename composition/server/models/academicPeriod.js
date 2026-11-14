'use strict';

module.exports = (sequelize, DataTypes) => {
    const AcademicPeriod = sequelize.define(
        'AcademicPeriod',
        {
            id: {
                field: 'academic_period_id',
                type: DataTypes.INTEGER, // plain INTEGER: SQLite has no UNSIGNED
                primaryKey: true,
                autoIncrement: true,
            },
            label: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true,
            },
            school_year: {
                type: DataTypes.STRING(10),
                allowNull: false,
            },
            semester: {
                type: DataTypes.STRING(16),
                allowNull: false,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            sort_order: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: DataTypes.ENUM('Active', 'Closed'),
                allowNull: false,
                defaultValue: 'Active',
            },
            closed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            start_date: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            end_date: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            classes_start: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            prelim_exam: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            midterm_exam: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            semifinal_exam: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            final_exam: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
        },
        {
            tableName: 'academic_periods',
            timestamps: true,
        }
    );

    return AcademicPeriod;
};
