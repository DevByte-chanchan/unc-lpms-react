'use strict';

// E-signature: crypto, image checks, profile endpoints, approver embedding.
// Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

const KEY = crypto.randomBytes(32).toString('base64');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lpms-sig-'));
const setKey = (value) => { if (value === null) delete process.env.LPMS_SIGNATURE_KEY; else process.env.LPMS_SIGNATURE_KEY = value; };
process.env.LPMS_SIGNATURE_DIR = DIR;
process.env.LPMS_SIGNATURE_KEY = KEY;
delete process.env.LPMS_SIGNATURE_KEY_VERSION;

const { User, AuditLog, sequelize } = require('../models');
const { signatureKey, encrypt, decrypt } = require('./crypto');
const { inspectImage } = require('./imageInspect');
const { approverSignatures } = require('./approverSignatures');
const { getOfferingSignatures } = require('../controllers/signatureExportController');
const { getReviewRecord } = require('../controllers/reviewRecordController');

// ---- fixtures: minimal but header-valid images
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const png = (w = 300, h = 100, pad = 200) => Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), u32(13), Buffer.from('IHDR'), u32(w), u32(h),
    Buffer.from([8, 2, 0, 0, 0]), u32(0), crypto.randomBytes(pad)
]);
const jpeg = (w = 300, h = 100) => Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]), u16(16), Buffer.from('JFIF\0'), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0]),
    Buffer.from([0xff, 0xc0]), u16(17), Buffer.from([8]), u16(h), u16(w), Buffer.from([3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
    crypto.randomBytes(100)
]);

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] || 'instructor' }; next(); });
    app.use('/api/profile', require('../routes/profile'));
    app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message })); // same shape as server.js
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/profile`;
});
test.after(() => { server.close(); fs.rmSync(DIR, { recursive: true, force: true }); });

let n = 0;
const makeUser = (role = 'instructor', name) => { n += 1; return User.create({ name: name || `Sig ${n}`, email: `sig${n}.${Date.now()}@example.test`, role, password_hash: 'x' }); };
const call = (as, method, pathname = '', { body, type } = {}) => fetch(base + pathname, {
    method,
    headers: { 'x-id': String(as.user_id), 'x-role': as.role, ...(type ? { 'Content-Type': type } : {}) },
    body
});
const upload = (as, bytes, type = 'image/png') => call(as, 'PUT', '/signature', { body: bytes, type });
const files = () => fs.readdirSync(DIR);
const auditFor = (action, userId) => AuditLog.findAll({ where: { action, entity_id: String(userId) } });

// ------------------------------------------------------------------ crypto

test('AES-256-GCM round trip, fresh IV per file, tamper / wrong key / wrong owner all fail', () => {
    const { key, version } = signatureKey({ LPMS_SIGNATURE_KEY: KEY });
    const plain = crypto.randomBytes(500);
    const a = encrypt(plain, { key, version, ownerId: 7 });
    const b = encrypt(plain, { key, version, ownerId: 7 });
    assert.notEqual(a.iv, b.iv);
    assert.equal(a.iv.length, 24);
    assert.equal(a.tag.length, 32);
    assert.equal(a.keyVersion, 1);
    assert.ok(!a.ciphertext.includes(plain.subarray(0, 16)), 'ciphertext must not contain the plaintext');
    assert.deepEqual(decrypt(a, { key, ownerId: 7 }), plain);

    const flipped = { ...a, ciphertext: Buffer.from(a.ciphertext) };
    flipped.ciphertext[0] ^= 1;
    assert.throws(() => decrypt(flipped, { key, ownerId: 7 }));
    assert.throws(() => decrypt(a, { key: crypto.randomBytes(32), ownerId: 7 }));
    assert.throws(() => decrypt(a, { key, ownerId: 8 }), 'a file copied onto another user must not decrypt');
});

test('the key comes from the environment only: missing and malformed keys are refused, version is read', () => {
    assert.equal(signatureKey({}).key, null);
    assert.match(signatureKey({}).reason, /not set/);
    assert.equal(signatureKey({ LPMS_SIGNATURE_KEY: Buffer.alloc(16).toString('base64') }).key, null);
    assert.equal(signatureKey({ LPMS_SIGNATURE_KEY: 'not base64 at all!' }).key, null);
    assert.equal(signatureKey({ LPMS_SIGNATURE_KEY: KEY, LPMS_SIGNATURE_KEY_VERSION: '3' }).version, 3);
    assert.equal(signatureKey({ LPMS_SIGNATURE_KEY: KEY, LPMS_SIGNATURE_KEY_VERSION: 'x' }).version, 1);
});

// ------------------------------------------------------------ image checks

test('images are identified by their bytes, not by name or declared type', () => {
    assert.deepEqual(inspectImage(png(640, 200)), { mime: 'image/png', width: 640, height: 200 });
    assert.deepEqual(inspectImage(jpeg(480, 160)), { mime: 'image/jpeg', width: 480, height: 160 });
    assert.equal(inspectImage(Buffer.from('<?php echo 1; ?> pretending to be signature.png')), null);
    assert.equal(inspectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
    assert.equal(inspectImage(Buffer.from('GIF89a......................')), null);
    assert.equal(inspectImage(png().subarray(0, 12)), null, 'truncated PNG');
    assert.equal(inspectImage(jpeg().subarray(0, 8)), null, 'truncated JPEG');
    assert.equal(inspectImage(null), null);
});

// -------------------------------------------------------------- endpoints

test('without a key the endpoints answer 503 and the profile still loads', async () => {
    const user = await makeUser();
    setKey(null);
    try {
        assert.equal((await upload(user, png())).status, 503);
        assert.equal((await call(user, 'GET', '/signature')).status, 404, 'nothing stored, nothing to decrypt');
        const profile = await call(user, 'GET');
        assert.equal(profile.status, 200);
        assert.equal((await profile.json()).hasSignature, false);
    } finally { setKey(KEY); }

    await upload(user, png());
    setKey(null);
    try {
        assert.equal((await call(user, 'GET', '/signature')).status, 503);
        assert.equal((await (await call(user, 'GET')).json()).hasSignature, true);
        assert.equal((await call(user, 'DELETE', '/signature')).status, 200, 'removing needs no key');
    } finally { setKey(KEY); }
});

test('upload rules: wrong type with a .png name, no body, oversized, bad dimensions', async () => {
    const user = await makeUser();
    const before = files().length;

    const fake = await upload(user, Buffer.from('MZ not an image, just named signature.png'), 'image/png');
    assert.equal(fake.status, 415);
    assert.equal((await upload(user, Buffer.from('GIF89a' + 'x'.repeat(200)), 'image/png')).status, 415);
    assert.equal((await call(user, 'PUT', '/signature', { body: png(), type: 'text/plain' })).status, 400, 'declared type must be png/jpeg');
    assert.equal((await call(user, 'PUT', '/signature', { body: png(), type: 'image/gif' })).status, 400);
    assert.equal((await upload(user, Buffer.alloc(0))).status, 400);

    const big = await upload(user, png(300, 100, 1024 * 1024));
    assert.equal(big.status, 413);
    assert.match((await big.json()).error, /large/i);

    assert.equal((await upload(user, png(5000, 100))).status, 422);
    assert.equal((await upload(user, png(300, 4))).status, 422);

    assert.equal(files().length, before, 'a refused upload stores nothing');
    assert.equal((await (await call(user, 'GET')).json()).hasSignature, false);
});

test('upload, read back, replace, remove: encrypted on disk, metadata only in the database, audited without image data', async () => {
    const user = await makeUser();
    const first = png(300, 100, 400);

    const created = await upload(user, first);
    assert.equal(created.status, 201);
    const row = await User.scope('withSecret').findByPk(user.user_id);
    assert.match(row.signature_path, /^[0-9a-f]{32}\.sig$/, 'random file name');
    assert.equal(row.signature_mime, 'image/png');
    assert.equal(row.signature_iv.length, 24);
    assert.equal(row.signature_tag.length, 32);
    assert.equal(row.signature_key_version, 1);
    const onDisk = fs.readFileSync(path.join(DIR, row.signature_path));
    assert.equal(onDisk.length, first.length, 'GCM ciphertext is the same length as the image');
    assert.ok(!onDisk.includes(Buffer.from([0x89, 0x50, 0x4e, 0x47])), 'the PNG signature must not appear in the stored file');

    const read = await call(user, 'GET', '/signature');
    assert.equal(read.status, 200);
    assert.equal(read.headers.get('content-type'), 'image/png');
    assert.equal(read.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await read.arrayBuffer()), first);
    const profile = await (await call(user, 'GET')).json();
    assert.deepEqual([profile.name, profile.role, profile.hasSignature], [row.name, 'instructor', true]);
    assert.ok(!JSON.stringify(profile).includes(row.signature_path), 'the file name is never exposed');

    const second = jpeg(400, 120);
    const replaced = await upload(user, second, 'image/jpeg');
    assert.equal(replaced.status, 200);
    const row2 = await User.scope('withSecret').findByPk(user.user_id);
    assert.notEqual(row2.signature_path, row.signature_path);
    assert.equal(row2.signature_mime, 'image/jpeg');
    assert.ok(!files().includes(row.signature_path), 'the replaced file is deleted');
    const read2 = await call(user, 'GET', '/signature');
    assert.equal(read2.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await read2.arrayBuffer()), second);

    const removed = await call(user, 'DELETE', '/signature');
    assert.equal(removed.status, 200);
    const row3 = await User.scope('withSecret').findByPk(user.user_id);
    assert.deepEqual([row3.signature_path, row3.signature_iv, row3.signature_tag, row3.signature_key_version], [null, null, null, null]);
    assert.ok(!files().includes(row2.signature_path), 'the file is deleted');
    assert.equal((await call(user, 'GET', '/signature')).status, 404);
    assert.equal((await call(user, 'DELETE', '/signature')).status, 404);

    for (const action of ['SIGNATURE_UPLOADED', 'SIGNATURE_REPLACED', 'SIGNATURE_REMOVED']) {
        const rows = await auditFor(action, user.user_id);
        assert.equal(rows.length, 1, action);
        const text = JSON.stringify(rows[0]);
        for (const bytes of [first, second]) {
            assert.ok(!text.includes(bytes.toString('base64').slice(0, 40)) && !text.includes(bytes.toString('hex').slice(0, 40)), 'no image data in the audit trail');
        }
        assert.ok(!text.includes(row.signature_path) && !text.includes(row.signature_iv));
    }
    assert.deepEqual(JSON.parse((await auditFor('SIGNATURE_UPLOADED', user.user_id))[0].details), {
        target_user_id: user.user_id, mime: 'image/png', bytes: first.length, width: 300, height: 100, key_version: 1
    });
});

test('owner only: nobody, the superuser included, can read another user\'s signature', async () => {
    const owner = await makeUser('instructor');
    const other = await makeUser('instructor');
    const boss = await makeUser('instructor');
    boss.role = 'superuser'; // identity is faked by headers; no real superuser rows (they would race the last-superuser test)
    const image = png();
    assert.equal((await upload(owner, image)).status, 201);

    for (const reader of [other, boss]) {
        assert.equal((await call(reader, 'GET', '/signature')).status, 404, `${reader.role} sees only their own`);
        assert.equal((await (await call(reader, 'GET')).json()).hasSignature, false);
    }
    // There is no route that takes a user id.
    for (const suffix of [`/signature/${owner.user_id}`, `/${owner.user_id}/signature`, `/${owner.user_id}`]) {
        assert.equal((await call(boss, 'GET', suffix)).status, 404, suffix);
    }
    // Removing someone else's is impossible too: it only ever acts on the caller.
    assert.equal((await call(boss, 'DELETE', '/signature')).status, 404);
    assert.equal((await call(owner, 'GET', '/signature')).status, 200, 'the owner is unaffected');
});

test('a file encrypted with another key version is refused, not mis-decrypted', async () => {
    const user = await makeUser();
    await upload(user, png());
    process.env.LPMS_SIGNATURE_KEY_VERSION = '2';
    try {
        const response = await call(user, 'GET', '/signature');
        assert.equal(response.status, 409);
        assert.match((await response.json()).error, /key version/);
    } finally { delete process.env.LPMS_SIGNATURE_KEY_VERSION; }
});

// ------------------------------------------------- approvers' signatures

const log = (role, action, extra = {}) => ({ actor_role: role, action_type: action, actor_name: null, actor_user_id: null, ...extra });
const uri = (s) => `data:image/png;base64,${s}`;

test('only approvals the signer performed carry a signature', async () => {
    const asked = [];
    const findUser = async (q) => { asked.push(q); return { id: q.id, name: q.name, accountRole: q.accountRole }; };
    const toDataUri = async (user) => uri(`sig-of-${user.id ?? user.name}`);

    const logs = [
        log('INSTRUCTOR', 'SUBMITTED', { actor_user_id: 1 }),
        log('LIBRARY_DIRECTOR', 'ACCEPTED', { actor_user_id: 11, actor_name: 'LD' }),
        log('PROGRAM_HEAD', 'ACCEPTED', { actor_name: 'PH, OLD ROW' }), // old row: no user id, match by name + role
    ];
    const signatures = await approverSignatures({ logs, findUser, toDataUri });
    assert.deepEqual(signatures, { LIBRARY_DIRECTOR: uri('sig-of-11'), PROGRAM_HEAD: uri('sig-of-PH, OLD ROW') });
    assert.ok(!('DEAN' in signatures), 'the Dean has not accepted, so no Dean signature');
    assert.deepEqual(asked.map(q => q.accountRole), ['director-of-libraries', 'program-head']);
    assert.equal(asked[1].id, null);

    // A returned review is not an approval; the instructor is never an approver.
    const returned = await approverSignatures({
        logs: [log('INSTRUCTOR', 'SUBMITTED', { actor_user_id: 1 }), log('PROGRAM_HEAD', 'RETURNED', { actor_user_id: 12 })], findUser, toDataUri
    });
    assert.deepEqual(returned, {});

    // No stored signature (or no key) -> simply absent, never an error.
    assert.deepEqual(await approverSignatures({ logs, findUser, toDataUri: async () => null }), {});
    assert.deepEqual(await approverSignatures({ logs, findUser: async () => null, toDataUri }), {});
});

test('end to end: syllabus signatures and the review record embed the approvers\' images, and only theirs', async () => {
    const [{ co_assign_id: assignmentId, pc_offering_id: offeringId }] = await sequelize.query(
        `SELECT a.co_assign_id, a.pc_offering_id FROM CourseOfferingAssignments a
         WHERE EXISTS (SELECT 1 FROM AssignmentWorkflowLogs l WHERE l.co_assign_id = a.co_assign_id AND l.actor_role = 'DEAN' AND l.action_type = 'ACCEPTED')
           AND EXISTS (SELECT 1 FROM AssignmentWorkflowLogs l WHERE l.co_assign_id = a.co_assign_id AND l.actor_role = 'LIBRARY_DIRECTOR' AND l.action_type = 'ACCEPTED')
         LIMIT 1`, { type: sequelize.QueryTypes.SELECT });
    assert.ok(assignmentId, 'the seeds contain a fully approved plan');

    const ld = await makeUser('director-of-libraries');
    const dean = await makeUser('dean');
    const bystanderDean = await makeUser('dean'); // has a signature, never approved this plan
    const ldImage = png(300, 100, 50);
    const deanImage = jpeg(300, 100);
    await upload(ld, ldImage);
    await upload(dean, deanImage, 'image/jpeg');
    await upload(bystanderDean, png(300, 100, 77));

    for (const [role, user] of [['LIBRARY_DIRECTOR', ld], ['DEAN', dean]]) {
        await sequelize.query('UPDATE AssignmentWorkflowLogs SET actor_user_id = ?, actor_name = ? WHERE co_assign_id = ? AND actor_role = ? AND action_type = ?',
            { replacements: [user.user_id, user.name, assignmentId, role, 'ACCEPTED'] });
    }

    const respond = () => { const r = { body: null, headers: {}, set(k, v) { this.headers[k] = v; return this; }, json(b) { this.body = b; return this; }, status() { return this; } }; return r; };
    const fail = (e) => assert.fail(e);

    const res = respond();
    await getOfferingSignatures({ courseAccess: { co_assign_id: assignmentId, pc_offering_id: offeringId } }, res, fail);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(res.body.signatures['director-of-libraries'], `data:image/png;base64,${ldImage.toString('base64')}`);
    assert.equal(res.body.signatures.dean, `data:image/jpeg;base64,${deanImage.toString('base64')}`);
    assert.equal(Object.keys(res.body.signatures).filter(k => k === 'program-head').length, 0, 'the Program Head has no signature');

    const record = respond();
    await getReviewRecord({ courseAccess: { co_assign_id: assignmentId, pc_offering_id: offeringId } }, record, fail);
    const byRole = Object.fromEntries(record.body.approvers.map(a => [a.role, a]));
    assert.equal(byRole.LIBRARY_DIRECTOR.signature, `data:image/png;base64,${ldImage.toString('base64')}`);
    assert.equal(byRole.DEAN.signature, `data:image/jpeg;base64,${deanImage.toString('base64')}`);
    assert.equal(byRole.PROGRAM_HEAD.signature, null);

    // Without the key an export still works, just unsigned.
    setKey(null);
    try {
        const unsigned = respond();
        await getOfferingSignatures({ courseAccess: { co_assign_id: assignmentId, pc_offering_id: offeringId } }, unsigned, fail);
        assert.deepEqual(unsigned.body.signatures, {});
    } finally { setKey(KEY); }
});
