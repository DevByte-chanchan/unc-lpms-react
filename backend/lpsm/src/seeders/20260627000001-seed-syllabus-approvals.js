'use strict';

const syllabi = [
  { code: 'BSCS313L', name: 'Human & Computer Interaction', instructor: 'CASIMERO, DANNY', year: '2025-2026', sem: '1st' },
  { code: 'BSCS322L', name: 'Software Engineering', instructor: 'CASIMERO, DANNY', year: '2025-2026', sem: '2nd' }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const records = syllabi.map(s => ({
      course_code: s.code,
      course_name: s.name,
      instructor_name: s.instructor,
      academic_year: s.year,
      semester: s.sem,
      current_stage: 'submitted',
      oic_status: 'pending',
      submitted_at: now,
      created_at: now,
      updated_at: now
    }));
    await queryInterface.bulkInsert('syllabus_approvals', records, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('syllabus_approvals', null, {});
  }
};
