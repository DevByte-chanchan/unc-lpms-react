import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('lpms_db', 'lpms_user', 'lpms_pass', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
});

export default sequelize;
