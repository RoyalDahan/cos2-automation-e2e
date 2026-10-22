import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Credentials Home - the landing screen after portal authentication.
 * Two independent search entry points:
 *   1. Educator search  (Name / SSN / SEID)
 *   2. Document search  (Document ID)
 */

/**
 * The deployed app named its testids differently from the proposed contract
 * (`header-search-credentials`, not `educator-search-input`). Each locator therefore
 * tries the shipped testid first and falls back to the placeholder, so the suite keeps
 * working while the naming is reconciled with the dev team.
 *
 * The educator placeholder is matched by prefix on purpose: it has already changed once,
 * from "Name, SSN, SEID, EID" to "Name, SSN, SEID".
 */
export const LIVE_EDUCATOR_SEARCH =
  '[data-testid="header-search-credentials"], input[placeholder^="Name, SSN"]';
const LIVE_EDUCATOR_SUBMIT =
  '[data-testid="header-search-credentials-btn"], .input-group:has(input[placeholder^="Name, SSN"]) span.input-group-text';
const LIVE_DOCUMENT_SEARCH =
  '[data-testid="header-search-documents"], input[placeholder="Document ID"]';
const LIVE_DOCUMENT_SUBMIT =
  '[data-testid="header-search-documents-btn"], .input-group:has(input[placeholder="Document ID"]) span.input-group-text';

export class CredentialsHomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get educatorSearchInput(): Locator {
    return this.page.locator(LIVE_EDUCATOR_SEARCH).first();
  }
  get documentSearchInput(): Locator {
    return this.page.locator(LIVE_DOCUMENT_SEARCH).first();
  }
  get searchButton(): Locator {
    return this.page.locator(LIVE_EDUCATOR_SUBMIT).first();
  }
  get documentSearchButton(): Locator {
    return this.page.locator(LIVE_DOCUMENT_SUBMIT).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('load');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.educatorSearchInput).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Blazor Server prerenders this header, so the search box is visible and accepts
   * keystrokes before its SignalR circuit attaches. Anything typed in that window is
   * silently dropped and the DOM reverted on the next render - which looks exactly like
   * a broken click. Fill until the value survives a round-trip, which is the only
   * reliable signal that the component has gone interactive.
   */
  private async enterTerm(input: Locator, term: string): Promise<void> {
    // An empty term can't prove hydration on its own, so commit a sentinel then clear it.
    const probe = term === '' ? 'x' : term;
    await expect
      .poll(async () => {
        await input.fill(probe).catch(() => undefined);
        // The settle is essential: fill() sets the DOM value synchronously, so reading it
        // back immediately always succeeds and proves nothing. An unhydrated component
        // reverts it on the next render, which only shows up after a pause.
        await input.page().waitForTimeout(400);
        return input.inputValue().catch(() => '');
      }, { timeout: 20_000, message: 'search box never became interactive' })
      .toBe(probe);
    if (term === '') await input.fill('');
  }

  /** Search by name, SSN or SEID. */
  async searchEducator(term: string): Promise<void> {
    await this.enterTerm(this.educatorSearchInput, term);
    await this.searchButton.click();
  }

  /** Search by credential document id. */
  async searchDocument(documentId: string): Promise<void> {
    await this.enterTerm(this.documentSearchInput, documentId);
    await this.documentSearchButton.click();
  }

  /** Submitting with Enter rather than the button - both must work. */
  async searchEducatorWithEnter(term: string): Promise<void> {
    await this.enterTerm(this.educatorSearchInput, term);
    await this.educatorSearchInput.press('Enter');
  }
}
