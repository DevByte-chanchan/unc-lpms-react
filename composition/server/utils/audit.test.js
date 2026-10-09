'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createAuditor, createAuditMiddleware, describePath } = require('./audit');

const fakeAuditor = () => {
    const rows = [];
    const auditor = createAuditor({ getModel: () => ({ create: async row => { rows.push(row); } }), log: () => {} });
    return { rows, auditor };
};

// Resolves once the middleware's finish handler has had a tick to write.
const run = async (middleware, req, status) => {
    const res = Object.assign(new EventEmitter(), { statusCode: status });
    middleware(req, res, () => {});
    res.emit('finish');
    await new Promise(resolve => setImmediate(resolve));
};

test('record stores actor, action and JSON details', async () => {
    const { rows, auditor } = fakeAuditor();
    const ok = await auditor.record({
        actor: { id: 7, name: 'DOE, JANE', role: 'dean' }, action: 'LOGIN', entityType: 'auth', entityId: 7,
        details: { reason: 'x' }, ip: '::1'
    });
    assert.equal(ok, true);
    assert.deepEqual(rows[0], {
        actor_user_id: 7, actor_name: 'DOE, JANE', actor_role: 'dean', action: 'LOGIN', entity_type: 'auth',
        entity_id: '7', outcome: 'success', details: '{"reason":"x"}', ip_address: '::1'
    });
});

test('record never throws when the write fails', async () => {
    const logged = [];
    const auditor = createAuditor({ getModel: () => ({ create: async () => { throw new Error('no such table'); } }), log: (...a) => logged.push(a) });
    assert.equal(await auditor.record({ action: 'X' }), false);
    assert.equal(logged.length, 1);
});

test('middleware logs mutating requests with outcome by status, keeps only safe body keys', async () => {
    const { rows, auditor } = fakeAuditor();
    const mw = createAuditMiddleware(auditor);
    const user = { id: 3, name: 'A', role: 'program-head' };
    await run(mw, { method: 'POST', originalUrl: '/api/assignments/action?x=1', user, ip: '::1', body: { action_type: 'ACCEPTED', pcId: 9, password: 'secret', comments: 'private' } }, 200);
    await run(mw, { method: 'PUT', originalUrl: '/api/ilos/5', user, body: {} }, 403);
    await run(mw, { method: 'PUT', originalUrl: '/api/ilos/5', user, body: {} }, 422);

    assert.equal(rows[0].action, 'POST /api/assignments/action');
    assert.equal(rows[0].outcome, 'success');
    assert.deepEqual(JSON.parse(rows[0].details), { status: 200, action_type: 'ACCEPTED', pcId: 9 });
    assert.equal(rows[0].actor_role, 'program-head');
    assert.equal(rows[1].outcome, 'denied');
    assert.equal(rows[1].entity_id, '5');
    assert.equal(rows[2].outcome, 'failed');
});

test('middleware ignores reads', async () => {
    const { rows, auditor } = fakeAuditor();
    await run(createAuditMiddleware(auditor), { method: 'GET', originalUrl: '/api/ilos/5', user: { id: 1 } }, 200);
    assert.equal(rows.length, 0);
});

test('describePath picks the entity and first numeric id', () => {
    assert.deepEqual(describePath('/api/ilos/12/3'), { entityType: 'ilos', entityId: '12' });
    assert.deepEqual(describePath('/api/offerings'), { entityType: 'offerings', entityId: null });
});
