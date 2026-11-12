'use strict';

// A copy of the database at every start (before migrations run) and then once a day, in a `backups` folder next
// to the database (LPMS_BACKUP_DIR to choose another). Kept: the newest copy of each of the last 7 days that have
// one, and the 3 newest copies whatever their day, so many restarts in one day do not push out the older days.
// better-sqlite3's online backup is used, so the copy is consistent while the server keeps working.
// The copies sit on the same disk as the database: they undo a bad change or migration, not a lost disk; copy the
// folder somewhere else for that. Off in tests and with LPMS_BACKUPS=0.

const fs = require('fs');
const path = require('path');

const KEEP = 7;
const KEEP_RECENT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Local time, 12 Nov 2026 08:15:00 -> 20261112_081500 (sorts by time as text)
const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

const backupNow = async ({ raw, dir, keep = KEEP, now = new Date() }) => {
    fs.mkdirSync(dir, { recursive: true });
    const base = path.basename(raw.name).replace(/\.sqlite$/, '');
    const file = path.join(dir, `${base}_${stamp(now)}.sqlite`);
    await raw.backup(file);
    const newestFirst = fs.readdirSync(dir).filter(f => f.startsWith(`${base}_`) && f.endsWith('.sqlite')).sort().reverse();
    const kept = new Set(newestFirst.slice(0, KEEP_RECENT));
    const days = new Set();
    for (const f of newestFirst) {
        const day = f.slice(base.length + 1, base.length + 9);
        if (!days.has(day) && days.size < keep) { days.add(day); kept.add(f); }
    }
    newestFirst.filter(f => !kept.has(f)).forEach(f => fs.unlinkSync(path.join(dir, f)));
    return file;
};

// Resolves after the start-up copy, so migrations run only once it exists. A failed copy is reported, not fatal.
// LPMS_BOOT_BACKUP_DONE=1: the Docker entrypoint already made the start-up copy (`node utils/dbBackup.js`, before
// its own migrations), so only the daily copies run here.
const startBackups = async ({ raw, env = process.env, log = console.log, setIntervalFn = setInterval } = {}) => {
    if (env.NODE_ENV === 'test' || String(env.LPMS_BACKUPS || '').trim() === '0') return null;
    const dir = env.LPMS_BACKUP_DIR || path.join(path.dirname(raw.name), 'backups');
    const run = async () => {
        try {
            log(`Database backed up to ${await backupNow({ raw, dir })}`);
        } catch (error) {
            console.error(`Database backup did not run: ${error.message}`);
        }
    };
    if (env.LPMS_BOOT_BACKUP_DONE !== '1') await run();
    const timer = setIntervalFn(run, DAY_MS);
    if (timer?.unref) timer.unref();
    return timer;
};

module.exports = { KEEP, backupNow, startBackups };

// `node utils/dbBackup.js`: one copy now, under the same rules (the Docker entrypoint, before migrating).
if (require.main === module) {
    const { __raw: raw } = require('../models');
    startBackups({ raw, setIntervalFn: () => null }).then(() => raw.close());
}
