/**
 * ImportBatch — the before-image of a bulk upload, so it can be undone.
 *
 * One row is written just BEFORE an upload mutates anything. `snapshot`
 * holds every row of every table that upload touches (see utils/importUndo.js
 * for the per-entity table groups), so undo is a restore rather than a
 * guess at which rows the upload created.
 *
 * Uploads MERGE (update matched rows, insert the rest), so "delete what
 * was added" would leave overwritten rows overwritten. A full snapshot is
 * the only representation that reverts an upload exactly.
 *
 * status: 'pending'  — snapshot taken, upload still running (never offered
 *                      as undoable; a crashed upload leaves the row here)
 *         'complete' — upload succeeded; this is the batch Undo targets
 *         'undone'   — already restored; keeps the audit trail
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ImportBatch',
    {
      id: {
        field: 'import_batch_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      entity: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'faculty | departments | programs | courses | course_offering_assignments | industry_consultants',
      },
      action: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'upload',
        comment: "'upload' (bulk import) or 'add' (a row added by hand).",
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'For an add: the name of the row added, so the prompt can say what it removes.',
      },
      period_id: {
        field: 'academic_period_id',
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Original name of the uploaded workbook, for the undo prompt.',
      },
      // LONGTEXT: a snapshot of a period's whole curriculum can run past
      // the 64 KB a plain TEXT column would silently truncate at.
      snapshot: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        comment: 'JSON: { tableName: [row, …] } captured before the upload ran.',
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON: { inserted, updated } as reported by the upload.',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'pending',
      },
      undone_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'import_batches',
      timestamps: true,
      indexes: [
        // `fields` are COLUMN names, not model attributes — hence the renamed column.
        { name: 'import_batches_lookup', fields: ['entity', 'academic_period_id', 'status'] },
      ],
    }
  );
