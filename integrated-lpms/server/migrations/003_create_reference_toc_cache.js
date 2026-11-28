'use strict';

/**
 * Migration 003 — Additive Table `reference_toc_cache`
 * Stores verified, manually-pasted, or not_found Table of Contents (TOC) snapshots
 * for records in `References` without altering any existing columns on shared tables.
 */

async function up({ context: { db } }) {
  await db.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`reference_toc_cache\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`reference_id\` INT UNSIGNED NOT NULL,
      \`toc_status\` ENUM('verified', 'not_found', 'manual') NOT NULL DEFAULT 'not_found',
      \`toc_source\` VARCHAR(50) NULL,
      \`toc_entries\` JSON NULL,
      \`source_url\` VARCHAR(500) NULL,
      \`checked_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_reference_toc_cache_ref_id\` (\`reference_id\`),
      KEY \`idx_reference_toc_cache_status\` (\`toc_status\`),
      CONSTRAINT \`fk_reference_toc_cache_reference\`
        FOREIGN KEY (\`reference_id\`)
        REFERENCES \`References\` (\`reference_id\`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function down({ context: { db } }) {
  await db.sequelize.query('DROP TABLE IF EXISTS `reference_toc_cache`');
}

module.exports = { up, down };
