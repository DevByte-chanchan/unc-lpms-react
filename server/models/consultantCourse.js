/**
 * ConsultantCourse — join row linking an IndustryConsultant to a catalog
 * Course. A consultant may be assigned many courses, so this replaces the
 * single industry_consultants.assigned_course_id column.
 *
 * `course_code` is kept alongside the FK so an unmatched code (one that
 * doesn't resolve to a Course in the period) is still remembered for display.
 *
 * The two foreign keys delete differently, and both are declared HERE rather
 * than on the associations in models/index.js. Sequelize merges association
 * options into the attribute with mergeDefaults — first writer wins — so a
 * later `belongsTo(..., { onDelete })` silently loses to whatever
 * `belongsToMany` already stamped on the column. Declaring the rule on the
 * column itself is the only place nothing can clobber it.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ConsultantCourse',
    {
      id: {
        field: 'consultant_course_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      consultant_id: {
        field: 'industry_consultant_id',
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'industry_consultants', key: 'id' },
        // A link with no consultant is orphaned garbage.
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      course_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'courses', key: 'course_id' },
        // SET NULL, never CASCADE: re-uploading the curriculum replaces the
        // period's `courses` rows, and the assignment must survive that. The
        // row lives on with its course_code and re-resolves on the next match.
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Resolved FK to courses.course_id (null if the code was unmatched).',
      },
      course_code: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: 'Raw course code, kept even when the FK could not be resolved.',
      },
    },
    {
      tableName: 'consultant_courses',
      timestamps: false,
    }
  );
