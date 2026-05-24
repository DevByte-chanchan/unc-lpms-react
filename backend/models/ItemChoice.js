import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ItemChoice = sequelize.define('ItemChoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    itemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'item_id'
    },
    label: {
        type: DataTypes.STRING(10)
    },
    text: {
        type: DataTypes.TEXT
    },
    isCorrect: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_correct'
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'sort_order'
    }
}, {
    tableName: 'item_choices',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default ItemChoice;
