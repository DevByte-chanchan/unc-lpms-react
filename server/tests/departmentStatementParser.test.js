/**
 * Department VM (vision + mission) extraction — the department path of the shared parser and
 * the /department-statements/extract endpoint.
 *
 * Runs against the synthetic PDFs from fixtures/makeDeptVmgoPdf.js, and also
 * against any real department file dropped into sample-uploads/ whose name
 * contains "vmgo" (other than the university sample), e.g.
 * sample-uploads/scis-vmgo.pdf. The real file's department code is taken from
 * the start of its name ("scis-vmgo.pdf" → SCIS).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  parseDepartmentStatementsPdf,
  parseUniversityStatementsPdf,
  headerMatchScore,
  ExtractionError,
  DEPARTMENT_MESSAGES,
} from '../utils/universityStatementParser.js';
import { makeScannedPdf, makeUnrelatedPdf } from './fixtures/makeVmgoPdf.js';
import {
  makeDeptVmgoPdf, SCIS_ROWS, PEO_ROW, CEA_ROWS, SCIS_HEADER, CEA_HEADER,
  SCIS_GOALS, SCIS_OBJECTIVES, SCIS_CORE_VALUES,
} from './fixtures/makeDeptVmgoPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.resolve(__dirname, '..', '..', 'sample-uploads');

const SCIS = { departmentName: 'School of Computer & Information Sciences', departmentCode: 'SCIS' };
const CEA = { departmentName: 'College of Engineering and Architecture', departmentCode: 'CEA' };
const LEAK_WORDS = ['VISION', 'MISSION', 'GOALS', 'OBJECTIVES', 'STATEMENT'];

const allTexts = (fields) => [fields.vision, fields.mission];
const SCIS_MISSION = 'The School commits to develop ethical and innovative computing professionals through quality instruction. It pursues research and extension that serve the community.';

// ---- every source: synthetic + any real department PDF ---------------------

const SOURCES = [{ name: 'synthetic SCIS', load: () => makeDeptVmgoPdf(), target: SCIS }];
if (fs.existsSync(UPLOADS)) {
  for (const f of fs.readdirSync(UPLOADS)) {
    if (!/vmgo.*\.pdf$/i.test(f) || /university/i.test(f)) continue;
    const code = f.split(/[-_ .]/)[0].toUpperCase();
    SOURCES.push({ name: 'sample-uploads/' + f, load: () => fs.readFileSync(path.join(UPLOADS, f)), target: { departmentCode: code }, real: true });
  }
}

for (const src of SOURCES) {
  test(`[${src.name}] vision and mission extracted, no label words leaked`, async () => {
    const { fields, warnings } = await parseDepartmentStatementsPdf(src.load(), src.target);
    if (src.real) {
      // What the real file actually contained — printed for the hand-check.
      // eslint-disable-next-line no-console
      console.log('[real fixture]', JSON.stringify({ fields, warnings }, null, 2));
    }
    assert.ok(fields.vision, 'vision is empty');
    assert.ok(fields.mission, 'mission is empty');
    for (const text of allTexts(fields)) {
      for (const word of LEAK_WORDS) assert.ok(!text.includes(word), `"${word}" leaked into: ${text}`);
    }
  });
}

// ---- synthetic oracle -------------------------------------------------------

test('SCIS block: vision and mission only; goals / objectives / core values end the mission, not join it', async () => {
  const { fields, warnings } = await parseDepartmentStatementsPdf(makeDeptVmgoPdf(), SCIS);
  assert.deepEqual(Object.keys(fields), ['vision', 'mission']);
  assert.equal(fields.vision, 'The School of Computer and Information Sciences envisions itself as a center of excellence in computing education in the Bicol Region.');
  // Hyphen rejoined, missing space after the period restored.
  assert.equal(fields.mission, SCIS_MISSION);
  for (const text of [...SCIS_GOALS, ...SCIS_OBJECTIVES, ...SCIS_CORE_VALUES]) {
    assert.ok(!fields.mission.includes(text) && !fields.vision.includes(text), 'leaked: ' + text);
  }
  assert.deepEqual(warnings, []);
});

test('combined PDF: the department parse takes only the school block', async () => {
  const pdf = makeDeptVmgoPdf({ university: true });
  const { fields, warnings, blockHeader } = await parseDepartmentStatementsPdf(pdf, SCIS);
  assert.equal(blockHeader, SCIS_HEADER);
  assert.match(fields.vision, /^The School of Computer/);
  assert.ok(!fields.vision.includes('Bicolanos everywhere'));
  assert.ok(!fields.mission.includes('nurtures the dreams'));
  assert.equal(fields.mission, SCIS_MISSION);
  assert.deepEqual(warnings.map((w) => w.message), ['Also found a UNIVERSITY block — not imported (OVPAA uploads that).']);
});

test('combined PDF: the university parse of the same file still takes only the university block', async () => {
  const pdf = makeDeptVmgoPdf({ university: true });
  const { fields, warnings } = await parseUniversityStatementsPdf(pdf);
  assert.match(fields.vision, /^Our vision is to be the top university of choice for Bicolanos everywhere/);
  assert.ok(!fields.vision.includes('Computer'));
  assert.ok(!fields.mission.includes('School'));
  assert.deepEqual(fields.core_values, []);
  assert.ok(warnings.some((w) => w.message === 'Also found a SCHOOL block — not imported.'));
});

test('an unknown label right after MISSION ends the mission, and is dropped quietly', async () => {
  // PROGRAM EDUCATIONAL / OBJECTIVES (wrapped) straight after the mission row.
  const [vision, mission, ...rest] = SCIS_ROWS;
  const pdf = makeDeptVmgoPdf({ blocks: [{ header: SCIS_HEADER, rows: [vision, mission, PEO_ROW, ...rest] }] });
  const { fields, warnings } = await parseDepartmentStatementsPdf(pdf, SCIS);
  assert.equal(fields.mission, SCIS_MISSION);
  assert.ok(!fields.mission.includes('Graduates'), fields.mission);
  assert.deepEqual(warnings, []);
});

test('mismatch: header names a different school than the one selected', async () => {
  const { fields, warnings } = await parseDepartmentStatementsPdf(makeDeptVmgoPdf(), CEA);
  assert.match(fields.vision, /^The School of Computer/);      // result kept
  const w = warnings.find((x) => x.code === 'DEPARTMENT_MISMATCH');
  assert.ok(w, JSON.stringify(warnings));
  assert.equal(w.message, "This PDF looks like it's for School of Computer and Information Sciences, but you're uploading for CEA.");
  assert.equal(w.field, null);
});

test('several department blocks: the one matching the selection is used', async () => {
  const pdf = makeDeptVmgoPdf({ blocks: [{ header: SCIS_HEADER, rows: SCIS_ROWS }, { header: CEA_HEADER, rows: CEA_ROWS }] });

  const cea = await parseDepartmentStatementsPdf(pdf, CEA);
  assert.equal(cea.blockHeader, CEA_HEADER);
  assert.equal(cea.fields.vision, 'The College aims to be a leading engineering and architecture school.');
  assert.equal(cea.fields.mission, 'The College forms engineers and architects who build sustainable communities.');
  assert.deepEqual(cea.warnings.map((w) => w.message), ['This PDF has 2 department blocks — used "College of Engineering and Architecture".']);

  const scis = await parseDepartmentStatementsPdf(pdf, SCIS);
  assert.equal(scis.blockHeader, SCIS_HEADER);
  assert.equal(scis.fields.mission, SCIS_MISSION);
  assert.ok(!scis.fields.vision.includes('engineering'));
});

test('one-block file with no header bar: the whole document is the block', async () => {
  const pdf = makeDeptVmgoPdf({ blocks: [{ header: null, rows: SCIS_ROWS }] });
  const { fields, warnings, blockHeader } = await parseDepartmentStatementsPdf(pdf, CEA);
  assert.equal(blockHeader, null);
  assert.equal(fields.mission, SCIS_MISSION);
  assert.deepEqual(warnings, []);   // nothing to compare the selection against
});

test('a university-only PDF is refused for a department upload', async () => {
  const pdf = makeDeptVmgoPdf({ university: true, blocks: [] });
  await assert.rejects(parseDepartmentStatementsPdf(pdf, SCIS), (err) => err instanceof ExtractionError
    && err.status === 422 && err.message === DEPARTMENT_MESSAGES.noDepartmentBlock);
});

test('scanned PDF (no text layer) → 422 with the scanned-PDF message', async () => {
  await assert.rejects(parseDepartmentStatementsPdf(makeScannedPdf(), SCIS), (err) => err instanceof ExtractionError
    && err.status === 422 && err.code === 'NO_TEXT_LAYER' && err.message === DEPARTMENT_MESSAGES.scanned);
});

test('no labels → 422', async () => {
  await assert.rejects(parseDepartmentStatementsPdf(makeUnrelatedPdf(), SCIS), (err) => err.status === 422
    && err.message === DEPARTMENT_MESSAGES.noLabels);
});

test('headerMatchScore: name overlap (& = AND) and code acronym', () => {
  assert.ok(headerMatchScore(SCIS_HEADER, SCIS) >= 1);
  assert.ok(headerMatchScore(SCIS_HEADER, { departmentCode: 'SCIS' }) >= 1);
  assert.ok(headerMatchScore(SCIS_HEADER, { departmentName: 'School of Computer & Information Sciences' }) >= 0.99);
  assert.ok(headerMatchScore(CEA_HEADER, SCIS) < 0.5);
  assert.ok(headerMatchScore(SCIS_HEADER, CEA) < 0.5);
});

// ---- the /extract endpoint (needs the DB to resolve the department) --------

const { default: db } = await import('../models/index.js');
const { getActiveTermId } = await import('../utils/latestPeriod.js');
let endpointSkip = false;
try {
  await db.sequelize.authenticate();
  const termId = await getActiveTermId();
  const scis = termId && await db.Department.findOne({ where: { period_id: termId, code: 'SCIS' } });
  if (!scis) endpointSkip = 'no SCIS department in the current term';
} catch { endpointSkip = 'database not reachable'; }

async function withServer(fn) {
  const { default: router } = await import('../routes/departmentStatements.js');
  const app = express();
  app.use(express.json());
  // The routes' role guard needs a signed-in user; stand in for requireAuth.
  app.use((req, _res, next) => { req.user = { id: 0, display_name: 'TESTER', roles: ['Dean'] }; next(); });
  app.use('/department-statements', router);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    return await fn('http://127.0.0.1:' + server.address().port + '/department-statements');
  } finally {
    server.close();
  }
}

const postFile = (url, buffer, name, code) => {
  const fd = new FormData();
  if (code) fd.append('department_code', code);
  fd.append('file', new Blob([buffer], { type: 'application/pdf' }), name);
  return fetch(url + '/extract', { method: 'POST', body: fd });
};

test('POST /extract — scanned PDF → 422 with the scanned-PDF message', { skip: endpointSkip }, async () => {
  await withServer(async (base) => {
    const res = await postFile(base, makeScannedPdf(), 'scan.pdf', 'scis');
    assert.equal(res.status, 422);
    assert.equal((await res.json()).message, DEPARTMENT_MESSAGES.scanned);
  });
});

test('POST /extract — preview for SCIS (code any case), nothing written', { skip: endpointSkip }, async () => {
  const before = await db.DepartmentStatement.count();
  await withServer(async (base) => {
    const res = await postFile(base, makeDeptVmgoPdf({ university: true }), 'scis-vmgo.pdf', 'scis');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.department_code, 'SCIS');
    assert.deepEqual(Object.keys(body.fields), ['vision', 'mission']);
    assert.equal(body.fields.mission, SCIS_MISSION);
    assert.equal(body.filename, 'scis-vmgo.pdf');
    assert.match(body.sha256, /^[a-f0-9]{64}$/);
    assert.ok(!body.warnings.some((w) => w.code === 'DEPARTMENT_MISMATCH'));
  });
  assert.equal(await db.DepartmentStatement.count(), before);
});

test('POST /extract — unknown department code → 400', { skip: endpointSkip }, async () => {
  await withServer(async (base) => {
    const res = await postFile(base, makeDeptVmgoPdf(), 'x.pdf', 'NOPE');
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /No department with code "NOPE"/);
  });
});

test.after(() => db.sequelize.close().catch(() => {}));
