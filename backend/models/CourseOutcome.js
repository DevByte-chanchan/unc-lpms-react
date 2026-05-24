import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const CourseOutcome = sequelize.define('CourseOutcome', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'course_code'
    },
    co: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    totalItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_items'
    }
}, {
    tableName: 'course_outcomes',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default CourseOutcome;
