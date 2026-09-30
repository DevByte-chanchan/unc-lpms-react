'use strict';

// Runnable self-check for password hashing —
// `node server/utils/password.test.js` from composition/.
// No database, no server, no dependencies.

const { hashPassword, verifyPassword, needsRehash, PARAMS } = require('./password');

const test = async (name, fn) => {
    try { await fn(); console.log(`✓ ${name}`); }
    catch (e) { console.error(`✗ ${name}`); throw e; }
};
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`); };

(async () => {
    await test('a password verifies against its own hash and nothing else', async () => {
        const hash = await hashPassword('demo1234');
        eq(await verifyPassword('demo1234', hash), true, 'correct password');
        eq(await verifyPassword('demo1235', hash), false, 'one character different');
        eq(await verifyPassword('', hash), false, 'empty password');
        eq(await verifyPassword('DEMO1234', hash), false, 'case matters');
    });

    await test('the same password hashes differently every time', async () => {
        // If two accounts with the same password produced the same hash, one
        // cracked password would reveal every account sharing it, and a
        // rainbow table would work. The random salt is what prevents that.
        const a = await hashPassword('demo1234');
        const b = await hashPassword('demo1234');
        if (a === b) throw new Error('two hashes of the same password must differ');
        eq(await verifyPassword('demo1234', a), true, 'first still verifies');
        eq(await verifyPassword('demo1234', b), true, 'second still verifies');
    });

    await test('the stored format carries its own parameters', async () => {
        const hash = await hashPassword('demo1234');
        const parts = hash.split('$');
        eq(parts.length, 6, 'field count');
        eq(parts[0], 'scrypt', 'algorithm is named in the hash');
        eq(Number(parts[1]), PARAMS.N, 'cost is recorded');
        // Reading the cost back out is what lets it be raised later without
        // invalidating every existing password.
        if (!/^[0-9a-f]+$/.test(parts[4])) throw new Error('salt should be hex');
        if (!/^[0-9a-f]+$/.test(parts[5])) throw new Error('hash should be hex');
        if (hash.includes('demo1234')) throw new Error('the password must not appear in the hash');
    });

    await test('a malformed or hostile stored value is rejected, not crashed on', async () => {
        for (const bad of [null, undefined, '', 'not-a-hash', 'scrypt$1$2$3', 'md5$1$8$1$aa$bb',
                           'scrypt$16384$8$1$zz$zz', 'scrypt$16384$8$1$$']) {
            eq(await verifyPassword('demo1234', bad), false, `rejects ${JSON.stringify(bad)}`);
        }
    });

    await test('a hash written with a weaker cost is flagged for upgrade', async () => {
        const weak = await hashPassword('demo1234', { ...PARAMS, N: 1024 });
        eq(await verifyPassword('demo1234', weak), true, 'an old hash still verifies');
        eq(needsRehash(weak), true, 'and is flagged for rehashing');

        const current = await hashPassword('demo1234');
        eq(needsRehash(current), false, 'a current hash is not');
        eq(needsRehash('garbage'), true, 'so is anything unreadable');
    });

    await test('the cost is high enough to be worth having', async () => {
        // The point of scrypt over a plain digest is that it is deliberately
        // slow. If this ever drops to ~0ms, someone has lowered N and the
        // hashes are no longer worth much.
        const started = Date.now();
        await hashPassword('demo1234');
        const ms = Date.now() - started;
        if (ms < 10) throw new Error(`hashing took ${ms}ms — cost parameters look too low`);
        if (PARAMS.N < 16384) throw new Error('N must stay at or above 16384');
    });

    console.log('\nAll password checks passed.');
})().catch(e => { console.error(e); process.exit(1); });
