'use strict';

const mysql = require('mysql2/promise');
const { getConfig } = require('../config/database');

async function createDatabase() {
  const cfg = getConfig();
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[db:create] Database '${cfg.database}' ready.`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  createDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db:create] Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { createDatabase };
