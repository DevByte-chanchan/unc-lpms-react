/**
 * University VMGO versioning — save supersedes, restore copies.
 *
 * Runs against the module's MySQL, but on a SCRATCH table
 * (university_statements_test_<pid>) that is created here and dropped after,
 * so the live university_statements rows are never touched. Skipped when the
 * database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import UniversityStatementFactory from '../models/universityStatement.js';
import { saveNewVersion, restoreVersion, findActiveVersion } from '../utils/universityStatementVersions.js';
import { validateStatements } from '../controllers/universityStatementController.js';

const TABLE = 'university_statements_test_' + process.pid;

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }

const sample = (vision) => ({
  vision,
  mission: 'Mission text.',
  educational_policy: null,
  core_values: [{ order: 1, title: 'We Champion Excellence', description: 'We strive.' }],
  graduate_attributes: [{ order: 1, title: 'Lifelong Learner', description: 'Keeps learning.' }],
});

test('save twice → one Active, one Superseded; restore adds a third row', { skip: !reachable && 'database not reachable' }, async (t) => {
  const Model = UniversityStatementFactory(sequelize, DataTypes, { modelName: 'UniversityStatementTest', tableName: TABLE });
  await Model.sync({ force: true });
  t.after(async () => {
    await Model.drop();
    await sequelize.close();
  });

  const v1 = await saveNewVersion(Model, sample('First vision.'), { source_filename: 'a.pdf', uploaded_by: 'TESTER' });
  const v2 = await saveNewVersion(Model, sample('Second vision.'), { source_filename: 'b.pdf', uploaded_by: 'TESTER' });

  let rows = await Model.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(rows.map((r) => r.status), ['Superseded', 'Active']);
  assert.equal((await findActiveVersion(Model)).id, v2.id);

  const v1Before = (await Model.findByPk(v1.id)).toJSON();
  const v3 = await restoreVersion(Model, v1.id, { uploaded_by: 'RESTORER' });

  rows = await Model.findAll({ order: [['id', 'ASC']] });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.status), ['Superseded', 'Superseded', 'Active']);
  assert.equal(v3.vision, 'First vision.');
  assert.deepEqual(v3.core_values, v1Before.core_values);
  assert.equal(v3.source_filename, 'a.pdf');
  assert.equal(v3.uploaded_by, 'RESTORER');

  // The restored-from row is untouched apart from nothing at all.
  const v1After = (await Model.findByPk(v1.id)).toJSON();
  assert.deepEqual(v1After, v1Before);

  assert.equal(await restoreVersion(Model, 999999), null);
});

test('validation: vision/mission required, every item titled, order renumbered', () => {
  assert.ok(validateStatements({ vision: ' ', mission: 'x' }).errors.some((e) => e.field === 'vision'));
  assert.ok(validateStatements({ vision: 'x', mission: '' }).errors.some((e) => e.field === 'mission'));

  const bad = validateStatements({ vision: 'v', mission: 'm', core_values: [{ title: 'A' }, { title: '', description: 'd' }] });
  assert.deepEqual(bad.errors.map((e) => e.field), ['core_values[1].title']);

  const ok = validateStatements({
    vision: ' v ', mission: 'm', educational_policy: '',
    core_values: [{ order: 7, title: ' B ', description: 'd' }, { order: 2, title: 'A' }],
  });
  assert.deepEqual(ok.values.core_values, [
    { order: 1, title: 'B', description: 'd' },
    { order: 2, title: 'A', description: '' },
  ]);
  assert.equal(ok.values.vision, 'v');
  assert.equal(ok.values.educational_policy, null);
  assert.deepEqual(ok.values.graduate_attributes, []);
});
