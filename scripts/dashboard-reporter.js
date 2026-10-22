/**
 * Playwright reporter that refreshes reports/dashboard.html after every run - pass or
 * fail.
 *
 * It deliberately carries no result state of its own. The JSON reporter is listed before
 * this one in playwright.config.ts, and Playwright runs reporter hooks in order, so
 * results.json is already written by the time this fires. Reading that one file keeps a
 * single code path for both a live run and a manual `npm run dashboard`.
 */

const path = require('path');
const { build } = require('./generate-dashboard');

const ROOT = path.resolve(__dirname, '..');

class DashboardReporter {
  async onEnd() {
    // The generator shells out to `playwright test --list`, which loads this reporter
    // again. Without this guard the two would recurse into each other.
    if (process.env.COS_DASHBOARD_CHILD === '1') return;
    try {
      const { out, count } = build();
      console.log(`\nDashboard updated: ${path.relative(ROOT, out)} (${count} tests)`);
    } catch (err) {
      console.error(`\nDashboard generation failed: ${err.message}`);
    }
  }

  printsToStdio() {
    return false;
  }
}

module.exports = DashboardReporter;
