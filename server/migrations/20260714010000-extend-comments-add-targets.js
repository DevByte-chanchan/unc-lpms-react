'use strict';

// ADDITIVE migration: extends the existing Comments table with the fields the approver
// comment form needs (co_assign_id, ilo_id, comment_for, resolved_date) and adds a
// CommentTargets table for the multi-select Target. Nothing existing is removed.
module.exports = {
    async up(queryInterface, Sequelize) {
        const cols = await queryInterface.describeTable('Comments');

        if (!cols.co_assign_id) {
            await queryInterface.addColumn('Comments', 'co_assign_id', { type: Sequelize.INTEGER, allowNull: true });
        }
        if (!cols.ilo_id) {
            await queryInterface.addColumn('Comments', 'ilo_id', { type: Sequelize.INTEGER, allowNull: true });
        }
        if (!cols.comment_for) {
            await queryInterface.addColumn('Comments', 'comment_for', {
                type: Sequelize.ENUM('references', 'topics', 'tlas'),
                allowNull: true,
            });
        }
        if (!cols.resolved_date) {
            await queryInterface.addColumn('Comments', 'resolved_date', { type: Sequelize.DATE, allowNull: true });
        }

        const rawTables = await queryInterface.showAllTables();
        const tableNames = rawTables.map(t => (typeof t === 'string' ? t : t.tableName));
        if (!tableNames.includes('CommentTargets')) {
            await queryInterface.createTable('CommentTargets', {
                comment_target_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
                comment_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'Comments', key: 'comment_id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                target_id: { type: Sequelize.INTEGER, allowNull: false },
                createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
                updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            });
        }
    },

    async down(queryInterface) {
        try { await queryInterface.dropTable('CommentTargets'); } catch (e) { /* ignore */ }
        for (const col of ['co_assign_id', 'ilo_id', 'comment_for', 'resolved_date']) {
            try { await queryInterface.removeColumn('Comments', col); } catch (e) { /* ignore */ }
        }
    },
};
