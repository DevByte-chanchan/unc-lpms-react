'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { syllabiData } = await import('../../../../src/data/syllabiData.js');
    const codes = ['BSCS313L', 'BSCS322L'];
    const now = new Date();
    const records = syllabiData.filter(s => codes.includes(s.code)).map(s => ({
      course_code: s.code,
      academic_year: '2025-2026',
      semester: (s.sem || '').replace(' Semester', ''),
      content: JSON.stringify(s),
      is_current: true,
      created_by: null,
      created_at: now,
      updated_at: now
    }));
    if (records.length) {
      await queryInterface.bulkInsert('syllabus_content', records, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('syllabus_content', null, {});
  }
};
