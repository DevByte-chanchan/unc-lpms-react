'use strict';

// The Industry Consultant's sign-off on a Dean-approved learning plan: "reviewed by <name>, <date>". It records the
// review only; it never changes the plan's approval. One row per consultant and plan. No foreign key on purpose, like
// the other bookkeeping tables; the name is kept so the record still reads after an account is renamed.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ConsultantSignoffs', {
            signoff_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            offering_id: { type: Sequelize.INTEGER, allowNull: false },
            consultant_user_id: { type: Sequelize.INTEGER, allowNull: false },
            consultant_name: { type: Sequelize.STRING, allowNull: false },
            signed_at: { type: Sequelize.DATE, allowNull: false }
        });
        await queryInterface.addIndex('ConsultantSignoffs', ['offering_id', 'consultant_user_id'], { unique: true, name: 'consultant_signoffs_once' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('ConsultantSignoffs');
    }
};
