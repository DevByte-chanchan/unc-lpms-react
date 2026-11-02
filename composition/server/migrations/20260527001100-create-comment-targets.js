'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CommentTargets', {
            comment_target_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            comment_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Comments',
                    key: 'comment_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            target_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'Stores the specific subtopic_id, tla_id, or weekly_reference_id'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('CommentTargets');
    }
};
