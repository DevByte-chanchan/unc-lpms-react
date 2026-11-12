// After the suite: each test already undid what it changed; E2E_RESET_CMD, when
// set, puts the demo database back exactly (the term the Add test made leaves
// its cloned lists behind otherwise).
import { execSync } from 'node:child_process';

export default async function globalTeardown() {
  if (process.env.E2E_RESET_CMD) {
    console.log('[e2e] reset after: ' + process.env.E2E_RESET_CMD);
    execSync(process.env.E2E_RESET_CMD, { stdio: 'inherit' });
  }
}
