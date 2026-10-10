/**
 * ImportBatch — the record of one bulk upload or manual add: which entity,
 * which period, which file, when, and the upload's own summary. Invitations
 * point at the batch that gave the access (account_invitations.import_batch_id).
 *
 * Uploads are final — there is no undo. `snapshot` held a before-image when
 * uploads could be undone; new batches leave it empty, and the column stays
 * so older rows keep their data (no schema change).
 *
 * status: 'pending'  — upload still running (a crashed upload leaves the row here)
 *         'complete' — upload succeeded
 *         'undone'   — legacy: an upload undone before undo was removed
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
