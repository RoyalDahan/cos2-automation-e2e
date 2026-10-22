import { BrowserContext, Page } from '@playwright/test';
import { LIVE_EDUCATOR_SEARCH } from '../pages/CredentialsHomePage';
import { Role } from '../roles/roles';

/**
 * Walks the LACOE district portal sign-in and stops only where a human is genuinely
 * required (phone approval). The portal, Entra ID and B2C pages are third-party and are
 * not under test; they are traversed purely to reach COS2.
 *
 * The walk is written as a set of independent steps rather than a fixed sequence, because
 * which screens appear varies with what the browser profile already has cached - a warm
 * profile skips straight past the account picker and the MFA prompt.
 */

const COS_URL = process.env.BASE_URL ?? 'https://credentialsonlinesystemdev.azurewebsites.net/';
const PORTAL_URL = process.env.PORTAL_URL ?? 'https://districtbusinessportaldev.lacoe.edu/';

/** Reaching the educator search box is the signal that sign-in finished and COS2 is up. */
export const SEARCH_INPUT = LIVE_EDUCATOR_SEARCH;

const MFA_WAIT_MS = Number(process.env.LOGIN_WAIT_MS ?? 180_000);

/**
 * One click each, in whatever order the identity provider decides to present them.
 * `:has-text()` is case-insensitive in Playwright, so the username matches regardless of
 * how Microsoft capitalises it on the account tile.
 */
/** While this is on screen the terms box is still unticked, so Log In would be rejected. */
const UNTICKED = '.rz-chkbox.rz-state-empty';

interface Step {
  selector: string;
  label: string;
  /** Skip this step for as long as this selector is on screen. */
  blockedBy?: string;
  once?: boolean;
}

/** Steps depend on the account being signed in, so they are built per role. */
const buildSteps = (username: string): ReadonlyArray<Step> => [
  {
    // Selector matches only while unticked, so repeats cannot toggle it back off.
    // Repeats are wanted: the first click can land before Blazor has wired its handler.
    selector: `${UNTICKED} .rz-chkbox-box`,
    label: 'ticked "I agree to the following"',
  },
  {
    selector: 'button:has(span.rz-button-text:text-is("Log In")), button:has-text("Log In")',
    label: 'clicked Log In',
    blockedBy: UNTICKED,
  },
  {
    selector: '#AzureADExchange',
    label: 'chose Azure Active Directory',
  },
  {
    // Only offered when the account is known; otherwise the operator picks it.
    selector: username
      ? [
          `[data-test-id="${username}"]`,
          `#tilesHolder [role="button"]:has-text("${username}")`,
          `div.tile:has-text("${username}")`,
        ].join(', ')
      : '#__never__',
    label: `picked the ${username} account`,
  },
  {
    selector: 'input[type="submit"][value="Yes"], button:has-text("Yes")',
    label: 'dismissed "Stay signed in?"',
  },
  {
    // `once` because this opens a new tab; clicking twice leaves a stray duplicate.
    selector: '[title="CredentialOnline"], img[src*="Credential_OS_SSO"]',
    label: 'opened Credential Online System',
    once: true,
  },
];

function livePages(context: BrowserContext): Page[] {
  return context.pages().filter((p) => !p.isClosed());
}

/** Immediate check - no implicit wait, because this runs against every page every tick. */
async function onScreen(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().isVisible().catch(() => false);
}

async function findCosPage(context: BrowserContext): Promise<Page | null> {
  for (const page of livePages(context)) {
    if (await onScreen(page, SEARCH_INPUT)) return page;
  }
  return null;
}

/** A step that keeps matching after several clicks is stuck; stop rather than spin forever. */
const MAX_ATTEMPTS = 4;

/** Perform at most one pending step on this page. Returns true if something was done. */
async function advance(page: Page, attempts: Map<string, number>, role: Role): Promise<boolean> {
  const email = page.locator('input[type="email"]').first();
  if (role.username && (await email.isVisible().catch(() => false))) {
    if (!(await email.inputValue().catch(() => 'x'))) {
      await email.fill(role.username).catch(() => undefined);
      console.log(`   ✓ entered ${role.username}`);
      await page
        .locator('input[type="submit"], button:has-text("Next")')
        .first()
        .click()
        .catch(() => undefined);
      return true;
    }
  }

  for (const step of buildSteps(role.username)) {
    const tries = attempts.get(step.label) ?? 0;
    if (tries >= MAX_ATTEMPTS) continue;
    if (step.once && tries > 0) continue;
    if (step.blockedBy && (await onScreen(page, step.blockedBy))) continue;
    if (!(await onScreen(page, step.selector))) continue;

    await page.locator(step.selector).first().click().catch(() => undefined);
    attempts.set(step.label, tries + 1);
    console.log(`   ✓ ${step.label}${tries ? ` (attempt ${tries + 1})` : ''}`);
    // Let the Blazor circuit settle before the next tick re-reads the DOM.
    await page.waitForTimeout(800).catch(() => undefined);
    return true;
  }
  return false;
}

/**
 * Returns a page sitting on the COS2 home screen, signing in first if required.
 * With a warm profile this is a no-op on every run after the first.
 */
export async function ensureLoggedIn(context: BrowserContext, role: Role): Promise<Page> {
  const existing = await findCosPage(context);
  if (existing) {
    await existing.bringToFront().catch(() => undefined);
    return existing;
  }

  const page = livePages(context)[0] ?? (await context.newPage());
  await page.goto(COS_URL).catch(() => undefined);
  await page.waitForLoadState('load').catch(() => undefined);

  if (await onScreen(page, SEARCH_INPUT)) {
    console.log(`\n✓ Already signed in as the ${role.label} - no login needed.\n`);
    return page;
  }

  console.log(`\n🤖 Signing in as the ${role.label}...`);
  if (!role.username) {
    console.log(`   No account configured for this role - enter it yourself when prompted.`);
    console.log(`   Set COS_${role.name.toUpperCase()}_USER in .env to automate this step.`);
  }
  await page.goto(PORTAL_URL).catch(() => undefined);
  await page.waitForLoadState('load').catch(() => undefined);

  const deadline = Date.now() + MFA_WAIT_MS;
  const attempts = new Map<string, number>();
  let promptedForPhone = false;
  let lastProgress = Date.now();

  while (Date.now() < deadline) {
    const cos = await findCosPage(context);
    if (cos) {
      console.log(`\n✓ Signed in. This profile is saved - the next run skips all of this.\n`);
      await cos.bringToFront().catch(() => undefined);
      return cos;
    }

    let acted = false;
    for (const p of livePages(context)) {
      if (await advance(p, attempts, role)) {
        acted = true;
        await p.waitForLoadState('load').catch(() => undefined);
      }
    }

    // Nothing left to click means the identity provider is waiting on the human.
    if (acted) {
      lastProgress = Date.now();
    } else if (!promptedForPhone && Date.now() - lastProgress > 6_000) {
      promptedForPhone = true;
      console.log(`\n========================================`);
      console.log(`📱 YOUR TURN - approve the sign-in on your phone`);
      console.log(`========================================`);
      console.log(`Everything after that is automatic.`);
      console.log(`Waiting up to ${Math.round((deadline - Date.now()) / 1000)}s...\n`);
    }

    await new Promise((r) => setTimeout(r, 1_500));
  }

  const urls = livePages(context).map((p) => p.url());
  throw new Error(
    `Never reached the COS2 home screen within ${Math.round(MFA_WAIT_MS / 1000)}s. ` +
      `Open tabs: ${urls.join(' | ')}. Raise LOGIN_WAIT_MS in .env if sign-in is genuinely slower than this.`,
  );
}
