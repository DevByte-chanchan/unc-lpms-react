'use strict';

// One-time setup: create the first superuser with a random password, printed once.
//
//   node create-superuser.js "SURNAME, FIRSTNAME" admin@unc.edu.ph
//
// Runs against the configured database (NODE_ENV selects it). Refuses if a superuser exists.

const { User } = require('./models');
const { record } = require('./utils/audit');
const { bootstrapSuperuser } = require('./utils/bootstrapSuperuser');

const [name, email] = process.argv.slice(2);

bootstrapSuperuser({ User, audit: record, name, email })
    .then(({ user, password }) => {
        console.log(`Superuser created: ${user.name} <${user.email}>`);
        console.log(`Password (shown once, store it now): ${password}`);
        process.exit(0);
    })
    .catch(error => {
        console.error(`Not created: ${error.message}`);
        console.error('Usage: node create-superuser.js "SURNAME, FIRSTNAME" email@unc.edu.ph');
        process.exit(1);
    });
