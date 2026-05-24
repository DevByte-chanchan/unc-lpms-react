import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const ItemRubric = sequelize.define('ItemRubric', {
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
    criteria: {
        type: DataTypes.TEXT
    },
    weight: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'sort_order'
    }
}, {
    tableName: 'item_rubrics',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
});

export default ItemRubric;
