'use strict';

// A notification about a comment remembers which comment, so opening it jumps to that comment and the item it
// names (client: utils/useCommentFocus.js). Empty for every other notification and for older ones.
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('Notifications');
        if (!table.comment_id) await queryInterface.addColumn('Notifications', 'comment_id', { type: Sequelize.INTEGER, allowNull: true });
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('Notifications');
        if (table.comment_id) await queryInterface.removeColumn('Notifications', 'comment_id');
    }
};
