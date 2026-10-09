'use strict';

// utils/unusedPrograms.js: removes only the named, unused programs, and only when asked to.
const test = require('node:test');
const assert = require('node:assert/strict');
const models = require('../models');
const { removeUnusedPrograms } = require('./unusedPrograms');

const { Program, ProgramOutcome, ProgramEducationalObjective } = models;
const stamp = Date.now();
let deptId;
const make = async (label) => {
    const program = await Program.create({ dept_id: deptId, name: `Cleanup ${label} ${stamp}` });
    await ProgramOutcome.create({ program_id: program.program_id, description: 'PO' });
    await ProgramEducationalObjective.create({ program_id: program.program_id, statement: 'PEO' });
    return program;
};

test.before(async () => {
    const [department] = await models.sequelize.query('SELECT dept_id FROM Departments LIMIT 1;', { type: models.Sequelize.QueryTypes.SELECT });
    deptId = department.dept_id;
});

test('dry run changes nothing; apply removes only the named unused programs', async () => {
    const unused = await make('unused');
    const other = await make('other');
    const names = [unused.name, `Cleanup missing ${stamp}`];

    const dry = await removeUnusedPrograms({ names });
    assert.deepEqual(dry.removed, [unused.name]);
    assert.deepEqual(dry.missing, [`Cleanup missing ${stamp}`]);
    assert.ok(await Program.findByPk(unused.program_id), 'a dry run removes nothing');

    await removeUnusedPrograms({ names, apply: true });
    assert.equal(await Program.findByPk(unused.program_id), null);
    assert.equal(await ProgramOutcome.count({ where: { program_id: unused.program_id } }), 0);
    assert.equal(await ProgramEducationalObjective.count({ where: { program_id: unused.program_id } }), 0);
    assert.ok(await Program.findByPk(other.program_id), 'a program that was not named stays');
});

test('a program with a course offering is kept even when named', async () => {
    const used = await make('used');
    const [course] = await models.sequelize.query('SELECT course_id FROM Courses LIMIT 1;', { type: models.Sequelize.QueryTypes.SELECT });
    await models.sequelize.query(
        'INSERT INTO ProgramCourseOfferings (revision_number, course_id, program_id, dept_id, course_description, school_year, semester, createdAt, updatedAt) VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?);',
        { replacements: [course.course_id, used.program_id, deptId, 'x', '2096-2097', '1st', new Date().toISOString(), new Date().toISOString()] }
    );
    const result = await removeUnusedPrograms({ names: [used.name], apply: true });
    assert.deepEqual(result.removed, []);
    assert.equal(result.kept.length, 1);
    assert.ok(await Program.findByPk(used.program_id));
});
