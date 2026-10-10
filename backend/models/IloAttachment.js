import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const IloAttachment = sequelize.define('IloAttachment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    examPeriod: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Midterm',
        field: 'exam_period'
    },
    courseCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'course_code'
    },
    iloId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ilo_id'
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filepath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('objective', 'non-objective'),
        allowNull: false,
        defaultValue: 'objective'
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'ilo_attachments',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default IloAttachment;
