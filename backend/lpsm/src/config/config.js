require('dotenv').config();

const config = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lpsm_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3308,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lpsm_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3308,
    dialect: 'mysql',
    logging: false
  }
};

module.exports = config;
