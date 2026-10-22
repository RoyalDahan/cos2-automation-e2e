import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behaviour for every COS2 page object.
 *
 * Rules the team agreed on:
 *  - Page objects expose intent ("searchForEducator"), never raw selectors.
 *  - Locators resolve by data-testid, falling back to ARIA role where the app has not
 *    yet been given one. No CSS class chains.
 *  - Page objects assert nothing about business outcomes; specs do that.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Clicking the logo returns to Credentials Home from anywhere in the app. */
  get header(): Locator {
    return this.page.getByTestId('header-logo');
  }

  get userMenu(): Locator {
    return this.page.getByTestId('profile-menu');
  }

  get adminMenuItem(): Locator {
    return this.page.getByTestId('menu-admin');
  }

  get helpMenuItem(): Locator {
    return this.page.getByTestId('menu-help');
  }

  get logoutMenuItem(): Locator {
    return this.page.getByTestId('menu-logout');
  }

  async goHome(): Promise<void> {
    await this.header.click();
    await this.page.waitForLoadState('load');
  }

  /**
   * The profile dropdown is collapsed until its wrapper is clicked, and the click
   * toggles - so this is idempotent and waits for the panel to actually expand rather
   * than assuming the click landed.
   */
  async openUserMenu(): Promise<void> {
    if (await this.logoutMenuItem.isVisible().catch(() => false)) return;
    await this.userMenu.locator('[role="button"]').first().click();
    await this.logoutMenuItem.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  }

  /** True when the Admin entry is offered - internal COS2 users only. */
  async hasAdminLink(): Promise<boolean> {
    await this.openUserMenu();
    return this.adminMenuItem.isVisible().catch(() => false);
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutMenuItem.click();
  }

  /** Full rendered text of the page - used by PII leak assertions. */
  async bodyText(): Promise<string> {
    return (await this.page.locator('body').innerText()).trim();
  }

  async expectSignedIn(): Promise<void> {
    await expect(this.userMenu).toBeVisible();
  }
}
