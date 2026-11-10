'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('faculty', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            name: { type: Sequelize.STRING(255), allowNull: false },
            sex: { type: Sequelize.STRING(16), allowNull: true },
            birthdate: { type: Sequelize.DATEONLY, allowNull: true },
            email: { type: Sequelize.STRING(255), allowNull: true },
            contact_number: { type: Sequelize.STRING(32), allowNull: true },
            department_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            position: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'Instructor' },
            employment_type: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'Full-time' },
            status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'Active' },
            academic_period_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('faculty');
    },
};
