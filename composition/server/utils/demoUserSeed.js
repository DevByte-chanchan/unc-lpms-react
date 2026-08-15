'use strict';

const isEvenHex = (value) => (
    typeof value === 'string'
    && value.length > 0
    && value.length % 2 === 0
    && /^[0-9a-f]+$/i.test(value)
);

const MAX_SCRYPT_MEMORY_BYTES = 256 * 1024 * 1024;

const positiveSafeInteger = (value) => {
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

function isStructurallyValidScryptHash(stored) {
    if (typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const [, storedN, storedR, storedP, saltHex, hashHex] = parts;
    const N = positiveSafeInteger(storedN);
    const r = positiveSafeInteger(storedR);
    const p = positiveSafeInteger(storedP);
    if (N === null || r === null || p === null || N < 2) return false;
    if (!Number.isInteger(Math.log2(N))) return false;

    // Match the verifier's memory ceiling and reject parameter combinations
    // that Node's scrypt cannot safely execute. The second term accounts for
    // the parallelization workspace as documented by OpenSSL's scrypt model.
    const estimatedMemory = (128 * N * r) + (128 * r * p);
    if (!Number.isSafeInteger(estimatedMemory) || estimatedMemory > MAX_SCRYPT_MEMORY_BYTES) {
        return false;
    }
    return isEvenHex(saltHex) && isEvenHex(hashHex);
}

async function seedDemoUsers({ queryInterface, demoUsers, demoPassword, hashPassword }) {
    const [existingRows] = await queryInterface.sequelize.query(
        'SELECT email, password_hash FROM Users'
    );
    const existingByEmail = new Map(
        (existingRows || []).map(row => [String(row.email).toLowerCase(), row])
    );

    const inserts = [];
    const repairs = [];

    for (const demo of demoUsers) {
        const existing = existingByEmail.get(demo.email.toLowerCase());
        if (!existing) {
            inserts.push({
                ...demo,
                password_hash: await hashPassword(demoPassword),
                is_active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } else if (!isStructurallyValidScryptHash(existing.password_hash)) {
            repairs.push({
                email: existing.email,
                password_hash: await hashPassword(demoPassword)
            });
        }
    }

    if (inserts.length) await queryInterface.bulkInsert('Users', inserts);
    for (const repair of repairs) {
        await queryInterface.bulkUpdate(
            'Users',
            { password_hash: repair.password_hash, updatedAt: new Date() },
            { email: repair.email }
        );
    }

    return { inserted: inserts.length, repaired: repairs.length };
}

module.exports = { seedDemoUsers };
