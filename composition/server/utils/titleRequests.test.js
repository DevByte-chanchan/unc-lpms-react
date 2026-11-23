'use strict';

// Title requests (approver plan 4.4): an instructor asks for a missing title, the Director adds it or declines it,
// and each side is told. Runs against the test database (node run-tests.js); makes its own rows and removes them.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const { sequelize, Sequelize, User, Notification, Reference } = require('../models');
const controller = require('../controllers/titleRequestController');

const stamp = Date.now();
const made = { users: [], references: [], requests: [] };
let instructor;
let director;

const call = async (fn, user, { body = {}, params = {} } = {}) => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await fn({ user: { id: user.user_id, role: user.role, name: user.name }, body, params }, res, (err) => { throw err; });
    return res;
};
const inbox = async (user, type) => (await Notification.findAll({ where: { recipient_user_id: user.user_id, type }, raw: true })).map(n => n.message);

test.before(async () => {
    const make = async (label, role) => {
        const u = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zz.tr.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
        made.users.push(u.user_id);
        return u;
    };
    instructor = await make('ins', 'instructor');
    director = await make('dir', 'director-of-libraries');
});

test.after(async () => {
    await Notification.destroy({ where: { recipient_user_id: { [Op.in]: made.users } } });
    await sequelize.query(`DELETE FROM TitleRequests WHERE requested_by IN (${made.users.join(', ')})`);
    if (made.references.length) await Reference.destroy({ where: { reference_id: { [Op.in]: made.references } } });
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

test('an instructor asks for a title; the Director is told; asking twice while open is refused', async () => {
    assert.equal((await call(controller.createRequest, instructor, { body: { title: ' ' } })).code, 400);
    const asked = await call(controller.createRequest, instructor, { body: { title: `ZZ Clean Architecture ${stamp}`, authors: 'Martin', note: 'For week 5' } });
    assert.equal(asked.code, 201);
    made.requests.push(asked.body.id);
    assert.ok((await inbox(director, 'title_request')).some(m => m.includes(`title requested: ZZ Clean Architecture ${stamp}`)));
    assert.equal((await call(controller.createRequest, instructor, { body: { title: `zz clean architecture ${stamp}` } })).code, 409);
    const mine = await call(controller.listRequests, instructor);
    const row = mine.body.requests.find(r => r.id === asked.body.id);
    assert.equal(row.status, 'pending');
    assert.equal(row.requestedBy, undefined, 'the instructor list does not carry the asker');
    const all = await call(controller.listRequests, director);
    assert.ok(all.body.requests.find(r => r.id === asked.body.id).requestedBy, 'the Director sees who asked');
});

test('the Director adds it (naming the library title) or declines it with a reason; the instructor is told', async () => {
    const [first] = made.requests;
    assert.equal((await call(controller.markAdded, director, { params: { id: String(first) }, body: {} })).code, 400, 'must name a title');
    const ref = await Reference.create({ title: `ZZ Clean Architecture ${stamp}`, type: 'Textbook', author: 'Martin', archived: false });
    made.references.push(ref.reference_id);
    const added = await call(controller.markAdded, director, { params: { id: String(first) }, body: { reference_id: ref.reference_id } });
    assert.equal(added.code, 200);
    assert.equal((await call(controller.markDeclined, director, { params: { id: String(first) }, body: { reason: 'Too late now' } })).code, 409, 'answered once');
    assert.ok((await inbox(instructor, 'title_request_answered')).some(m => m.includes('is in the library')));

    const second = await call(controller.createRequest, instructor, { body: { title: `ZZ Out of print ${stamp}` } });
    made.requests.push(second.body.id);
    assert.equal((await call(controller.markDeclined, director, { params: { id: String(second.body.id) }, body: { reason: 'no' } })).code, 400, 'a reason');
    assert.equal((await call(controller.markDeclined, director, { params: { id: String(second.body.id) }, body: { reason: 'Out of print; use the 2nd edition' } })).code, 200);
    assert.ok((await inbox(instructor, 'title_request_answered')).some(m => m.includes('declined: Out of print')));
    const [stored] = await sequelize.query('SELECT status, reason FROM TitleRequests WHERE request_id = ?', { replacements: [second.body.id], type: Sequelize.QueryTypes.SELECT });
    assert.deepEqual(stored, { status: 'declined', reason: 'Out of print; use the 2nd edition' });
});
