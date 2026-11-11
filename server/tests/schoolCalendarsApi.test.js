/**
 * /api/school-calendars: VPAA only, real files only, the same file kept once.
 *
 * Runs against the real database with scratch accounts (removed afterwards), a
 * scratch storage folder (SCHOOL_CALENDAR_STORAGE_DIR) and a MOCKED AI reader
 * (app.locals.calendarAiReader) — no OCR wait, no network. The uploaded picture
 * is the sample re-encoded with a marker, so its sha256 is this run's own and
 * no calendar kept in the dev database is touched.
 */
/* global process, Buffer */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import sharp from 'sharp';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashPassword } from '../controllers/authController.js';
import { closeOcr } from '../services/schoolCalendarReader.js';
import { CALENDAR_2026_ROWS, EXPECTED_2026 } from './fixtures/schoolCalendar2026Rows.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PNG = path.join(__dirname, 'fixtures', 'school_calendar_2026-2027.png');

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'cal-test-' + process.pid + '-';
const PASSWORD = 'Correct-Horse-9';

function client(base) {
  let cookie = null;
  const call = async (method, p, body, { raw = false } = {}) => {
    // A fresh connection per request: an upload the server refuses before
    // reading it (403, wrong type) leaves its socket unfit to reuse.
    const headers = { connection: 'close' };
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    let res;
    try { res = await fetch(base + p, { method, headers, body: payload }); } catch (err) { throw new Error(method + ' ' + p + ': ' + (err.cause && (err.cause.code || err.cause.message))); }
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; cookie = pair.endsWith('=') ? null : pair; }
    if (raw) return { status: res.status, headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json };
  };
  return {
    get: (p, o) => call('GET', p, undefined, o),
    post: (p, b) => call('POST', p, b),
    login: (email) => call('POST', '/auth/login', { email, password: PASSWORD }),
  };
}

const form = (buf, name, fields = {}, type = 'image/png') => {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type }), name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};

