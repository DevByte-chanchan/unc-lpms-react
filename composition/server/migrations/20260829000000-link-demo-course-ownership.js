'use strict';

const { assignDemoOwnership, clearDemoOwnership } = require('../utils/demoOwnership');

module.exports = {
    async up(queryInterface) {
        await assignDemoOwnership(queryInterface);
    },
    async down(queryInterface) {
        await clearDemoOwnership(queryInterface);
    }
};
