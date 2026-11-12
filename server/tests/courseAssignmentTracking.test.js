/**
 * Course Assignment tracking, end to end: history (A), the term calendar and
 * the absence of requirement tracking (R), and the official Subject Offerings
 * match (B).
 *
 * Runs against the real database, touching nothing real:
 *   - throw-away accounts trk-test-<pid>-…@unc.edu.ph;
 *   - every term here is a scratch CLOSED term (school year 1998-1999), so it
 *     can never become the app's current term; the HTTP tests' one is opened
 *     to the guarded endpoints with setWritableTermsForTests (tests only).
 * Mail goes to an in-memory sink (MAIL_MODE=capture). Everything is deleted
 * afterwards. Skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import XLSX from 'xlsx';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashPassword } from '../controllers/authController.js';
import { setMailSinkForTests } from '../services/mailer.js';
import { setWritableTermsForTests } from '../utils/latestPeriod.js';

process.env.MAIL_MODE = 'capture';
const sent = [];
setMailSinkForTests(async (message) => { sent.push(message); return { messageId: 'sink-' + sent.length }; });

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const here = path.dirname(fileURLToPath(import.meta.url));
const REGISTRAR_FILE = path.join(here, 'fixtures', 'CS_26271-Course-OFferings.xls');
const PREFIX = 'trk-test-' + process.pid + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';
const PASSWORD = 'Correct-Horse-9';
// The HTTP tests' scratch term (created inside the test).
let HTTP_PERIOD = null;
let q = '';
// Names are matched by words, so make them unique to this run (letters only).
const runWord = String(process.pid).split('').map((d) => 'abcdefghij'[Number(d)]).join('');
const nameFor = (tag) => 'Trk' + tag + ' ' + runWord + 'son';

async function startApi() {
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: 'http://127.0.0.1:' + server.address().port + '/api' };
}

function client(base) {
  let cookie = null;
  const call = async (method, p, body) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + p, { method, headers, body: payload });
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; cookie = pair.endsWith('=') ? null : pair; }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b ?? {}),
    patch: (p, b) => call('PATCH', p, b ?? {}),
    login: (email) => call('POST', '/auth/login', { email, password: PASSWORD }),
  };
}

const form = (fields, file) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v != null) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  fd.append('file', new Blob([file.buffer]), file.name);
  return fd;
};

/** A flat Course Assignment sheet: [[code, lead, contributors], …]. */
const assignmentSheet = (rows, name = 'assign.xlsx') => {
  const ws = XLSX.utils.aoa_to_sheet([['Course Code', 'Course Name', 'Lead Faculty', 'Contributors'], ...rows.map(([c, l, k]) => [c, c + ' title', l || '', k || ''])]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), name };
};

const makeAccount = async (tag, roles) => db.UserAccount.create({
  email: emailFor(tag), display_name: nameFor(tag), roles,
  password_hash: await hashPassword(PASSWORD), must_change_password: false, status: 'Active',
});

