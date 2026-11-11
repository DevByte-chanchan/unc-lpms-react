/**
 * CurriculumDocument — a registrar's Program of Study PDF, kept after import so
 * anyone can open the original to check a unit count, a prerequisite or the CMO.
 *
 * The file itself lives on disk at server/storage/curriculum/<sha256>.pdf (see
 * services/curriculumDocuments.js) — never under its uploaded name, and only
 * ever served through the authenticated /api/curriculum-documents/:id/file.
 *
 * One row per stored file per program. A program's ACTIVE rows are its latest
 * revision; a revision split over two files (1st–2nd Year, 3rd–4th Year) has
 * two active rows side by side. Uploading a new revision marks the older active
 * rows `superseded`; undoing that import marks this batch's rows `removed` and
 * puts the ones it superseded (superseded_by_batch_id) back to `active`.
 *
 * status: active · superseded · removed
 * No foreign keys: a record that outlives the term and the batch it came from.
 */
export default (sequelize, DataTypes) => sequelize.define(
  'CurriculumDocument',
  {
    id: {
      field: 'curriculum_document_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'academic_period_id', comment: 'The term it was uploaded in.' },
    import_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: 'The Course Offerings import that saved it (for Undo).' },
    superseded_by_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: 'The import that superseded it, so its Undo can put it back.' },
    sha256: { type: DataTypes.CHAR(64), allowNull: false, comment: 'Also the stored file name: <sha256>.pdf' },
    original_name: { type: DataTypes.STRING(150), allowNull: false },
    size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    pages: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    part_label: { type: DataTypes.STRING(64), allowNull: true, comment: 'e.g. "1st–2nd Year", from the year headings in this file.' },
    years_covered: { type: DataTypes.STRING(16), allowNull: true, comment: 'e.g. "1,2" — which year levels this file holds.' },
    course_codes: { type: DataTypes.TEXT, allowNull: true, comment: 'Upper-cased course codes found in this file, comma-separated — drives a course\'s "Source:" line.' },
    program_name: { type: DataTypes.STRING(150), allowNull: true },
    cmo: { type: DataTypes.STRING(64), allowNull: true },
    effectivity: { type: DataTypes.STRING(100), allowNull: true },
    revision: { type: DataTypes.STRING(16), allowNull: true },
    uploaded_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
  },
  {
    tableName: 'curriculum_documents',
    timestamps: true,
    indexes: [
      { name: 'curriculum_documents_program_status', fields: ['program_id', 'status'] },
      { name: 'curriculum_documents_batch', fields: ['import_batch_id'] },
    ],
  }
);
