import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Course = sequelize.define('Course', {
    code: {
        type: DataTypes.STRING(20),
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    }
}, {
    tableName: 'courses',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default Course;
