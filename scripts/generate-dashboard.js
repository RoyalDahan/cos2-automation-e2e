/**
 * Builds reports/dashboard.html - the single place to see what the suite covers, what it
 * proves, how to reproduce it by hand, and why anything failed.
 *
 * Three sources, each authoritative for one thing:
 *   - Playwright `--list`  : which tests exist, per role. Suites register cases
 *                            conditionally, so a static source count would be wrong.
 *   - the spec sources     : tags, page objects, line numbers and the manual steps,
 *                            derived from the test body so they cannot drift.
 *   - src/suites/testDocs  : the long-form "what and why" for each case id.
 *
 * Manual statuses live in the browser's localStorage, never in this file, so
 * regenerating after a run never wipes what the operator has set by hand.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const SUITES_DIR = path.join(ROOT, 'src', 'suites');
const REPORTS_DIR = path.join(ROOT, 'reports');
const RESULTS_JSON = path.join(REPORTS_DIR, 'json', 'results.json');
const INVENTORY_CACHE = path.join(REPORTS_DIR, 'inventory.json');
const OUT = path.join(REPORTS_DIR, 'dashboard.html');

const { TEST_DOCS } = require(path.join(SUITES_DIR, 'testDocs.js'));

/** Fixture name -> the page object it exercises, for the "page" filter. */
const FIXTURE_TO_PAGE = {
  home: 'CredentialsHomePage',
  results: 'SearchResultsPage',
  summary: 'CredentialSummaryPage',
  detail: 'CredentialDetailPage',
  admin: 'AdminPage',
};

const TAG_RE = /@[a-z0-9-]+/gi;

/**
 * Case ids look like SRCH-001, A11Y-003 or CRED-UPD-001 - the prefix may contain digits
 * and may itself be hyphenated.
 */
const CASE_ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+[a-z]?)/;

// ---------------------------------------------------------------------------- sources

function walk(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, suffix));
    else if (entry.name.endsWith(suffix)) out.push(full);
  }
  return out;
}

