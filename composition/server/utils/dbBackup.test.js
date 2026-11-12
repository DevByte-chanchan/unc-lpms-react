'use strict';

// The database copies: a readable copy is written, only the newest 7 are kept, and tests never back up.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('better-sqlite3');
const { backupNow, startBackups, KEEP } = require('./dbBackup');

test('copies the database and keeps only the newest copies', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpms-backup-test-'));
    const raw = new B(path.join(dir, 'lpms_x.sqlite'));
    try {
        raw.exec('CREATE TABLE t (v TEXT); INSERT INTO t VALUES (\'kept\')');
        const out = path.join(dir, 'backups');
        let last;
        for (let day = 1; day <= KEEP + 3; day++) last = await backupNow({ raw, dir: out, now: new Date(2026, 10, day, 1) });
        const copies = fs.readdirSync(out).sort();
        assert.equal(copies.length, KEEP);
        assert.equal(copies[0], 'lpms_x_20261104_010000.sqlite');
        assert.equal(path.basename(last), 'lpms_x_20261110_010000.sqlite');
        const copy = new B(last, { readonly: true });
        assert.equal(copy.prepare('SELECT v FROM t').get().v, 'kept');
        copy.close();
    } finally {
        raw.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('many restarts in one day do not push out the older days', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpms-backup-test-'));
    const raw = new B(path.join(dir, 'lpms_x.sqlite'));
    try {
        const out = path.join(dir, 'backups');
        for (let day = 1; day <= 3; day++) await backupNow({ raw, dir: out, now: new Date(2026, 10, day, 1) });
        for (let minute = 0; minute < 10; minute++) await backupNow({ raw, dir: out, now: new Date(2026, 10, 4, 9, minute) });
        assert.deepEqual(fs.readdirSync(out).sort(), [
            'lpms_x_20261101_010000.sqlite', 'lpms_x_20261102_010000.sqlite', 'lpms_x_20261103_010000.sqlite',
            'lpms_x_20261104_090700.sqlite', 'lpms_x_20261104_090800.sqlite', 'lpms_x_20261104_090900.sqlite',
        ]);
    } finally {
        raw.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('does nothing in tests or when turned off', async () => {
    assert.equal(await startBackups({ raw: {}, env: { NODE_ENV: 'test' } }), null);
    assert.equal(await startBackups({ raw: {}, env: { LPMS_BACKUPS: '0' } }), null);
});
