'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const serverDir = path.join(root, 'server');
const names = (text) => text.match(/LPMS_[A-Z0-9_]+/g) || [];

function* serverFiles(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* serverFiles(p);
        else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) yield p;
    }
}

test('every LPMS_* variable used by server or docker-compose is in .env.example', () => {
    const used = new Set(names(fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')));
    for (const f of serverFiles(serverDir)) names(fs.readFileSync(f, 'utf8')).forEach((n) => used.add(n));
    const documented = new Set(names(fs.readFileSync(path.join(root, '.env.example'), 'utf8')));
    const missing = [...used].filter((n) => !documented.has(n)).sort();
    assert.deepEqual(missing, [], `missing from .env.example: ${missing.join(', ')}`);
});
