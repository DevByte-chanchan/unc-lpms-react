'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'unc_lpms_integrated',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? 'rootdevpass',
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: 15,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  timezone: '+08:00',
};

module.exports = {
  development: dbConfig,
  test: { ...dbConfig, database: process.env.DB_TEST_NAME || 'unc_lpms_integrated_test' },
  production: dbConfig,
  getConfig: () => dbConfig,
};
