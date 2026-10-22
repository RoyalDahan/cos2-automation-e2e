import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { COSOptions } from './src/fixtures/cos.fixture';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * COS2 Playwright configuration.
 *
 * One project per role. Each runs the same suites as a different user, against its own
 * Edge profile directory, so a run can never silently execute as whoever signed in last.
 *
 *   npx playwright test --project=admin
 *   npx playwright test --project=update
 *   npx playwright test --project=view
 *
 * Or use Admin.bat / Update.bat / View.bat.
 */
const BASE_URL = process.env.BASE_URL ?? 'https://credentialsonlinesystemdev.azurewebsites.net/';

// roleName is a worker-scoped option, hence the second type parameter.
export default defineConfig<object, COSOptions>({
  testDir: './tests',
  outputDir: './reports/artifacts',
  // Generous: the first run of a role may wait on an interactive sign-in.
  timeout: 300_000,
  expect: { timeout: 10_000 },

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One browser profile per role cannot be shared across workers.
  workers: 1,
  fullyParallel: false,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    // JUnit is what Azure DevOps "Publish Test Results" consumes.
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    // Refreshes reports/dashboard.html after every run, pass or fail.
    ['./scripts/dashboard-reporter.js'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-testid',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'admin',
      testDir: './tests/admin',
      use: { roleName: 'admin' },
    },
    {
      name: 'update',
      testDir: './tests/update',
      use: { roleName: 'update' },
    },
    {
      name: 'view',
      testDir: './tests/view',
      use: { roleName: 'view' },
    },
  ],
});
