'use strict';

/**
 * Demo seed mirroring the sample workbooks. Running this gives the
 * frontend something to render before anyone uploads real files.
 *
 * The data here MUST stay consistent with the sample Excel files in
 * the project root so the validation logic can be eyeballed end-to-end
 * (e.g. the Instructor name on a course offering resolves to a real
 * Faculty.name).
 */
const now = () => new Date();

module.exports = {
  async up(queryInterface /*, Sequelize */) {
    const t = now();

    await queryInterface.bulkInsert('departments', [
      { name: 'College of Education',                             code: 'COE',  dean: 'Dr. Maria Santos',   created_at: t, updated_at: t },
      { name: 'College of Engineering and Architecture',          code: 'CEA',  dean: 'Prof. Juan Dela Cruz', created_at: t, updated_at: t },
      { name: 'Criminal Justice Education',                       code: 'CJE',  dean: 'Dr. Ana Reyes',      created_at: t, updated_at: t },
      { name: 'School of Business and Accountancy',               code: 'SBA',  dean: 'Prof. Mark Tan',     created_at: t, updated_at: t },
      { name: 'School of Computer and Information Sciences',      code: 'SCIS', dean: 'Sophia Sterling',    created_at: t, updated_at: t },
    ]);

    await queryInterface.bulkInsert('faculty', [
      { name: 'Sophia Sterling',     role: 'Professor',           department: 'School of Computer and Information Sciences', status: 'Active',   about: 'Sophia Sterling is a dedicated and experienced educator in the field of Computer and Information Sciences. With a passion for both teaching and technology, she has spent over a decade fostering the next generation of tech professionals.', created_at: t, updated_at: t },
      { name: 'Dr. Maria Santos',    role: 'Dean',                department: 'College of Education',                        status: 'Active',   about: 'A specialist in curriculum development and educational leadership, Dr. Santos focuses on integrating modern pedagogical techniques.', created_at: t, updated_at: t },
      { name: 'Prof. Juan Dela Cruz',role: 'Associate Professor', department: 'College of Engineering and Architecture',     status: 'Active',   about: 'Licensed architect with a focus on sustainable urban design and structural integrity in high-density projects.', created_at: t, updated_at: t },
      { name: 'Dr. Ana Reyes',       role: 'Assistant Professor', department: 'Criminal Justice Education',                  status: 'On Leave', about: 'Dr. Reyes has extensive experience in forensic psychology and has served as a consultant for national law enforcement.', created_at: t, updated_at: t },
      { name: 'Prof. Mark Tan',      role: 'Instructor',          department: 'School of Business and Accountancy',          status: 'Active',   about: 'A certified public accountant and financial analyst, Prof. Tan teaches corporate finance and international taxation.', created_at: t, updated_at: t },
    ]);

    await queryInterface.bulkInsert('programs', [
      { code: 'BSCS', name: 'Bachelor of Science in Computer Science',        program_head: 'Dr. Alan Turing',     created_at: t, updated_at: t },
      { code: 'BSIT', name: 'Bachelor of Science in Information Technology',  program_head: 'Prof. Grace Hopper',  created_at: t, updated_at: t },
      { code: 'BSIS', name: 'Bachelor of Science in Information Systems',     program_head: 'Sarah Jenkins',       created_at: t, updated_at: t },
      { code: 'BSCE', name: 'Bachelor of Science in Computer Engineering',    program_head: 'Robert Noyce',        created_at: t, updated_at: t },
      { code: 'BSSE', name: 'Bachelor of Science in Software Engineering',    program_head: 'Margaret Hamilton',   created_at: t, updated_at: t },
    ]);
  },

  async down(queryInterface /*, Sequelize */) {
    await queryInterface.bulkDelete('programs', null, {});
    await queryInterface.bulkDelete('faculty', null, {});
    await queryInterface.bulkDelete('departments', null, {});
  },
};
