'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CommentTargets', {
            comment_target_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            comment_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Comments', key: 'comment_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            target_id: {
                type: Sequelize.INTEGER,
                allowNull: false // Primary key ID of the corresponding Topic, Reference, or TLA
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('CommentTargets');
    }
};