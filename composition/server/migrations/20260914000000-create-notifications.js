'use strict';

// In-app notifications. One row per recipient. The message holds only the course code, the
// action and the actor's role: never comment text or personal data.

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if ((tables || []).map(t => (typeof t === 'string' ? t : t.tableName)).includes('Notifications')) return;
        await queryInterface.createTable('Notifications', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            recipient_user_id: { type: Sequelize.INTEGER, allowNull: false },
            type: { type: Sequelize.STRING(30), allowNull: false },
            offering_id: { type: Sequelize.INTEGER, allowNull: true },
            message: { type: Sequelize.STRING(200), allowNull: false },
            actor_role: { type: Sequelize.STRING(30), allowNull: true },
            is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            read_at: { type: Sequelize.DATE, allowNull: true },
        });
        await queryInterface.addIndex('Notifications', ['recipient_user_id', 'is_read', 'created_at'], { name: 'notifications_recipient_unread' });
        // Serves the poke rate limit lookup.
        await queryInterface.addIndex('Notifications', ['recipient_user_id', 'offering_id', 'type', 'created_at'], { name: 'notifications_poke_lookup' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Notifications');
    }
};
