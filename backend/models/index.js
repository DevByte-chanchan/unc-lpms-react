import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('lpms_db', 'lpms_user', 'lpms_pass', {
    host: 'localhost',
    dialect: 'mysql'
});

export default sequelize;
