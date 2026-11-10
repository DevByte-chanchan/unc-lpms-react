'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('industry_consultants', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            name: { type: Sequelize.STRING(255), allowNull: false },
            assigned_course_code: { type: Sequelize.STRING(32), allowNull: true },
            assigned_course_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            academic_period_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('industry_consultants');
    },
};