test('school calendar endpoints', { skip }, async (t) => {
  const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'cal-storage-'));
  const savedEnv = process.env.SCHOOL_CALENDAR_STORAGE_DIR;
  process.env.SCHOOL_CALENDAR_STORAGE_DIR = storage;

  let aiCalls = 0;
  const app = express();
  app.use(express.json());
  app.locals.calendarAiReader = async () => { aiCalls += 1; return CALENDAR_2026_ROWS; };
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api';

  // This run's own picture: the sample with a marker in its metadata.
  const picture = await sharp(PNG).withMetadata({ exif: { IFD0: { ImageDescription: PREFIX + crypto.randomUUID() } } }).png().toBuffer();
  const sha = crypto.createHash('sha256').update(picture).digest('hex');

  t.after(async () => {
    await db.SchoolCalendar.destroy({ where: { sha256: sha } });
    await db.UserAccount.destroy({ where: { email: { [Op.like]: PREFIX + '%' } } });
    await new Promise((r) => server.close(r));
    if (savedEnv === undefined) delete process.env.SCHOOL_CALENDAR_STORAGE_DIR; else process.env.SCHOOL_CALENDAR_STORAGE_DIR = savedEnv;
    await fs.rm(storage, { recursive: true, force: true });
    await closeOcr();
  });

  const account = async (role) => db.UserAccount.create({
    email: PREFIX + role.toLowerCase().replace(/\s+/g, '') + '@unc.edu.ph', display_name: 'Cal Test ' + role, roles: [role],
    password_hash: await hashPassword(PASSWORD), must_change_password: false, status: 'Active',
  });
  const vpaa = await account('VPAA');
  const dean = await account('Dean');

  // Not VPAA → 403, before any file is looked at.
  const asDean = client(base);
  assert.equal((await asDean.login(dean.email)).status, 200);
  assert.equal((await asDean.post('/school-calendars', form(picture, 'cal.png', { semester: '1', school_year: '2026-2027' }))).status, 403);
  assert.equal((await asDean.get('/school-calendars?school_year=2026-2027')).status, 403);

  const as = client(base);
  assert.equal((await as.login(vpaa.email)).status, 200);

  // A Windows program renamed to .png → 400, nothing kept.
  const exe = Buffer.concat([Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00', 'latin1'), crypto.randomBytes(512)]);
  const bad = await as.post('/school-calendars', form(exe, 'calendar.png', { semester: '1', school_year: '2026-2027' }));
  assert.equal(bad.status, 400);
  assert.match(bad.json.message, /PNG, JPG or WEBP picture, or a PDF/);
  // A wrong extension never gets as far as reading.
  assert.equal((await as.post('/school-calendars', form(picture, 'calendar.gif', { semester: '1' }))).status, 400);

  // The upload: kept, read once (mocked AI), fields for the form's semester.
  const first = await as.post('/school-calendars', form(picture, 'school_calendar_2026-2027.png', { semester: '1', school_year: '2026-2027', purpose: 'create' }));
  assert.equal(first.status, 201, JSON.stringify(first.json));
  assert.equal(first.json.reused, false);
  assert.equal(first.json.source, 'ai');
  assert.equal(first.json.school_year, '2026-2027');
  assert.deepEqual(first.json.fields, EXPECTED_2026['1']);
  assert.deepEqual(first.json.blocksFound, ['1st', '2nd', 'Summer']);
  assert.equal(first.json.sources.midterm_exam.text, 'Sept 25-29 · Midterm Examination');
  assert.equal(aiCalls, 1);
  const files = await fs.readdir(storage);
  assert.deepEqual(files, [sha + '.png'], 'kept under its sha256, not its name');

  // The same file again: same row, no second reading.
  const again = await as.post('/school-calendars', form(picture, 'renamed.png', { semester: '2', school_year: '2026-2027' }));
  assert.equal(again.status, 200);
  assert.equal(again.json.reused, true);
  assert.equal(again.json.id, first.json.id);
  assert.equal(aiCalls, 1, 'no second AI call');
  assert.equal(await db.SchoolCalendar.count({ where: { sha256: sha } }), 1);
  assert.deepEqual(again.json.fields, EXPECTED_2026['2']);

  // The next semester needs no upload: the latest calendar of the year.
  const latest = await as.get('/school-calendars?school_year=2026-2027&semester=2');
  assert.equal(latest.status, 200);
  assert.equal(latest.json.calendar.id, first.json.id);
  assert.equal(latest.json.calendar.fields.final_exam, '2027-04-21');
  assert.deepEqual(latest.json.calendar.alternatives.final_exam.map((a) => a.value), ['2027-04-21', '2027-04-12']);
  assert.deepEqual((await as.get('/school-calendars?school_year=1999-2000')).json, { calendar: null });

  // A semester the file has no block for.
  const onlyFirst = await db.SchoolCalendar.findByPk(first.json.id);
  const saved = onlyFirst.extracted;
  await onlyFirst.update({ extracted: { ...saved, transcript: { ...saved.transcript, blocks: [saved.transcript.blocks[0]] } } });
  const none = await as.get('/school-calendars/' + first.json.id + '?semester=2&school_year=2026-2027');
  assert.equal(none.json.message, 'This calendar has no Second Semester block.');
  await onlyFirst.update({ extracted: saved });

  // The file, inline, never sniffed.
  const file = await as.get('/school-calendars/' + first.json.id + '/file', { raw: true });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
  assert.match(file.headers.get('content-disposition'), /^inline;/);
  assert.equal(crypto.createHash('sha256').update(file.buf).digest('hex'), sha);
  assert.equal((await as.get('/school-calendars/999999999/file', { raw: true })).status, 404);
  assert.equal((await asDean.get('/school-calendars/' + first.json.id + '/file', { raw: true })).status, 403);
});
