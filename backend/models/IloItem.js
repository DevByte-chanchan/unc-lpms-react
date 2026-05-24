import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const IloItem = sequelize.define('IloItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    coId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'co_id'
    },
    description: {
        type: DataTypes.TEXT
    },
    hours: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    percentage: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    items: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'ilo_items',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default IloItem;
