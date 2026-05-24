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
        type: DataTypes.ENUM('draft', 'pending', 'approved'),
        defaultValue: 'draft'
    }
}, {
    tableName: 'tos_statuses',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default TosStatus;
