'use strict';

/**
 * Migration 002 — MySQL 8 Append-Only Immutability Triggers for AuditLogs
 * Replaces SQLite's RAISE(ABORT, ...) triggers with MySQL SIGNAL SQLSTATE '45000'.
 */

async function up({ context: { db } }) {
  await db.sequelize.query('DROP TRIGGER IF EXISTS trg_audit_logs_no_update');
  await db.sequelize.query('DROP TRIGGER IF EXISTS trg_audit_logs_no_delete');

  await db.sequelize.query(`
    CREATE TRIGGER trg_audit_logs_no_update
    BEFORE UPDATE ON AuditLogs
    FOR EACH ROW
    BEGIN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AuditLogs is append-only and cannot be updated.';
    END
  `);

  await db.sequelize.query(`
    CREATE TRIGGER trg_audit_logs_no_delete
    BEFORE DELETE ON AuditLogs
    FOR EACH ROW
    BEGIN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AuditLogs is append-only and cannot be deleted.';
    END
  `);
}

async function down({ context: { db } }) {
  await db.sequelize.query('DROP TRIGGER IF EXISTS trg_audit_logs_no_update');
  await db.sequelize.query('DROP TRIGGER IF EXISTS trg_audit_logs_no_delete');
}

module.exports = { up, down };
