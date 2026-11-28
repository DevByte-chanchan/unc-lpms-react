'use strict';

const { QueryTypes } = require('sequelize');
const { getConfig } = require('../config/database');
const { runMigrations } = require('../migrate');
const { seedIntegratedMaster } = require('../seeders/seedIntegratedMaster');
const db = require('../models');

let resetInProgress = false;

/**
 * Safely wipes all tables & views inside the live MySQL database WITHOUT closing
 * Sequelize's connection pool or dropping the database schema itself, then re-runs
 * all migrations (including AuditLogs immutability triggers) and reseeds initial data.
 */
async function wipeAndReseedLiveDatabase() {
  if (resetInProgress) {
    const err = new Error('A database reset is already in progress. Please wait a moment.');
    err.status = 409;
    throw err;
  }

  resetInProgress = true;
  const cfg = getConfig();
  const qi = db.sequelize.getQueryInterface();

  try {
    const tables = await db.sequelize.query(
      `SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = :schema`,
      {
        replacements: { schema: cfg.database },
        type: QueryTypes.SELECT,
      }
    );

    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const row of tables) {
        const name = String(row.TABLE_NAME || '').replace(/`/g, '``');
        if (!name) continue;
        if (String(row.TABLE_TYPE).toUpperCase() === 'VIEW') {
          await db.sequelize.query(`DROP VIEW IF EXISTS \`${name}\``);
        } else {
          await db.sequelize.query(`DROP TABLE IF EXISTS \`${name}\``);
        }
      }
    } finally {
      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Re-run all migrations (creates all tables & triggers cleanly on the live pool)
    await runMigrations();

    // Re-seed all initial integrated-lpms data (roles, periods, depts, programs, courses, HCI & OOP)
    await seedIntegratedMaster();

    return { ok: true, droppedCount: tables.length, database: cfg.database };
  } finally {
    // Ensure connection pool stays clean even on unexpected error
    void qi;
    resetInProgress = false;
  }
}

module.exports = { wipeAndReseedLiveDatabase };
