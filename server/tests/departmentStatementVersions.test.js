/**
 * Department VMGO versioning — per department_code: saving one department
 * supersedes only its own Active row, and restore stays inside its department.
 *
 * Runs on a SCRATCH table (department_statements_test_<pid>) created here and
 * dropped after, so live rows are never touched. Skipped when the database
 * isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import DepartmentStatementFactory from '../models/departmentStatement.js';
import { saveNewVersion, restoreVersion, findActiveVersion } from '../utils/universityStatementVersions.js';
import { validateDepartmentStatements, CONTENT_FIELDS } from '../controllers/departmentStatementController.js';

const TABLE = 'department_statements_test_' + process.pid;

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }

const sample = (code, vision) => ({
  department_name: code + ' name',
  vision,
  mission: 'Mission text.',
});
const save = (Model, code, vision) => saveNewVersion(Model, sample(code, vision), { uploaded_by: 'TESTER' }, { department_code: code });
const statuses = async (Model, code) => (await Model.findAll({ where: { department_code: code }, order: [['id', 'ASC']] })).map((r) => r.status);

test('per-department versions: SCIS twice, CEA in between, restore stays in SCIS', { skip: !reachable && 'database not reachable' }, async (t) => {
  const Model = DepartmentStatementFactory(sequelize, DataTypes, { modelName: 'DepartmentStatementTest', tableName: TABLE });
  await Model.sync({ force: true });
  t.after(async () => {
    await Model.drop();
    await sequelize.close();
  });

  const s1 = await save(Model, 'SCIS', 'SCIS first.');
  const c1 = await save(Model, 'CEA', 'CEA first.');
  const s2 = await save(Model, 'SCIS', 'SCIS second.');

  assert.deepEqual(await statuses(Model, 'SCIS'), ['Superseded', 'Active']);
  assert.deepEqual(await statuses(Model, 'CEA'), ['Active']);
  assert.equal((await findActiveVersion(Model, {}, { department_code: 'SCIS' })).id, s2.id);
  assert.equal((await findActiveVersion(Model, {}, { department_code: 'CEA' })).id, c1.id);

  const s3 = await restoreVersion(Model, s1.id, { uploaded_by: 'RESTORER', contentFields: CONTENT_FIELDS, scopeFields: ['department_code'] });
  assert.equal(s3.department_code, 'SCIS');
  assert.equal(s3.vision, 'SCIS first.');
  assert.equal(s3.uploaded_by, 'RESTORER');
  assert.deepEqual(await statuses(Model, 'SCIS'), ['Superseded', 'Superseded', 'Active']);
  assert.deepEqual(await statuses(Model, 'CEA'), ['Active']);   // untouched

  // A code saved in lower case is stored upper-cased.
  const lower = await saveNewVersion(Model, sample('cea', 'CEA second.'), {}, { department_code: 'cea' });
  assert.equal(lower.department_code, 'CEA');
  assert.equal(await restoreVersion(Model, 999999, { contentFields: CONTENT_FIELDS, scopeFields: ['department_code'] }), null);
});

test('validation: vision and mission required and trimmed; nothing else is kept', () => {
  assert.ok(validateDepartmentStatements({ vision: ' ', mission: 'x' }).errors.some((e) => e.field === 'vision'));
  assert.ok(validateDepartmentStatements({ vision: 'x', mission: '' }).errors.some((e) => e.field === 'mission'));

  const ok = validateDepartmentStatements({ vision: ' v ', mission: ' m ', goals: [{ description: 'ignored' }] });
  assert.deepEqual(ok.values, { vision: 'v', mission: 'm' });
});
