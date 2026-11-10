'use strict';

/**
 * Removes requirement tracking from the Course Assignment module. That tracking
 * belongs to the Learning Plan Approval Management System.
 *
 * up:
 *   - drops assignment_submissions
 *   - drops academic_periods.midterm_deadline and finals_deadline
 *   - drops course_offering_assignments.date_submitted and date_updated
 *   - deletes the requirement rows from notifications, and drops dedupe_key and
 *     its index (only the requirement reminders used them)
 *
 * down: recreates that SCHEMA only, empty. The data is in the backup taken
 * before this ran; see README.txt in backups/2026-11-09-requirements-removal/.
 * Restore the previous models too: boot's sync({ alter: true }) drops any column
 * the models don't have, so with today's models a restart undoes the columns.
 *
 * Exam dates (prelim_exam, midterm_exam, semifinal_exam, final_exam) and
 * classes_start stay: they are the term's calendar, not due dates.
 *
 * Every step checks first, because the schema has two origins: an existing
 * database was built by sync() and has no SequelizeMeta, so run only this file:
 *   npx sequelize-cli db:migrate --from 20261010000001-create-user-accounts.cjs
 * A fresh database runs all migrations, and has none of these columns yet.
 */
const REQUIREMENT_NOTIFICATION_KINDS = [
  'requirement_due', 'requirement_overdue', 'requirement_returned', 'overdue_digest', 'deadline',
];
const DEDUPE_INDEX = 'notifications_account_dedupe';

const hasTable = async (queryInterface, table) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'object' ? t.tableName : t)).includes(table);
};

const columnsOf = async (queryInterface, table) => (
  (await hasTable(queryInterface, table)) ? queryInterface.describeTable(table) : null
);

const dropColumns = async (queryInterface, table, names) => {
  const columns = await columnsOf(queryInterface, table);
  if (!columns) return;
  for (const name of names) {
    if (columns[name]) await queryInterface.removeColumn(table, name);
  }
};

const addMissingColumns = async (queryInterface, table, definitions) => {
  const columns = await columnsOf(queryInterface, table);
  if (!columns) return;
  for (const [name, definition] of Object.entries(definitions)) {
    if (!columns[name]) await queryInterface.addColumn(table, name, definition);
  }
};

const hasIndex = async (queryInterface, table, name) => (
  (await queryInterface.showIndex(table)).some((i) => i.name === name)
);

module.exports = {
  async up(queryInterface) {
    if (await hasTable(queryInterface, 'assignment_submissions')) {
      await queryInterface.dropTable('assignment_submissions');
    }

    await dropColumns(queryInterface, 'academic_periods', ['midterm_deadline', 'finals_deadline']);
    await dropColumns(queryInterface, 'course_offering_assignments', ['date_submitted', 'date_updated']);

    if (await hasTable(queryInterface, 'notifications')) {
      await queryInterface.bulkDelete('notifications', { kind: REQUIREMENT_NOTIFICATION_KINDS });
      if (await hasIndex(queryInterface, 'notifications', DEDUPE_INDEX)) {
        await queryInterface.removeIndex('notifications', DEDUPE_INDEX);
      }
      await dropColumns(queryInterface, 'notifications', ['dedupe_key']);
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, 'assignment_submissions'))) {
      await queryInterface.createTable('assignment_submissions', {
        assignment_submission_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        academic_period_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        program_id:  { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, comment: '0 = no program.' },
        course_code: { type: Sequelize.STRING(16), allowNull: false },
        doc_type:    { type: Sequelize.STRING(24), allowNull: false, comment: 'learning_plan | tos_midterm | tos_finals (retired, history only: coap | syllabus)' },
        status:      { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'submitted', comment: 'submitted | returned | approved' },
        first_submitted_at: { type: Sequelize.DATE, allowNull: true, comment: 'First submission ever — lateness is judged on this.' },
        submitted_at:       { type: Sequelize.DATE, allowNull: true, comment: 'Latest submission.' },
        submitted_by_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        reviewed_at:            { type: Sequelize.DATE, allowNull: true },
        reviewed_by_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        review_note:            { type: Sequelize.STRING(500), allowNull: true },
        document_ref: { type: Sequelize.STRING(64), allowNull: true, comment: 'Id of the syllabus/TOS record in its own module.' },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('assignment_submissions', ['academic_period_id', 'program_id', 'course_code', 'doc_type'], {
        name: 'as_course_doc_unique',
        unique: true,
      });
    }

    await addMissingColumns(queryInterface, 'academic_periods', {
      midterm_deadline: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Midterm TOS deadline (optional override; blank = midterm_exam - PRE_EXAM_DAYS).' },
      finals_deadline:  { type: Sequelize.DATEONLY, allowNull: true, comment: 'Finals TOS deadline (optional override; blank = final_exam - PRE_EXAM_DAYS).' },
    });

    await addMissingColumns(queryInterface, 'course_offering_assignments', {
      date_submitted: { type: Sequelize.DATE, allowNull: true, comment: 'When the assigned faculty submitted their requirement for this course.' },
      date_updated:   { type: Sequelize.DATE, allowNull: true, comment: 'When the submission was last revised.' },
    });

    if (await hasTable(queryInterface, 'notifications')) {
      await addMissingColumns(queryInterface, 'notifications', {
        dedupe_key: {
          type: Sequelize.STRING(64),
          allowNull: true,
          comment: 'Reminders: doc:{period}:{program}:{course}:{doc_type}:{kind}:{days|w<n>|return} or digest:{period}:{program}:{day}, so the daily step never adds one twice.',
        },
      });
      if (!(await hasIndex(queryInterface, 'notifications', DEDUPE_INDEX))) {
        await queryInterface.addIndex('notifications', ['user_account_id', 'dedupe_key'], { name: DEDUPE_INDEX });
      }
    }
  },
};
