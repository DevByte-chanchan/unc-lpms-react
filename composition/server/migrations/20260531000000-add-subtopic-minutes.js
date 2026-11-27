'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const subtopicsTable = await queryInterface.describeTable('Subtopics');
        if (!subtopicsTable.estimated_minutes) {
            await queryInterface.addColumn('Subtopics', 'estimated_minutes', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null
            });
        }
    },

    async down(queryInterface) {
        const subtopicsTable = await queryInterface.describeTable('Subtopics');
        if (subtopicsTable.estimated_minutes) {
            await queryInterface.removeColumn('Subtopics', 'estimated_minutes');
        }
    }
};
