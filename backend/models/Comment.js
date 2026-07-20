import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Comment = sequelize.define('Comment', {
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
    courseOutcomeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'course_outcome_id'
    },
    assessmentItemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assessment_item_id'
    },
    co: {
        type: DataTypes.STRING(20),
        defaultValue: ''
    },
    ilo: {
        type: DataTypes.STRING(20),
        defaultValue: ''
    },
    cognitiveLevel: {
        type: DataTypes.STRING(50),
        defaultValue: '',
        field: 'cognitive_level'
    },
    itemNumber: {
        type: DataTypes.STRING(20),
        defaultValue: '',
        field: 'item_number'
    },
    type: {
        type: DataTypes.STRING(50),
        defaultValue: ''
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    resolved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    returnNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'return_number'
    }
}, {
    tableName: 'comments',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default Comment;
