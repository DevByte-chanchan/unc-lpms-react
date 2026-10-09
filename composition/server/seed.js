'use strict';

// This runner is retired. It stopped part-way through the demo seeders on a fresh database (its own
// connection wrapper cannot bind dates), and it had no protection against running over existing data.
// Use the guarded script instead:
//
//   docker compose exec server node seed-demo.js     (or: node seed-demo.js in server/)
//
// It loads the demo data into an empty database only, and refuses otherwise.

console.error([
    'seed.js no longer seeds anything.',
    'Use:  node seed-demo.js   (in Docker: docker compose exec server node seed-demo.js)',
    'It loads the demo data into an EMPTY database and refuses to run over existing data.',
].join('\n'));
process.exit(1);
