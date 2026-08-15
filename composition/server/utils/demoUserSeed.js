'use strict';

const isEvenHex = (value) => (
    typeof value === 'string'
    && value.length > 0
    && value.length % 2 === 0
    && /^[0-9a-f]+$/i.test(value)
);

function isStructurallyValidScryptHash(stored) {
    if (typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const [, N, r, p, saltHex, hashHex] = parts;
    if (!/^\d+$/.test(N) || Number(N) < 2) return false;
    if (!/^\d+$/.test(r) || Number(r) < 1) return false;
    if (!/^\d+$/.test(p) || Number(p) < 1) return false;
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
