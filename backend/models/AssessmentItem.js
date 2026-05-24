import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const AssessmentItem = sequelize.define('AssessmentItem', {
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
    instruction: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    span: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    ilo: {
        type: DataTypes.STRING(10),
        defaultValue: ''
    },
    cognitiveLevel: {
        type: DataTypes.ENUM('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'),
        field: 'cognitive_level'
    }
}, {
    tableName: 'assessment_items',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default AssessmentItem;
