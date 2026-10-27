'use strict';

// The Reference Library rules the Director of Libraries sets once for everyone: how recent a title must be,
// whether an older one is kept out, and whether only titles the library holds may be attached. Until now
// these lived in each browser. One row (id 1), created with the defaults the screens already used.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CatalogSettings', {
            id: { type: Sequelize.INTEGER, primaryKey: true },
            recency_years: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
            enforce_recency: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            require_availability: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            updated_by_name: { type: Sequelize.STRING(100), allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
        const now = new Date();
        await queryInterface.bulkInsert('CatalogSettings', [{ id: 1, recency_years: 5, enforce_recency: true, require_availability: true, createdAt: now, updatedAt: now }]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('CatalogSettings');
    }
};
