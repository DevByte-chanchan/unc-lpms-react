'use strict';

// The six demo accounts, one per LPMS role — the same names and emails the
// client-side store has been using, so nothing a tester has memorised changes.
// Seeded with real scrypt hashes rather than a placeholder, so signing in as
// one of them exercises the same code path a real account does.
//
// Idempotent: it inserts missing accounts and repairs only structurally
// malformed hashes. A valid password hash is never overwritten, so re-running
// this cannot clobber a password someone has changed.

const { hashPassword } = require('../utils/password');
const { seedDemoUsers } = require('../utils/demoUserSeed');
const { assignDemoOwnership, clearDemoOwnership } = require('../utils/demoOwnership');

const DEMO_PASSWORD = 'demo1234';

const DEMO_USERS = [
    { name: 'NORTON, MONICA', email: 'monica.norton@unc.edu.ph', role: 'instructor' },
    { name: 'DANILA, JUNAR', email: 'junar.danila@unc.edu.ph', role: 'program-head' },
    { name: 'SANTOS, MARIA', email: 'maria.santos@unc.edu.ph', role: 'director-of-libraries' },
    { name: 'CRUZ, ROBERTO', email: 'roberto.cruz@unc.edu.ph', role: 'industry-consultant' },
    { name: 'REYES, AGNES', email: 'agnes.reyes@unc.edu.ph', role: 'dean' },
    { name: 'GARCIA, CARLOS', email: 'carlos.garcia@unc.edu.ph', role: 'vpaa' }
];

module.exports = {
    async up(queryInterface) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Demo accounts are disabled in production. Provision real users through an administrator.');
        }
        const result = await seedDemoUsers({
            queryInterface,
            demoUsers: DEMO_USERS,
            demoPassword: DEMO_PASSWORD,
            hashPassword
        });
        await assignDemoOwnership(queryInterface);
        return result;
    },

    async down(queryInterface, Sequelize) {
        await clearDemoOwnership(queryInterface);
        await queryInterface.bulkDelete('Users', {
            email: { [Sequelize.Op.in]: DEMO_USERS.map(u => u.email) }
        });
    }
};

module.exports.DEMO_USERS = DEMO_USERS;
module.exports.DEMO_PASSWORD = DEMO_PASSWORD;
