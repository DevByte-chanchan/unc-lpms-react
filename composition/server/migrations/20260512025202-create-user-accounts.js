'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('user_accounts', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            email: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true,
            },
            password_hash: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            full_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            roles: {
                type: Sequelize.TEXT,
                allowNull: false,
                defaultValue: '["Instructor"]',
            },
            active_role: {
                type: Sequelize.STRING(64),
                allowNull: false,
                defaultValue: 'Instructor',
            },
            faculty_id: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: true,
                references: { model: 'faculty', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            industry_consultant_id: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: true,
                references: { model: 'industry_consultants', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            status: {
                type: Sequelize.STRING(32),
                allowNull: false,
                defaultValue: 'Active',
            },
            must_change_password: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            last_login_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('user_accounts');
    },
};
