// Before the suite: refuse to write to a database nobody said was a demo one,
// then (optionally) reset it to the demo state.
import { execSync } from 'node:child_process';

export default async function globalSetup() {
  if (process.env.E2E_ALLOW_WRITES !== '1') {
    throw new Error(
      'The e2e tests upload, add and undo data. Run them against a demo database '
      + '(cd server && npm run demo:reset) and set E2E_ALLOW_WRITES=1.',
    );
  }
  for (const name of ['E2E_PH_PASSWORD', 'E2E_VPAA_PASSWORD']) {
    if (!process.env[name]) throw new Error(name + ' is not set (see e2e/playwright.config.js).');
  }
  if (process.env.E2E_RESET_CMD) {
    console.log('[e2e] reset before: ' + process.env.E2E_RESET_CMD);
    execSync(process.env.E2E_RESET_CMD, { stdio: 'inherit' });
  }
}
