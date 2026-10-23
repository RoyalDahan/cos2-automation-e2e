import { Browser, chromium } from '@playwright/test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * One long-lived browser per sign-in account, started outside Playwright and attached to
 * over CDP.
 *
 * A browser that Playwright launches dies with the Playwright worker, and Playwright
 * throws a worker away after every failed test - so a single failure used to close the
 * window and force a full portal sign-in for the next test. Here the browser is spawned
 * detached and the tests only connect to it. A worker restart, a failed test, even the
 * end of the run, leaves it open and signed in, and the next run picks up where this one
 * left off.
 *
 * Keyed by account rather than by role: while all three roles sign in with the same
 * account they share one browser and one sign-in. Give a role its own account in .env
 * and it gets its own profile and browser automatically.
 */

const ROOT = path.resolve(__dirname, '../..');

/**
 * Claude Code cloud sessions have no Edge and no display, and their preinstalled Chromium
 * is not the revision this Playwright version pins, so it is used by path, headless.
 */
const IN_CLAUDE_CLOUD = process.env.CLAUDE_CODE_REMOTE === 'true';

const EDGE_PATHS = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe'),
  '/opt/microsoft/msedge/msedge',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

/** Written beside the profile so a later run knows how the running browser was started. */
interface BrowserState {
  port: number;
  /** Command-line switches it was started with; any difference means restart it. */
  args: string[];
}

function executable(): string {
  if (IN_CLAUDE_CLOUD) return '/opt/pw-browsers/chromium';
  const found = EDGE_PATHS.find((p): p is string => !!p && fs.existsSync(p));
  if (!found) {
    throw new Error('Microsoft Edge was not found. Set EDGE_PATH in .env to the full path of msedge.exe.');
  }
  return found;
}

/** A stable port per profile, so a later run finds the browser an earlier run started. */
function portFor(profileDir: string): number {
  let hash = 0;
  for (const ch of profileDir) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 9300 + (hash % 500);
}

function stateFile(profileDir: string): string {
  return path.join(ROOT, `${profileDir}.browser.json`);
}

function readState(profileDir: string): BrowserState | null {
  try {
    return JSON.parse(fs.readFileSync(stateFile(profileDir), 'utf8')) as BrowserState;
  } catch {
    return null;
  }
}

async function isListening(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1_500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitFor(check: () => Promise<boolean>, timeoutMs: number, what: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out after ${timeoutMs / 1000}s waiting for ${what}.`);
}

/** Closes the real browser process - browser.close() on a CDP connection only disconnects. */
async function shutDown(port: number): Promise<void> {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const session = await browser.newBrowserCDPSession();
  await session.send('Browser.close').catch(() => undefined);
  await waitFor(async () => !(await isListening(port)), 15_000, 'the old browser to close');
}

function argsFor(profileDir: string, port: number, headless: boolean): string[] {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ROOT, profileDir)}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--ignore-certificate-errors',
    // Extensions inject their own markup into the page under test (MozBar adds a second
    // <html> element), and Edge sync would install them into the profile. Playwright
    // turned both off when it launched the browser; now it is ours to do.
    '--disable-extensions',
    '--disable-sync',
  ];
  // The cloud container runs as root, which Chromium refuses to do sandboxed.
  if (IN_CLAUDE_CLOUD) args.push('--no-sandbox');
  if (headless) {
    args.push('--headless=new', '--window-size=1600,900');
  } else {
    // Maximized on the monitor it opens on. BROWSER_WINDOW_POSITION=x,y in .env moves it
    // to a particular monitor first, e.g. -1920,0 for a monitor left of the main one.
    if (process.env.BROWSER_WINDOW_POSITION) {
      args.push(`--window-position=${process.env.BROWSER_WINDOW_POSITION}`);
    }
    args.push('--start-maximized');
  }
  return args;
}

function start(profileDir: string, args: string[]): void {
  fs.mkdirSync(path.join(ROOT, profileDir), { recursive: true });
  const child = spawn(executable(), [...args, 'about:blank'], { detached: true, stdio: 'ignore' });
  child.unref();
  const state: BrowserState = { port: portFor(profileDir), args };
  fs.writeFileSync(stateFile(profileDir), JSON.stringify(state));
}

/**
 * Connects to the account's browser, starting it first if it is not already running.
 * A browser left running with different settings - headless instead of visible, or from
 * an older version of this file - is restarted, so a run never silently attaches to a
 * window that does not match what was asked for. The profile, and the sign-in in it,
 * survive the restart.
 */
export async function attachToBrowser(profileDir: string): Promise<Browser> {
  const headless = IN_CLAUDE_CLOUD || process.env.HEADLESS === '1';
  const port = portFor(profileDir);

  const args = argsFor(profileDir, port, headless);

  if (await isListening(port)) {
    if (readState(profileDir)?.args?.join(' ') !== args.join(' ')) {
      await shutDown(port);
      start(profileDir, args);
    }
  } else {
    start(profileDir, args);
  }

  await waitFor(() => isListening(port), 30_000, `the browser on port ${port} to start`);
  // SLOW_MO=1000 pauses a second before every click, fill and navigation, so a person can
  // follow along. Set by "Admin.bat slow", or in .env.
  return chromium.connectOverCDP(`http://127.0.0.1:${port}`, { slowMo: Number(process.env.SLOW_MO) || 0 });
}
