'use strict';

const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { createDatabase } = require('./scripts/createDatabase');
const db = require('./models');

async function runMigrations() {
  await createDatabase();
  await db.sequelize.authenticate();

  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, 'migrations', '*.js').replace(/\\/g, '/'),
      resolve: ({ name, path: filePath, context }) => {
        const migration = require(filePath);
        return {
          name,
          up: async () => migration.up({ context }),
          down: async () => migration.down({ context }),
        };
      },
    },
    context: { db, sequelize: db.sequelize },
    storage: new SequelizeStorage({ sequelize: db.sequelize }),
    logger: console,
  });

  const executed = await umzug.up();
  console.log(`[db:migrate] Complete. Executed ${executed.length} new migration(s).`);
  return executed;
}

if (require.main === module) {
  runMigrations()
    .then(() => db.sequelize.close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db:migrate] Failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
