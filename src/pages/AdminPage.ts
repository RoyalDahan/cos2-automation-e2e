import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The Admin area - reference-data maintenance, restricted to the Credential Online
 * (admin) role.
 *
 * The screen has not been given testids yet, so membership is judged by what the app
 * does rather than by a single element: staying on /admin and not rendering an
 * authorisation refusal.
 */

const DENIED_TEXT = /not authori[sz]ed|access denied|forbidden|please sign in/i;

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get moduleTiles(): Locator {
    return this.page.locator('[data-testid="admin-tile"], [data-testid^="admin-module"]');
  }

  get lookupTable(): Locator {
    return this.page.locator('[data-testid="lookup-table"], table').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('load');
    // Blazor may redirect client-side after the load event.
    await this.page.waitForTimeout(1_500);
  }

  /** Text shown when the app refuses the request, if any. */
  async refusalText(): Promise<string | null> {
    const body = await this.bodyText().catch(() => '');
    const match = body.match(DENIED_TEXT);
    return match ? match[0] : null;
  }

  /**
   * True when the role genuinely reached Admin: still on /admin, and no refusal on screen.
   * A client-side redirect away from /admin counts as being refused.
   */
  async isReachable(): Promise<boolean> {
    const onAdminUrl = /\/admin/.test(this.page.url());
    return onAdminUrl && (await this.refusalText()) === null;
  }

  async expectReachable(): Promise<void> {
    expect(await this.isReachable(), `expected Admin to be reachable, landed on ${this.page.url()}`).toBeTruthy();
  }

  async expectRefused(): Promise<void> {
    expect(
      await this.isReachable(),
      `expected Admin to be refused, but it rendered at ${this.page.url()}`,
    ).toBeFalsy();
  }
}
