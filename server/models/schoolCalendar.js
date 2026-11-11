/**
 * SchoolCalendar — the official academic calendar the VPAA uploaded (a picture
 * or a PDF), kept with its school year so the term form can be filled from it
 * again (the next semester of the same year needs no new upload) and so the
 * term card can show it.
 *
 * The file lives on disk at server/storage/calendars/<sha256>.<ext> (see
 * services/schoolCalendars.js), never under its uploaded name, and is served
 * only through GET /api/school-calendars/:id/file (VPAA).
 *
 * `extracted` is the reader's transcript (every semester block found) plus
 * where it came from; the form fields for a semester are worked out from it on
 * request (utils/schoolCalendarParse.js), so a parser fix applies to files
 * already kept. Uploading the same file again reuses its row.
 *
 * No foreign keys: it belongs to a school year, not to a term row.
 */
export default (sequelize, DataTypes) => sequelize.define(
  'SchoolCalendar',
  {
    id: {
      field: 'school_calendar_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    school_year: { type: DataTypes.STRING(9), allowNull: true, comment: 'e.g. "2026-2027": read from the file, else the form\'s.' },
    sha256: { type: DataTypes.CHAR(64), allowNull: false, unique: 'school_calendars_sha256', comment: 'Also the stored file name.' },
    original_name: { type: DataTypes.STRING(150), allowNull: false },
    mime: { type: DataTypes.STRING(32), allowNull: false },
    size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    extracted: { type: DataTypes.JSON, allowNull: true, comment: '{ transcript, source, confidence, warnings }: see services/schoolCalendarReader.js' },
    uploaded_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: 'school_calendars',
    timestamps: true,
    indexes: [
      { name: 'school_calendars_year', fields: ['school_year'] },
    ],
  }
);
