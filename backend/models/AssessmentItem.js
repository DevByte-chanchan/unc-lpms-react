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
    iloId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'ilo_id'
    },
    instruction: {
        type: DataTypes.TEXT,
        allowNull: false,
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
    cognitiveLevel: {
        type: DataTypes.ENUM('Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'),
        allowNull: false,
        field: 'cognitive_level'
    }
}, {
    tableName: 'assessment_items',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default AssessmentItem;
