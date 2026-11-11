'use strict';

// Plans the Dean approved before approval closed their comments: close what is still open (utils/closeApprovedComments.js).
const { closeApprovedComments } = require('../utils/closeApprovedComments');

module.exports = {
    async up(queryInterface) {
        await closeApprovedComments(queryInterface.sequelize);
    },

    async down() {
        // Which comments were open before cannot be told apart afterwards; nothing to undo.
    }
};
