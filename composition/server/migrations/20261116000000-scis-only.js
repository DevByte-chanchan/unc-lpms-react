'use strict';

// Scope delimitation (title defense): the system covers the School of Computer and Information Sciences only. The
// demo data also had four other departments (SBA, CEA, CON, CJE) and two of their programs (BSA, BSCE), none with a
// single course. This removes them. A department or program outside SCIS that has course offerings is left alone:
// that is real data, not demo filler.

const SCIS = 'SCIS';

const DEPARTMENTS = [
    { dept_id: 1, name: 'School of Business and Accountancy', code: 'SBA' },
    { dept_id: 2, name: 'College of Engineering and Architecture', code: 'CEA' },
    { dept_id: 4, name: 'College of Nursing', code: 'CON' },
    { dept_id: 5, name: 'Criminal Justice Education', code: 'CJE' },
];
const PROGRAMS = [
    { program_id: 5, dept_id: 1, name: 'Bachelor of Science in Accountancy' },
    { program_id: 6, dept_id: 2, name: 'Bachelor of Science in Civil Engineering' },
];

module.exports = {
    async up(queryInterface) {
        const q = (sql, replacements = []) => queryInterface.sequelize.query(sql, { replacements });
        const [[scis]] = await q('SELECT dept_id FROM Departments WHERE code = ?', [SCIS]);
        if (!scis) return; // not this school's data: nothing to delimit
        const [programs] = await q(
            `SELECT program_id FROM Programs WHERE dept_id <> ?
               AND program_id NOT IN (SELECT program_id FROM ProgramCourseOfferings)`, [scis.dept_id]);
        const ids = programs.map(p => p.program_id);
        if (ids.length) {
            // Rows that hang off those programs (none expected), then the programs.
            const [tables] = await q(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('Programs', 'ProgramCourseOfferings', 'SequelizeMeta')`);
            for (const { name } of tables) {
                const [cols] = await q(`PRAGMA table_info("${name}")`);
                if (cols.some(c => c.name === 'program_id')) await q(`DELETE FROM "${name}" WHERE program_id IN (?)`, [ids]);
            }
            await q('DELETE FROM Programs WHERE program_id IN (?)', [ids]);
        }
        await q(`DELETE FROM Departments WHERE dept_id <> ?
                   AND dept_id NOT IN (SELECT dept_id FROM Programs)
                   AND dept_id NOT IN (SELECT dept_id FROM ProgramCourseOfferings)`, [scis.dept_id]);
    },

    async down(queryInterface) {
        const now = new Date();
        for (const d of DEPARTMENTS) {
            await queryInterface.sequelize.query(
                'INSERT OR IGNORE INTO Departments (dept_id, stakeholder_id, name, code, createdAt, updatedAt) VALUES (?, NULL, ?, ?, ?, ?)',
                { replacements: [d.dept_id, d.name, d.code, now, now] });
        }
        for (const p of PROGRAMS) {
            await queryInterface.sequelize.query(
                'INSERT OR IGNORE INTO Programs (program_id, dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, NULL, ?, ?)',
                { replacements: [p.program_id, p.dept_id, p.name, now, now] });
        }
    },
};
