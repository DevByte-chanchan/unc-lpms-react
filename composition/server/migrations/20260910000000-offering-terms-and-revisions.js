'use strict';

// Terms and revisions on ProgramCourseOfferings.
//
//   school_year, semester      the term the offering belongs to
//   revision_number            0 = a working copy the Dean has not approved yet (so it has no
//                              revision number); the first approved revision is 1. It is
//                              assigned only when the Dean accepts. (A NULL would need the
//                              table rebuilt, and rebuilding it with its foreign keys on
//                              deletes every dependent row, so 0 stands for "none yet".)
//   base_offering_id           the approved offering a new revision was started from
//   carried_from_offering_id   set when an unchanged approved syllabus was carried over to a
//                              new term: same revision number, identical content
//   approved_at                when the Dean accepted
//
// Two rules are enforced by partial unique indexes, as a backstop to the checks in the code:
//   - one working copy at a time per course and program
//   - at most one new approved revision per course, program and term (a carry-over is not new)
//
// down() drops the indexes and columns; revision numbers set to 0 are not restored.

const { backfillOfferings } = require('../utils/offeringBackfill');

const INDEXES = {
    offerings_one_working_copy:
        `CREATE UNIQUE INDEX IF NOT EXISTS offerings_one_working_copy ON ProgramCourseOfferings (course_id, program_id)
         WHERE approved_at IS NULL AND carried_from_offering_id IS NULL AND revision_number = 0`,
    offerings_one_new_revision_per_term:
        `CREATE UNIQUE INDEX IF NOT EXISTS offerings_one_new_revision_per_term ON ProgramCourseOfferings (course_id, program_id, school_year, semester)
         WHERE approved_at IS NOT NULL AND carried_from_offering_id IS NULL`,
};

module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('ProgramCourseOfferings');
        const add = async (name, definition) => {
            if (!columns[name]) await queryInterface.addColumn('ProgramCourseOfferings', name, definition);
        };
        await add('school_year', { type: Sequelize.STRING(9), allowNull: true });
        await add('semester', { type: Sequelize.STRING(10), allowNull: true });
        await add('base_offering_id', { type: Sequelize.INTEGER, allowNull: true });
        await add('carried_from_offering_id', { type: Sequelize.INTEGER, allowNull: true });
        await add('approved_at', { type: Sequelize.DATE, allowNull: true });

        await backfillOfferings(queryInterface);
        for (const sql of Object.values(INDEXES)) await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface) {
        for (const name of Object.keys(INDEXES)) await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${name};`);
        const columns = await queryInterface.describeTable('ProgramCourseOfferings');
        for (const name of ['school_year', 'semester', 'base_offering_id', 'carried_from_offering_id', 'approved_at']) {
            if (columns[name]) await queryInterface.sequelize.query(`ALTER TABLE ProgramCourseOfferings DROP COLUMN ${name};`);
        }
    }
};
