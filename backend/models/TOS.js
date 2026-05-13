import { DataTypes } from 'sequelize';
import sequelize from './index.js';

const TOS = sequelize.define('TOS', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.STRING }
});

export default TOS;
