/**
 * Course — curriculum catalog course (parent core data).
 *
 * Mirrors the lpms_composition `Courses` table:
 *   course_no       alphanumeric code (e.g. "BIT313L")
 *   course_title    e.g. "Human and Computer Interaction"
 *   credit          lec/lab string, e.g. "2 LEC, 1 LAB"
 *   contact_hrs     e.g. "2 Hrs Lec, 3 Hrs Lab"
 *   classification  e.g. "Professional Courses" | "Core Courses" | "Elective"
 *   cmo             e.g. "CMO No. 25 S. 2015"
 *   year_lvl        e.g. "THIRD YEAR"
 *   term            e.g. "1st Semester SY 2025-2026"
 *   period_id       FK → academic_periods.id (the term this curriculum
 *                   snapshot belongs to). Each term carries its own copy
 *                   of the catalog, cloned forward from the prior term.
 *
 * Period-scoped: every academic term owns an independent copy of the
 * curriculum, so edits in one term don't bleed into another.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Course',
    {
      course_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      course_no:      { type: DataTypes.STRING(32), allowNull: false },
      course_title:   { type: DataTypes.STRING(150), allowNull: false },
      credit:         { type: DataTypes.STRING(32), allowNull: true },
      contact_hrs:    { type: DataTypes.STRING(64), allowNull: true },
      classification: { type: DataTypes.STRING(64), allowNull: true },
      cmo:            { type: DataTypes.STRING(64), allowNull: true },
      year_lvl:       { type: DataTypes.STRING(32), allowNull: true },
      // Free-text prerequisites as typed on the form (e.g. "BIT201, BIT202").
      // Kept as text so codes that aren't in the catalog (e.g. a prior-semester
      // course not loaded this term) are still preserved. The Prerequisite join
      // table additionally links any codes that DO resolve, for clickable chips.
      prerequisites_text: { type: DataTypes.TEXT, allowNull: true },
      term:           { type: DataTypes.STRING(64), allowNull: true },
      // 1 = 1st Semester, 2 = 2nd Semester. Existing rows backfill to 1.
      semester:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      // Archived courses are hidden from the catalog grid and from every page
      // that reads the catalog (Industry Consultant picker, Course Assignment),
      // but kept in the DB so they can be restored.
      archived:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      period_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'academic_period_id' },
      // NOTE: there is deliberately no program_id here. A course is offered by
      // MANY programs (GE 101 is taught in BSIT, BSCS, BSN…), so the course →
      // program link is many-to-many and lives in program_course_offerings,
      // the associative entity. A column here could only express one program,
      // which is precisely the thing the model has to stop claiming.
    },
    { tableName: 'courses', timestamps: true }
  );
