// End-to-end tests of the main path, against the running app (Docker).
//
//   npm run e2e
//
// Settings (environment, never in the repo):
//   E2E_BASE_URL            the web app, default http://localhost:5173
//   E2E_API_URL             the API, default http://localhost:4000/api
//   E2E_PH_EMAIL / E2E_PH_PASSWORD       the demo Program Head
//   E2E_VPAA_EMAIL / E2E_VPAA_PASSWORD   the demo VPAA
//   E2E_ALLOW_WRITES=1      required: the tests upload, add and undo, so run
//                           them against a DEMO database (npm run demo:reset)
//   E2E_RESET_CMD           optional: run before and after the suite, e.g.
//                           docker exec ca-api npm run -s demo:reset -- --yes
//   E2E_BROWSER_CHANNEL     optional: msedge / chrome to use an installed browser
//
// The emails default to the demo accounts in server/utils/seedUsers.js; the
// passwords have no default.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js$/,
  globalSetup: './globalSetup.js',
  globalTeardown: './globalTeardown.js',
  // One database: the tests run one at a time, in file order.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: './test-results',
});