test('course assignment tracking', { skip }, async (t) => {
  const { server, base } = await startApi();
  const scratch = [];
  const programs = [];
  const cleanup = async () => {
    const periods = scratch.map((p) => p.id);
    if (!periods.length) return;
    await db.CourseOfferingAssignment.destroy({ where: { period_id: periods } });
    await db.CourseAssignmentHistory.destroy({ where: { period_id: periods } });
    await db.ImportBatch.destroy({ where: { period_id: periods } });
    const accounts = await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] });
    const ids = accounts.map((a) => a.id);
    await db.Notification.destroy({ where: { user_account_id: ids } });
    await db.AccountNotice.destroy({ where: { user_account_id: ids } });
    await db.UserAccount.destroy({ where: { email: { [Op.like]: PREFIX + '%' } } });
    if (programs.length) await db.Program.destroy({ where: { id: programs.map((p) => p.id) } });
    if (scratch.length) await db.AcademicPeriod.destroy({ where: { id: scratch.map((p) => p.id) } });
  };
  await cleanup();
  t.after(async () => {
    await cleanup();
    setWritableTermsForTests([]);
    setMailSinkForTests(null);
    await new Promise((r) => server.close(r));
  });
  const scratchTerm = async (fields) => {
    const p = await db.AcademicPeriod.create({
      label: 'TRK test ' + process.pid + '-' + scratch.length, school_year: '1998-1999', semester: '1', status: 'Closed', ...fields,
    });
    scratch.push(p);
    return p;
  };
  // The HTTP tests' term: closed like the others, but writable through the API for this test.
  HTTP_PERIOD = (await scratchTerm({})).id;
  q = '?period_id=' + HTTP_PERIOD;
  setWritableTermsForTests([HTTP_PERIOD]);

  const head = await makeAccount('head', ['Program Head', 'Instructor']);
  await makeAccount('leada', ['Instructor']);
  await makeAccount('leadb', ['Instructor']);
  await makeAccount('contc', ['Instructor']);
  const outsider = await makeAccount('out', ['Instructor']);
  const vpaa = await makeAccount('vpaa', ['VPAA']);
  const asHead = client(base); await asHead.login(head.email);
  const asOut = client(base); await asOut.login(outsider.email);
  const asVpaa = client(base); await asVpaa.login(vpaa.email);
  const A = nameFor('leada');
  const B = nameFor('leadb');
  const C = nameFor('contc');

  const historyOf = async (id) => (await asHead.get('/course-offering-assignments/' + id + '/history' + q)).json.entries;
  const rowsOf = async () => (await asHead.get('/course-offering-assignments' + q)).json;
  const upload = (sheet, extra = {}) => asHead.post('/course-offering-assignments/upload', form({ period_id: String(HTTP_PERIOD), ...extra }, sheet));
  const undoLatest = async () => {
    const latest = await asHead.get('/imports/latest?entity=course_offering_assignments&period_id=' + HTTP_PERIOD);
    assert.ok(latest.json.batch, 'an undoable batch');
    return asHead.post('/imports/' + latest.json.batch.id + '/undo');
  };
  const historyCount = () => db.CourseAssignmentHistory.count({ where: { period_id: HTTP_PERIOD } });

  // ------------------------------------------------------------------ A1
  await t.test('A1. create, Lead A→B, contributors: exactly 3 entries with the right before/after', async () => {
    const created = await asHead.post('/course-offering-assignments', { period_id: HTTP_PERIOD, course_code: 'TRK 101', faculty_name: A });
    assert.equal(created.status, 201);
    const id = created.json.id;
    assert.equal((await asHead.patch('/course-offering-assignments/' + id + q, { faculty_name: B })).status, 200);
    assert.equal((await asHead.patch('/course-offering-assignments/' + id + q, { contributors: [C] })).status, 200);
    const entries = await historyOf(id);
    assert.deepEqual(entries.map((e) => e.action), ['contributors_changed', 'lead_changed', 'assigned']);
    const [contribs, leadChange, assigned] = entries;
    assert.equal(assigned.lead_before, null);
    assert.equal(assigned.lead_after.faculty_name, A);
    assert.equal(leadChange.lead_before.faculty_name, A);
    assert.equal(leadChange.lead_after.faculty_name, B);
    assert.deepEqual(contribs.contributors_before, []);
    assert.deepEqual(contribs.contributors_after.map((c) => c.faculty_name), [C]);
    assert.ok(entries.every((e) => e.changed_by_name === head.display_name && e.source === 'manual'));
  });

  await t.test('A1. the same file twice → 0 new entries; one changed Lead → 1 lead_changed; undo → upload_undone', async () => {
    const sheet = assignmentSheet([['TRK 201', A, C], ['TRK 202', B, '']]);
    assert.equal((await upload(sheet)).status, 201);
    const afterFirst = await historyCount();
    assert.equal((await upload(sheet)).status, 201);
    assert.equal(await historyCount(), afterFirst, 'same file: nothing new');

    assert.equal((await upload(assignmentSheet([['TRK 201', A, C], ['TRK 202', A, '']]))).status, 201);
    const fresh = await db.CourseAssignmentHistory.findAll({ where: { period_id: HTTP_PERIOD, id: { [Op.gt]: 0 } }, order: [['id', 'DESC']], limit: (await historyCount()) - afterFirst });
    assert.deepEqual(fresh.map((e) => [e.course_code, e.action, e.source]), [['TRK 202', 'lead_changed', 'upload']]);

    const undo = await undoLatest();
    assert.equal(undo.status, 200);
    const undone = await db.CourseAssignmentHistory.findAll({ where: { period_id: HTTP_PERIOD, action: 'upload_undone' } });
    assert.deepEqual(undone.map((e) => [e.course_code, e.lead_before.faculty_name, e.lead_after.faculty_name]), [['TRK 202', A, B]]);
    // The history itself survived the undo.
    assert.ok((await historyCount()) > afterFirst);
  });

  // ------------------------------------------------------------------ R
  await t.test('R. the term keeps its calendar: dates save, bad order is a 400, due-date fields are gone', async () => {
    const term = await scratchTerm({ classes_start: '2027-06-01', midterm_exam: '2027-07-20' });
    const saved = await asVpaa.patch('/academic-periods/' + term.id, { classes_start: '2027-06-08', midterm_deadline: '2027-07-10' });
    assert.equal(saved.status, 200);
    assert.equal(saved.json.classes_start, '2027-06-08');
    assert.equal('midterm_deadline' in saved.json, false, 'a due date sent by an old client is ignored');

    const bad = await asVpaa.patch('/academic-periods/' + term.id, { prelim_exam: '2027-08-01' });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.message, 'Midterm exam must be on or after Prelim exam.');
    assert.equal((await db.AcademicPeriod.findByPk(term.id)).prelim_exam, null);

    const listed = (await asVpaa.get('/academic-periods')).json.find((p) => p.id === term.id);
    for (const gone of ['due_dates', 'due_rules', 'midterm_deadline', 'finals_deadline']) {
      assert.equal(gone in listed, false, gone);
    }
  });

  await t.test('R. assignment rows carry no requirement data, and the submission routes are gone', async () => {
    assert.equal((await upload(assignmentSheet([['TRK 401', A, '']]))).status, 201);
    const row = (await rowsOf()).find((r) => r.course_code === 'TRK 401');
    for (const gone of ['requirements', 'date_submitted', 'date_updated']) {
      assert.equal(gone in row, false, gone);
    }
    assert.ok(row.date_assigned, 'date_assigned stays');
    assert.ok('last_change' in row, 'Last updated stays');

    const route = '/course-offering-assignments/' + row.id + '/submissions/learning_plan' + q;
    assert.equal((await asHead.post(route)).status, 404);
    assert.equal((await asHead.patch(route, { status: 'approved' })).status, 404);
  });

  // ------------------------------------------------------------------ B
  await t.test('B. the registrar file: Confirmed, Differs → add Contributor; commit sets official_confirmed_at, Undo reverts it', async () => {
    const program = await db.Program.create({ code: 'BSIT', name: 'BS Information Technology', status: 'Active', period_id: HTTP_PERIOD });
    programs.push(program);
    // Pre-assignments chosen against the real registrar export:
    //   BIT213L — CASIMERO DANNY BOY teaches every section          → Confirmed
    //   BIT112L — DANILA MARIA ARKA and DIMACULANGAN MCLYN teach it   → Differs, add DIMACULANGAN
    const pre = assignmentSheet([['BIT213L', 'Danny B. Casimero', ''], ['BIT112L', 'Maria Arka Danila', '']]);
    assert.equal((await upload(pre, { program_id: String(program.id) })).status, 201);
    const file = { buffer: fs.readFileSync(REGISTRAR_FILE), name: 'CS_26271-Course-OFferings.xls' };
    const fields = { period_id: String(HTTP_PERIOD), program_id: String(program.id) };

    const preview = await asHead.post('/course-offering-assignments/compare-official?preview=1', form(fields, file));
    assert.equal(preview.status, 200);
    const by = Object.fromEntries(preview.json.rows.map((r) => [r.course_code, r]));
    assert.equal(by.BIT213L.case, 'confirmed');
    assert.equal(by.BIT112L.case, 'differs');
    assert.deepEqual(by.BIT112L.add.map((p) => p.faculty_name), ['Dimaculangan McLyn'], 'shown in normal case (displayName)');
    assert.equal(by.BIT112L.remove.length, 0);
    assert.equal(by.BIT112L.needs_lead, false);
    assert.equal((await db.CourseOfferingAssignment.count({ where: { period_id: HTTP_PERIOD, official_confirmed_at: { [Op.ne]: null } } })), 0, 'preview writes nothing');

    assert.equal((await asOut.post('/course-offering-assignments/compare-official?preview=1', form(fields, file))).status, 403, 'Program Head only');

    const commit = await asHead.post('/course-offering-assignments/compare-official', form({ ...fields, decisions: [{ course_code: 'BIT112L', action: 'accept' }] }, file));
    assert.equal(commit.status, 201);
    assert.deepEqual(commit.json.applied, { confirmed: 1, updated: 1, added: 0, archived: 0 });
    const rows = await rowsOf();
    const r213 = rows.find((r) => r.course_code === 'BIT213L');
    const r112 = rows.find((r) => r.course_code === 'BIT112L');
    assert.ok(r213.official_confirmed_at && r112.official_confirmed_at);
    assert.deepEqual(r213.sections.map((s) => s.faculty_name), ['Danny B. Casimero']);
    assert.ok(r213.sections[0].sections.includes('BIT213L-OBa'));
    assert.deepEqual(r112.contributors.map((c) => c.faculty_name), ['Dimaculangan McLyn']);
    const hist = await db.CourseAssignmentHistory.findAll({ where: { period_id: HTTP_PERIOD, source: 'official_match' }, order: [['id', 'ASC']] });
    assert.deepEqual(hist.map((h) => [h.course_code, h.action]), [['BIT112L', 'official_updated'], ['BIT213L', 'official_confirmed']]);

    assert.equal((await undoLatest()).status, 200);
    const after = await rowsOf();
    assert.ok(after.filter((r) => r.course_code.startsWith('BIT')).every((r) => !r.official_confirmed_at));
    assert.deepEqual(after.find((r) => r.course_code === 'BIT112L').contributors, []);
  });
});
