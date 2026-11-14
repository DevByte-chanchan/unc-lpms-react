'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Already filled (by migration 20261121000000 on an existing database): nothing to add.
        const [[{ n }]] = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM academic_periods');
        if (Number(n) > 0) return;
        const now = new Date();
        await queryInterface.bulkInsert('academic_periods', [
            {
                academic_period_id: 1,
                label: '1st Semester 2026-2027',
                school_year: '2026-2027',
                semester: '1',
                is_active: true,
                sort_order: 100,
                status: 'Active',
                closed_at: null,
                start_date: '2026-08-11',
                classes_start: '2026-08-18',
                prelim_exam: '2026-09-08',
                midterm_exam: '2026-10-05',
                semifinal_exam: '2026-11-09',
                final_exam: '2026-12-07',
                end_date: '2026-12-10',
                createdAt: now,
                updatedAt: now,
            },
            {
                academic_period_id: 2,
                label: '2nd Semester 2025-2026',
                school_year: '2025-2026',
                semester: '2',
                is_active: false,
                sort_order: 90,
                status: 'Closed',
                closed_at: new Date('2026-05-25T23:59:59.000Z'),
                start_date: '2026-01-12',
                classes_start: '2026-01-19',
                prelim_exam: '2026-02-16',
                midterm_exam: '2026-03-16',
                semifinal_exam: '2026-04-20',
                final_exam: '2026-05-18',
                end_date: '2026-05-25',
                createdAt: now,
                updatedAt: now,
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('academic_periods', null, {});
    },
};
