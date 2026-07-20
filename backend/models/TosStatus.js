import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const TosStatus = sequelize.define('TosStatus', {
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
    status: {
        type: DataTypes.ENUM('draft', 'pending', 'approved', 'returned'),
        allowNull: false,
        defaultValue: 'draft'
    },
    submittedAt: {
        type: DataTypes.DATE,
        field: 'submitted_at'
    },
    returnedAt: {
        type: DataTypes.DATE,
        field: 'returned_at'
    },
    approvedAt: {
        type: DataTypes.DATE,
        field: 'approved_at'
    },
    returnCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'return_count'
    },
    returnDates: {
        type: DataTypes.TEXT,
        defaultValue: '[]',
        field: 'return_dates'
    }
}, {
    tableName: 'tos_statuses',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default TosStatus;
