'use strict';

const mysql = require('mysql2/promise');
const { getConfig } = require('../config/database');
const { runMigrations } = require('../migrate');
const { seedIntegratedMaster } = require('../seeders/seedIntegratedMaster');
const db = require('../models');

async function resetDatabase() {
  const cfg = getConfig();
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${cfg.database}\``);
    await conn.query(
      `CREATE DATABASE \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[db:reset] Recreated fresh database '${cfg.database}'.`);
  } finally {
    await conn.end();
  }

  await runMigrations();
  await seedIntegratedMaster();
  await db.sequelize.close();
  console.log('[db:reset] Fresh migration + master seed complete.');
}

if (require.main === module) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db:reset] Failed:', err);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