function firstStringArg(line) {
  const m = line.match(/\(\s*(['"`])((?:\\.|(?!\1).)*)\1/);
  return m ? m[2].replace(/\\(['"`])/g, '$1') : null;
}

function cleanTitle(title) {
  return title.replace(/\$\{([^}]*)\}/g, (_, expr) => `<${expr.trim()}>`);
}

function fallbackDescription(title) {
  const body = cleanTitle(title).replace(CASE_ID_RE, '').replace(TAG_RE, '').trim();
  if (!body) return 'No description recorded.';
  return body.charAt(0).toUpperCase() + body.slice(1) + '.';
}

/** The lines of a test body, from its declaration to its closing brace. */
function bodyOf(lines, index) {
  const out = [];
  let brace = 0;
  let started = false;
  for (let i = index; i < lines.length; i++) {
    const code = lines[i].replace(/\/\/.*$/, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
    for (const ch of code) {
      if (ch === '{') {
        brace++;
        started = true;
      } else if (ch === '}') brace--;
    }
    if (i > index) out.push(lines[i]);
    if (started && brace <= 0) break;
  }
  return out;
}

/**
 * Turn a test body into numbered steps a person can follow.
 *
 * Only intent-revealing page-object calls are translated; plumbing is skipped. Derived
 * rather than hand-written so the steps cannot drift from the test, with testDocs.steps
 * available as an override where the derived version would mislead.
 */
const STEP_RULES = [
  [/\bhome\.goto\(\)/, () => 'Open Credentials Home (the application root URL).'],
  [/\bhome\.expectLoaded\(\)/, () => 'Confirm the educator search box is visible.'],
  [
    /\bhome\.searchEducator\(\s*['"`](.*?)['"`]\s*\)/,
    (m) => `Type \`${m[1]}\` into the educator search box ("Name, SSN, SEID") and click the magnifier.`,
  ],
  [
    /\bhome\.searchEducator\(([^'"`][^)]*)\)/,
    (m) => `Type the ${m[1].trim()} value into the educator search box and click the magnifier.`,
  ],
  [
    /\bhome\.searchEducatorWithEnter\(\s*['"`]?(.*?)['"`]?\s*\)/,
    (m) => `Type \`${m[1]}\` into the educator search box and press Enter.`,
  ],
  [
    /\bhome\.searchDocument\(\s*['"`]?(.*?)['"`]?\s*\)/,
    (m) => `Type \`${m[1]}\` into the Document ID box and click its magnifier.`,
  ],
  [/\bhome\.openUserMenu\(\)/, () => 'Click the account name at the top right to open the profile menu.'],
  [/\bhome\.goHome\(\)/, () => 'Click the Credentials logo at the top left.'],
  [/\bhome\.expectSignedIn\(\)/, () => 'Confirm the account name is shown in the header.'],
  [/\bresults\.expectLoaded\(\)/, () => 'Confirm the results grid is shown and the address contains /search.'],
  [/\bresults\.expectResultCount\(\s*(\w+)\s*\)/, (m) => `Confirm exactly ${m[1]} result row(s) are listed.`],
  [/\bresults\.expectNoResults\(\)/, () => 'Confirm no result rows are listed.'],
  [/\bresults\.openRow\(\s*(\d*)\s*\)/, (m) => `Click View on result row ${Number(m[1] || 0) + 1}.`],
  [/\bresults\.backButton\.click\(\)/, () => 'Click Back.'],
  [/\bresults\.columnValues\(\s*['"`](\w+)['"`]\s*\)/, (m) => `Read every value in the ${m[1]} column.`],
  [/\badmin\.goto\(\)/, () => 'Browse directly to /admin.'],
  [/\badmin\.expectReachable\(\)/, () => 'Confirm the Admin area opens with no authorisation refusal.'],
  [/\badmin\.expectRefused\(\)/, () => 'Confirm the Admin area is refused (redirected away, or an authorisation message).'],
  [/\bpage\.goto\(\s*['"`](.*?)['"`]\s*\)/, (m) => `Browse directly to ${m[1]}.`],
  [/\bpage\.setViewportSize\(\{\s*width:\s*(\d+)/, (m) => `Resize the browser window to ${m[1]}px wide.`],
  [/\bhome\.adminMenuItem\.click\(\)/, () => 'Click the Admin entry in the profile menu.'],
  [
    /expect\(page\)\.not\.toHaveURL\(([^)]+)\)/,
    (m) => `Confirm the address does NOT match ${m[1].trim()}.`,
  ],
  [/expect\(page\)\.toHaveURL\(([^)]+)\)/, (m) => `Confirm the address matches ${m[1].trim()}.`],
  [/\.toMatch\(\s*(\/[^/]+\/)\s*\)/, (m) => `Confirm the address matches ${m[1]}.`],
  [/expect\((.*?)\)\.toHaveCount\(\s*0\s*\)/, (m) => `Confirm ${humanLocator(m[1])} is not present at all.`],
  [/expect\((.*?)\)\.toHaveCount\(\s*(\w+)\s*\)/, (m) => `Confirm ${humanLocator(m[1])} appears ${m[2]} time(s).`],
  [/expect\((.*?)\)\.toBeVisible\(\)/, (m) => `Confirm ${humanLocator(m[1])} is visible.`],
  [/expect\((.*?)\)\.toContainText\(([^)]*)\)/, (m) => `Confirm ${humanLocator(m[1])} contains ${m[2].trim()}.`],
  [/expect\((.*?)\)\.toHaveAttribute\(\s*['"`](\w+)['"`]/, (m) => `Confirm ${humanLocator(m[1])} has a ${m[2]} attribute.`],
  // A custom assertion message states the check better than the matcher ever could.
  [/expect\([^,]+,\s*[`'"](.+?)[`'"]\s*\)\.\w+/, (m) => `Confirm: ${m[1].replace(/\$\{[^}]*\}/g, '…')}`],
  [/expect\((.*?)\)\.toEqual\(([^)]*)\)/, (m) => `Confirm ${humanLocator(m[1])} equals ${m[2].trim()}.`],
  [/expect\((.*?)\)\.toBeGreaterThan\(\s*(\d+)\s*\)/, (m) => `Confirm ${humanLocator(m[1])} is greater than ${m[2]}.`],
  [/expect\((.*?)\)\.toBeTruthy\(\)/, (m) => `Confirm ${humanLocator(m[1])} holds.`],
];

function humanLocator(expr) {
  const text = expr.trim();
  const map = {
    'home.educatorSearchInput': 'the educator search box',
    'home.documentSearchInput': 'the Document ID box',
    'home.adminMenuItem': 'the Admin entry in the profile menu',
    'home.helpMenuItem': 'the Help entry in the profile menu',
    'home.logoutMenuItem': 'the Logout entry in the profile menu',
    'home.userMenu': 'the account name in the header',
    'results.resultsTable': 'the results grid',
    'results.resultCount': 'the "N Educators Found" count',
  };
  if (map[text]) return map[text];
  const cell = text.match(/results\.cell\(\s*['"`](\w+)['"`]/);
  if (cell) return `the ${cell[1]} cell of the first row`;
  return `\`${text}\``;
}

function deriveSteps(bodyLines, roleLabel) {
  const steps = [`Sign in to COS2 as the ${roleLabel}.`];
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;
    if (/^test\.(skip|fixme|slow)\(/.test(line)) continue;
    for (const [re, fmt] of STEP_RULES) {
      const m = line.match(re);
      if (m) {
        const step = fmt(m);
        if (step && steps[steps.length - 1] !== step) steps.push(step);
        break;
      }
    }
  }
  return steps;
}

function commentAbove(lines, index) {
  const parts = [];
  for (let i = index - 1; i >= 0; i--) {
    const raw = lines[i].trim();
    if (!raw) {
      if (parts.length) break;
      continue;
    }
    if (raw.startsWith('//')) {
      parts.unshift(raw.replace(/^\/\/+\s?/, '').trim());
      continue;
    }
    break;
  }
  return parts.join(' ').trim();
}

function commentInside(lines, index) {
  const parts = [];
  for (let i = index + 1; i < Math.min(index + 14, lines.length); i++) {
    const raw = lines[i].trim();
    if (/^test(\.(only|describe))?\(\s*['"`]/.test(raw)) break;
    if (/^test\.(skip|fixme|slow)\(/.test(raw)) continue;
    if (raw.startsWith('//')) {
      parts.push(raw.replace(/^\/\/+\s?/, '').trim());
      continue;
    }
    if (parts.length) break;
  }
  return parts.join(' ').trim();
}

function parseSpec(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);

  const tests = [];
  const describeStack = [];
  let brace = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (/^test\.describe\(/.test(trimmed)) {
      describeStack.push({ title: firstStringArg(trimmed) || '', openBrace: brace, setup: [] });
    }

    // beforeEach work is part of what a person has to do by hand, so it is captured and
    // prepended to the steps of every test in the same describe.
    if (/^test\.beforeEach\(/.test(trimmed) && describeStack.length) {
      describeStack[describeStack.length - 1].setup = bodyOf(lines, i);
    }

    const isTest = /^test(\.only|\.fixme)?\(\s*['"`]/.test(trimmed);

    // Brace tracking drives describe scoping. Counting raw `});` lines does not work:
    // every beforeEach and every test ends with one and would pop the describe early.
    const code = line.replace(/\/\/.*$/, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
    for (const ch of code) {
      if (ch === '{') brace++;
      else if (ch === '}') brace--;
    }
    while (describeStack.length && brace <= describeStack[describeStack.length - 1].openBrace) {
      describeStack.pop();
    }

    if (!isTest) return;
    const title = firstStringArg(trimmed);
    if (!title) return;

    const suite = describeStack.map((d) => d.title).join(' > ');
    const tags = [
      ...new Set([...(suite.match(TAG_RE) || []), ...(title.match(TAG_RE) || [])].map((t) => t.toLowerCase())),
    ];

    const fixtures = (trimmed.match(/async\s*\(\s*\{([^}]*)\}/) || [, ''])[1]
      .split(',')
      .map((s) => s.trim().split(':')[0].trim())
      .filter(Boolean);
    const pages = [...new Set(fixtures.map((f) => FIXTURE_TO_PAGE[f]).filter(Boolean))];

    let skipReason = null;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const l = lines[j].trim();
      if (/^test\.(skip|fixme)\(/.test(l)) {
        skipReason = firstStringArg(l.replace(/^test\.(skip|fixme)\(\s*[^,]+,\s*/, '(')) || 'skipped';
        break;
      }
      if (/^test\(/.test(l)) break;
    }

    const idMatch = title.match(CASE_ID_RE);
    tests.push({
      id: idMatch ? idMatch[1] : '',
      title: cleanTitle(title).replace(TAG_RE, '').trim(),
      rawTitle: title,
      shortDescription: commentAbove(lines, i) || commentInside(lines, i) || fallbackDescription(title),
      body: [...describeStack.flatMap((d) => d.setup || []), ...bodyOf(lines, i)],
      suite: suite.replace(TAG_RE, '').trim(),
      file: rel,
      tags,
      pages,
      skipReason,
      line: i + 1,
    });
  });

  return tests;
}

// ------------------------------------------------------------------- playwright input

function eachSpec(report, visit) {
  const walkSuite = (suite, file) => {
    const f = (suite.file || file || '').replace(/\\/g, '/');
    for (const spec of suite.specs || []) visit(spec, f);
    for (const child of suite.suites || []) walkSuite(child, f);
  };
  for (const suite of report.suites || []) walkSuite(suite, suite.file);
}

function inventoryFromPlaywright() {
  // Run the CLI through node rather than npx: spawning npx.cmd fails with EINVAL on
  // Windows, and going direct avoids needing a shell at all.
  const cli = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
  if (!fs.existsSync(cli)) return null;

  const res = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // Stops the dashboard reporter from recursing into this same script.
    env: { ...process.env, COS_DASHBOARD_CHILD: '1' },
  });

  const raw = res.stdout || '';
  const start = raw.indexOf('{');
  if (start === -1) return null;

  let report;
  try {
    report = JSON.parse(raw.slice(start));
  } catch {
    return null;
  }

  const items = [];
  eachSpec(report, (spec, file) => {
    for (const t of spec.tests || []) {
      items.push({ project: t.projectName || '', file, title: spec.title });
    }
  });
  return items.length ? items : null;
}

function loadInventory() {
  const fresh = inventoryFromPlaywright();
  if (fresh) {
    fs.mkdirSync(path.dirname(INVENTORY_CACHE), { recursive: true });
    fs.writeFileSync(INVENTORY_CACHE, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
  if (fs.existsSync(INVENTORY_CACHE)) {
    try {
      return JSON.parse(fs.readFileSync(INVENTORY_CACHE, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

const stripAnsi = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');

/** Pull "Expected / Received" out of a Playwright failure message. */
function parseError(message) {
  const clean = stripAnsi(message).trim();
  const grab = (label) => {
    const m = clean.match(new RegExp(`^\\s*${label}:?\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const locator = grab('Locator');
  let expected = grab('Expected');
  let actual = grab('Received');

  // toEqual-style failures carry a unified diff instead of Expected/Received lines.
  // The count header ("- Expected  - 1") says nothing useful, so collect the diff body.
  const isHeader = (l) => /^[-+]\s+(Expected|Received)\b/.test(l);
  const diffLines = clean.split('\n').filter((l) => /^[-+]\s/.test(l) && !isHeader(l));
  if (diffLines.length) {
    const minus = diffLines.filter((l) => l.startsWith('-')).map((l) => l.slice(1).trim());
    const plus = diffLines.filter((l) => l.startsWith('+')).map((l) => l.slice(1).trim());
    if (!expected && minus.length) expected = minus.join(' ');
    if (!actual && plus.length) actual = plus.join(' ');
  }

  // A custom assertion message is usually the clearest statement of what went wrong.
  const firstLine = clean.split('\n')[0].replace(/^Error:\s*/, '').trim();
  if (!expected && !actual && firstLine) expected = 'see message';

  return {
    message: clean,
    headline: clean.split('\n')[0].trim(),
    locator,
    expected,
    actual,
  };
}

/** "<project>::<title>" -> { status, error, screenshots }. */
function loadResults() {
  if (!fs.existsSync(RESULTS_JSON)) return { byTitle: {} };
  let report;
  try {
    report = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf8'));
  } catch {
    return { byTitle: {} };
  }

  const byTitle = {};
  eachSpec(report, (spec) => {
    for (const t of spec.tests || []) {
      const last = (t.results || []).slice(-1)[0] || {};
      const raw = t.status || last.status;
      const status = raw === 'unexpected' || raw === 'failed' ? 'failed' : raw === 'skipped' ? 'skipped' : 'passed';

      const err = (last.errors || [])[0];
      const screenshots = (last.attachments || [])
        .filter((a) => a.contentType === 'image/png' && a.path)
        .map((a) => path.relative(REPORTS_DIR, a.path).replace(/\\/g, '/'));

      // Keyed on project + title, never the file path: Playwright reports the spec file
      // for a run but the declaring suite file for `--list`, so paths do not line up.
      byTitle[`${t.projectName || ''}::${spec.title}`] = {
        status,
        error: err ? parseError(err.message) : null,
        screenshots,
      };
    }
  });

  return { byTitle, startedAt: report.stats?.startTime || null };
}

// ----------------------------------------------------------------------------- render

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function build(live) {
  // Descriptions, tags and page objects come from the sources; the test list itself
  // comes from Playwright, because suites register cases conditionally per role.
  const meta = new Map();
  for (const file of [...walk(SUITES_DIR, '.ts'), ...walk(TESTS_DIR, '.spec.ts')]) {
    for (const t of parseSpec(file)) meta.set(t.rawTitle, t);
  }

  const roleLabels = { admin: 'Admin (Credential Online user)', update: 'Update user', view: 'View-only user' };
  const results = live && live.byTitle ? live : loadResults();
  const byTitle = results.byTitle || {};

  const tests = [];
  for (const item of loadInventory()) {
    const base =
      meta.get(item.title) ||
      ({
        id: (item.title.match(CASE_ID_RE) || [, ''])[1] || '',
        title: cleanTitle(item.title),
        rawTitle: item.title,
        shortDescription: fallbackDescription(item.title),
        body: [],
        suite: '',
        file: item.file,
        tags: [],
        pages: [],
        skipReason: null,
        line: 0,
      });

    const doc = TEST_DOCS[base.id] || null;
    const role = item.project || 'unassigned';
    const outcome = byTitle[`${role}::${item.title}`] || null;

    tests.push({
      ...base,
      folder: role,
      key: `${role}::${item.title}`,
      description: doc ? doc.description : base.shortDescription,
      steps: (doc && doc.steps) || deriveSteps(base.body, roleLabels[role] || role),
      lastRun: outcome ? outcome.status : 'not-run',
      error: outcome ? outcome.error : null,
      screenshots: outcome ? outcome.screenshots || [] : [],
    });
  }

  const folders = [...new Set(tests.map((t) => t.folder))].sort();
  const pages = [...new Set(tests.flatMap((t) => t.pages))].sort();
  const tags = [...new Set(tests.flatMap((t) => t.tags))].sort();

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(OUT, render({ tests, folders, pages, tags, results }), 'utf8');
  return { out: OUT, count: tests.length };
}

function panels(t) {
  const steps = t.steps.map((s, i) => `<li>${esc(s)}</li>`).join('');

  const errorPanel = t.error
    ? `
      <div class="kv">
        <div><span>Expected</span><code class="ok">${esc(t.error.expected || '—')}</code></div>
        <div><span>Actual</span><code class="bad">${esc(t.error.actual || '—')}</code></div>
        ${t.error.locator ? `<div><span>Locator</span><code>${esc(t.error.locator)}</code></div>` : ''}
      </div>
      <pre class="raw">${esc(t.error.message)}</pre>
      ${
        t.screenshots.length
          ? t.screenshots
              .map(
                (s) =>
                  `<a class="shot" href="${esc(s)}" target="_blank" rel="noreferrer"><img src="${esc(s)}" alt="Screenshot at failure" loading="lazy"></a>`,
              )
              .join('')
          : '<p class="muted">No screenshot captured for this failure.</p>'
      }`
    : '<p class="muted">This test did not fail in the last run, so there is nothing to explain.</p>';

  return `
    <div class="panel" data-panel="details" hidden>
      <h4>What this test proves</h4>
      <p>${esc(t.description)}</p>
      <div class="kv">
        <div><span>Suite</span><code>${esc(t.suite || '—')}</code></div>
        <div><span>Source</span><code>${esc(t.file)}:${t.line}</code></div>
        <div><span>Role</span><code>${esc(t.folder)}</code></div>
        ${t.skipReason ? `<div><span>Skipped</span><code>${esc(t.skipReason)}</code></div>` : ''}
      </div>
    </div>
    <div class="panel" data-panel="case" hidden>
      <h4>Manual test case</h4>
      <ol class="steps">${steps}</ol>
    </div>
    <div class="panel" data-panel="error" hidden>
      <h4>Why it failed</h4>
      ${errorPanel}
    </div>`;
}

function render({ tests, folders, pages, tags, results }) {
  const generated = new Date().toLocaleString();
  const lastRun = results.startedAt ? new Date(results.startedAt).toLocaleString() : 'never';

  const rows = tests
    .map(
      (t) => `
    <tr class="row" data-key="${esc(t.key)}" data-folder="${esc(t.folder)}"
        data-pages="${esc(t.pages.join('|'))}" data-tags="${esc(t.tags.join('|'))}"
        data-lastrun="${esc(t.lastRun)}"
        data-text="${esc((t.id + ' ' + t.title + ' ' + t.description).toLowerCase())}">
      <td class="id">${esc(t.id || '—')}</td>
      <td>
        <div class="title">${esc(t.title)}</div>
        <div class="desc">${esc(t.description)}</div>
        <div class="meta">
          <button class="btn" data-open="details">Details</button>
          <button class="btn" data-open="case">Test case</button>
          <button class="btn err" data-open="error"${t.error ? '' : ' disabled title="Did not fail in the last run"'}>Error</button>
          <span class="chip folder">${esc(t.folder)}</span>
          ${t.pages.map((p) => `<span class="chip page">${esc(p)}</span>`).join('')}
          ${t.tags.map((g) => `<span class="chip tag">${esc(g)}</span>`).join('')}
        </div>
        ${panels(t)}
      </td>
      <td class="lastrun"><span class="pill ${esc(t.lastRun)}">${esc(t.lastRun.replace('-', ' '))}</span></td>
      <td>
        <select class="status" aria-label="Status for ${esc(t.id || t.title)}">
          <option value="NO RUN">NO RUN</option>
          <option value="PASS">PASS</option>
          <option value="FAILED">FAILED</option>
          <option value="IN PROGRESS">IN PROGRESS</option>
        </select>
      </td>
    </tr>`,
    )
    .join('');

  const opts = (list) => list.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COS2 Test Inventory</title>
<style>
  :root {
    --bg:#f6f7f9; --panel:#fff; --ink:#15181d; --muted:#5d6672; --line:#dfe3e8;
    --accent:#2f6fde; --pass:#1a7f52; --fail:#c0392b; --prog:#b7791f; --none:#6b7280;
    --pass-bg:#e4f5ec; --fail-bg:#fdeaea; --prog-bg:#fcf3e2; --none-bg:#eef0f3;
    --skip-bg:#eae7fb; --skip:#5b4bbd; --soft:#f2f4f7;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg:#14171c; --panel:#1b1f26; --ink:#e8ebef; --muted:#9aa4b2; --line:#2c323c;
      --accent:#6ea0ff; --pass:#5fd39b; --fail:#ff8b80; --prog:#e8bd63; --none:#9aa4b2;
      --pass-bg:#15322a; --fail-bg:#3a1f1f; --prog-bg:#3a2f18; --none-bg:#252a32;
      --skip-bg:#272150; --skip:#b6a8ff; --soft:#232832;
    }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:14px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
  header { padding:20px 24px 0; }
  h1 { margin:0 0 4px; font-size:20px; }
  .sub { color:var(--muted); font-size:12px; margin-bottom:14px; }
  .cards { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:10px;
          padding:10px 14px; min-width:104px; }
  .card b { display:block; font-size:22px; line-height:1.2; }
  .card span { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
  .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center;
             background:var(--panel); border:1px solid var(--line); border-radius:10px;
             padding:10px; margin-bottom:14px; }
  input[type=search], select { background:var(--bg); color:var(--ink);
    border:1px solid var(--line); border-radius:7px; padding:7px 9px; font:inherit; }
  input[type=search] { flex:1; min-width:190px; }
  button { background:var(--accent); color:#fff; border:0; border-radius:7px;
           padding:8px 12px; font:inherit; cursor:pointer; }
  button.ghost { background:transparent; color:var(--muted); border:1px solid var(--line); }
  main { padding:0 24px 40px; }
  .wrap { overflow-x:auto; background:var(--panel); border:1px solid var(--line); border-radius:10px; }
  table { border-collapse:collapse; width:100%; min-width:860px; }
  th, td { text-align:left; padding:11px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { position:sticky; top:0; background:var(--panel); font-size:11px; text-transform:uppercase;
       letter-spacing:.05em; color:var(--muted); z-index:2; }
  td.id { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px; color:var(--muted); white-space:nowrap; }
  .title { font-weight:600; }
  .desc { color:var(--muted); margin-top:2px; max-width:92ch; }
  .meta { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  .btn { background:var(--soft); color:var(--ink); border:1px solid var(--line);
         font-size:11px; padding:3px 10px; border-radius:6px; font-weight:600; }
  .btn[disabled] { opacity:.4; cursor:not-allowed; }
  .btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .btn.err:not([disabled]) { color:var(--fail); border-color:var(--fail); }
  .btn.err.active { background:var(--fail); color:#fff; }
  .chip { font-size:11px; padding:1px 8px; border-radius:20px; border:1px solid var(--line); color:var(--muted); }
  .chip.page { border-color:var(--accent); color:var(--accent); }
  .panel { margin-top:10px; background:var(--soft); border:1px solid var(--line);
           border-radius:8px; padding:12px 14px; max-width:100ch; }
  .panel h4 { margin:0 0 8px; font-size:12px; text-transform:uppercase;
              letter-spacing:.05em; color:var(--muted); }
  .panel p { margin:0 0 8px; }
  .steps { margin:0; padding-left:20px; }
  .steps li { margin-bottom:5px; }
  .kv { display:grid; gap:5px; margin:8px 0; }
  .kv > div { display:grid; grid-template-columns:90px 1fr; gap:10px; align-items:start; }
  .kv span { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; padding-top:3px; }
  code { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;
         background:var(--panel); border:1px solid var(--line); border-radius:5px;
         padding:2px 6px; display:inline-block; word-break:break-word; }
  code.ok { color:var(--pass); } code.bad { color:var(--fail); }
  pre.raw { background:var(--panel); border:1px solid var(--line); border-radius:6px;
            padding:10px; overflow-x:auto; font-size:12px; margin:8px 0; max-height:260px; }
  .shot { display:block; margin-top:8px; }
  .shot img { max-width:100%; border:1px solid var(--line); border-radius:6px; }
  .muted { color:var(--muted); }
  .pill { font-size:11px; padding:2px 9px; border-radius:20px; white-space:nowrap; text-transform:capitalize; }
  .pill.passed { background:var(--pass-bg); color:var(--pass); }
  .pill.failed { background:var(--fail-bg); color:var(--fail); }
  .pill.skipped { background:var(--skip-bg); color:var(--skip); }
  .pill.not-run { background:var(--none-bg); color:var(--none); }
  select.status { min-width:130px; }
  tr.s-PASS td.id { box-shadow:inset 3px 0 var(--pass); }
  tr.s-FAILED td.id { box-shadow:inset 3px 0 var(--fail); }
  .empty { padding:34px; text-align:center; color:var(--muted); }
</style>
</head>
<body>
<header>
  <h1>COS2 Test Inventory</h1>
  <div class="sub">
    ${tests.length} tests · generated ${esc(generated)} · last Playwright run ${esc(lastRun)}
    — <strong>Last run</strong> is written by the suite; <strong>Status</strong> is yours to set and is kept in this browser.
  </div>

  <div class="cards">
    <div class="card"><b id="c-total">0</b><span>Shown</span></div>
    <div class="card"><b id="c-pass">0</b><span>Pass</span></div>
    <div class="card"><b id="c-fail">0</b><span>Failed</span></div>
    <div class="card"><b id="c-prog">0</b><span>In progress</span></div>
    <div class="card"><b id="c-none">0</b><span>No run</span></div>
  </div>

  <div class="filters">
    <input type="search" id="q" placeholder="Search id, title or description…">
    <select id="f-folder"><option value="">All roles</option>${opts(folders)}</select>
    <select id="f-page"><option value="">All pages</option>${opts(pages)}</select>
    <select id="f-tag"><option value="">All tags</option>${opts(tags)}</select>
    <select id="f-status">
      <option value="">All statuses</option>
      <option>NO RUN</option><option>PASS</option><option>FAILED</option><option>IN PROGRESS</option>
    </select>
    <select id="f-lastrun">
      <option value="">Any last run</option>
      <option value="passed">passed</option><option value="failed">failed</option>
      <option value="skipped">skipped</option><option value="not-run">not run</option>
    </select>
    <button id="sync" title="Set every shown row's Status from its last Playwright run">Adopt last run</button>
    <button class="ghost" id="clear">Reset my statuses</button>
  </div>
</header>

<main>
  <div class="wrap">
    <table>
      <thead><tr><th>ID</th><th>Test</th><th>Last run</th><th>Status</th></tr></thead>
      <tbody id="tbody">${rows}</tbody>
    </table>
    <div class="empty" id="empty" hidden>Nothing matches these filters.</div>
  </div>
</main>

<script>
(function () {
  var KEY = 'cos2-dashboard-status-v1';
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }

  var rows = Array.prototype.slice.call(document.querySelectorAll('tr.row'));
  var els = {
    q: document.getElementById('q'),
    folder: document.getElementById('f-folder'),
    page: document.getElementById('f-page'),
    tag: document.getElementById('f-tag'),
    status: document.getElementById('f-status'),
    lastrun: document.getElementById('f-lastrun'),
    empty: document.getElementById('empty')
  };

  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function paint(row, value) {
    row.className = row.className.replace(/\\bs-[A-Z ]+/g, '').trim() + ' s-' + value;
  }

  rows.forEach(function (row) {
    var sel = row.querySelector('select.status');
    var key = row.dataset.key;
    sel.value = store[key] || 'NO RUN';
    paint(row, sel.value);
    sel.addEventListener('change', function () {
      if (sel.value === 'NO RUN') delete store[key]; else store[key] = sel.value;
      save(); paint(row, sel.value); apply();
    });

    row.querySelectorAll('button[data-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.dataset.open;
        var panel = row.querySelector('.panel[data-panel="' + want + '"]');
        var opening = panel.hidden;
        row.querySelectorAll('.panel').forEach(function (p) { p.hidden = true; });
        row.querySelectorAll('button[data-open]').forEach(function (b) { b.classList.remove('active'); });
        if (opening) { panel.hidden = false; btn.classList.add('active'); }
      });
    });
  });

  function apply() {
    var q = els.q.value.trim().toLowerCase();
    var counts = { total: 0, PASS: 0, FAILED: 0, 'IN PROGRESS': 0, 'NO RUN': 0 };

    rows.forEach(function (row) {
      var sel = row.querySelector('select.status');
      var ok =
        (!q || row.dataset.text.indexOf(q) !== -1) &&
        (!els.folder.value || row.dataset.folder === els.folder.value) &&
        (!els.page.value || row.dataset.pages.split('|').indexOf(els.page.value) !== -1) &&
        (!els.tag.value || row.dataset.tags.split('|').indexOf(els.tag.value) !== -1) &&
        (!els.status.value || sel.value === els.status.value) &&
        (!els.lastrun.value || row.dataset.lastrun === els.lastrun.value);

      row.hidden = !ok;
      if (ok) { counts.total++; counts[sel.value]++; }
    });

    document.getElementById('c-total').textContent = counts.total;
    document.getElementById('c-pass').textContent = counts.PASS;
    document.getElementById('c-fail').textContent = counts.FAILED;
    document.getElementById('c-prog').textContent = counts['IN PROGRESS'];
    document.getElementById('c-none').textContent = counts['NO RUN'];
    els.empty.hidden = counts.total !== 0;
  }

  ['q', 'folder', 'page', 'tag', 'status', 'lastrun'].forEach(function (k) {
    els[k].addEventListener('input', apply);
    els[k].addEventListener('change', apply);
  });

  document.getElementById('sync').addEventListener('click', function () {
    var map = { passed: 'PASS', failed: 'FAILED', skipped: 'NO RUN', 'not-run': 'NO RUN' };
    rows.forEach(function (row) {
      if (row.hidden) return;
      var mapped = map[row.dataset.lastrun];
      if (!mapped) return;
      var sel = row.querySelector('select.status');
      sel.value = mapped;
      if (mapped === 'NO RUN') delete store[row.dataset.key]; else store[row.dataset.key] = mapped;
      paint(row, mapped);
    });
    save(); apply();
  });

  document.getElementById('clear').addEventListener('click', function () {
    if (!confirm('Clear every status you have set by hand?')) return;
    store = {}; save();
    rows.forEach(function (row) {
      row.querySelector('select.status').value = 'NO RUN';
      paint(row, 'NO RUN');
    });
    apply();
  });

  apply();
})();
</script>
</body>
</html>`;
}

if (require.main === module) {
  const { out, count } = build();
  console.log(`Dashboard written: ${path.relative(ROOT, out)} (${count} tests)`);
}

module.exports = { build };
