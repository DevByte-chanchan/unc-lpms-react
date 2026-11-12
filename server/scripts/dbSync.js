/**
 * npm run db:sync — build or update the schema the way the API does on boot
 * (utils/prepareSchema.js), without starting the server.
 *
 * A fresh database needs `npm run db:migrate` and then this: the migrations
 * only hold the changes made since the schema moved to sync({ alter: true }).
 * CI runs both before the tests.
 */
import { sequelize, assertDbConnection } from '../config/sequelize.js';
import '../models/index.js';
import { prepareSchema } from '../utils/prepareSchema.js';

try {
  await assertDbConnection();
  await prepareSchema();
  const [rows] = await sequelize.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()');
  console.log('[db:sync] done: ' + rows[0].n + ' tables in ' + sequelize.getDatabaseName() + '.');
  await sequelize.close();
} catch (err) {
  console.error('[db:sync] failed:', err && err.message);
  process.exitCode = 1;
  await sequelize.close().catch(() => {});
}
