import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Credential Summary - educator panel on top, credential table underneath.
 * Four documented UI states: default collapsed, educator expanded,
 * document expanded, and both expanded.
 */
export class CredentialSummaryPage extends BasePage {
  protected readonly pageTestId = 'page-credential-summary';

  constructor(page: Page) {
    super(page);
  }

  /* ---- educator panel ---- */
  get educatorName(): Locator {
    return this.page.getByTestId('educator-name');
  }
  get ssn(): Locator {
    return this.page.getByTestId('educator-ssn');
  }
  get seid(): Locator {
    return this.page.getByTestId('educator-seid');
  }
  get status(): Locator {
    return this.page.getByTestId('educator-status');
  }
  get birthDate(): Locator {
    return this.page.getByTestId('educator-birthdate');
  }
  get sub708Date(): Locator {
    return this.page.getByTestId('educator-sub708');
  }

  /* ---- educator actions (LACOE only) ---- */
  get editEducatorButton(): Locator {
    return this.page.getByTestId('edit-educator');
  }
  get addDocumentButton(): Locator {
    return this.page.getByTestId('add-document');
  }
  get expandEducatorButton(): Locator {
    return this.page.getByTestId('expand-educator');
  }
  get expandedPanel(): Locator {
    return this.page.getByTestId('educator-expanded');
  }
  get remarks(): Locator {
    return this.page.getByTestId('remarks');
  }
  get legalNotes(): Locator {
    return this.page.getByTestId('legal');
  }
  get previousNames(): Locator {
    return this.page.getByTestId('previous-names');
  }
  get vors(): Locator {
    return this.page.getByTestId('vors');
  }
  get bsrs(): Locator {
    return this.page.getByTestId('bsrs');
  }

  /* ---- credential table ---- */
  get credentialTable(): Locator {
    return this.page.getByTestId('credential-table');
  }
  get credentialRows(): Locator {
    return this.page.getByTestId('credential-row');
  }
  get flash(): Locator {
    return this.page.getByTestId('flash');
  }

  rowFor(documentId: string): Locator {
    return this.page.locator(`[data-testid="credential-row"][data-docid="${documentId}"]`);
  }

  async credentialCount(): Promise<number> {
    return this.credentialRows.count();
  }

  async documentIds(): Promise<string[]> {
    return this.credentialRows.getByTestId('cred-docid').allInnerTexts();
  }

  async expandEducator(): Promise<void> {
    await this.expandEducatorButton.click();
    await expect(this.expandedPanel).toBeVisible();
  }

  async viewDocument(documentId: string): Promise<void> {
    await this.rowFor(documentId).getByTestId('cred-view').click();
  }

  async editDocument(documentId: string): Promise<void> {
    await this.rowFor(documentId).getByTestId('cred-edit').click();
  }

  async editEducator(): Promise<void> {
    await this.editEducatorButton.click();
  }

  async statusOf(documentId: string): Promise<string> {
    return (await this.rowFor(documentId).getByTestId('cred-status').innerText()).trim();
  }

  /** The R/P indicator: R = replaced by a newer document, P = marked for purge. */
  async indicatorOf(documentId: string): Promise<string> {
    return (await this.rowFor(documentId).getByTestId('cred-indicator').innerText()).trim();
  }
}
