import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { appUrl } from '../utils/appUrl';

export interface CredentialEdits {
  title?: string;
  term?: string;
  type?: string;
  docStatus?: string;
  issueDate?: string; // yyyy-mm-dd
  expDate?: string; // yyyy-mm-dd
  auth?: string;
  renewal?: string;
  majors?: string;
  minors?: string;
  restrictions?: string;
  comments?: string;
  waiverConditions?: string;
}

/**
 * View / Edit Document page.
 *
 * Two documented states:
 *   State 1 - Read-only. Every field disabled. Both roles can reach this.
 *   State 2 - Editable. LACOE only. Save / Cancel available.
 */
export class CredentialDetailPage extends BasePage {
  protected readonly pageTestId = 'page-credential-detail';

  constructor(page: Page) {
    super(page);
  }

  get form(): Locator {
    return this.page.getByTestId('credential-form');
  }
  get title(): Locator {
    return this.page.getByTestId('field-title');
  }
  get term(): Locator {
    return this.page.getByTestId('field-term');
  }
  get type(): Locator {
    return this.page.getByTestId('field-type');
  }
  get docStatus(): Locator {
    return this.page.getByTestId('field-doc-status');
  }
  get issueDate(): Locator {
    return this.page.getByTestId('field-issue-date');
  }
  get expireDate(): Locator {
    return this.page.getByTestId('field-expire-date');
  }
  get regNbr(): Locator {
    return this.page.getByTestId('field-reg-nbr');
  }
  get regDate(): Locator {
    return this.page.getByTestId('field-reg-date');
  }
  get comments(): Locator {
    return this.page.getByTestId('field-comments');
  }
  get waiver(): Locator {
    return this.page.getByTestId('field-waiver');
  }

  get saveButton(): Locator {
    return this.page.getByTestId('save-button');
  }
  get cancelButton(): Locator {
    return this.page.getByTestId('cancel-button');
  }
  get editButton(): Locator {
    return this.page.getByTestId('edit-button');
  }
  get validationError(): Locator {
    return this.page.getByTestId('validation-error');
  }
  get backToSummary(): Locator {
    return this.page.getByTestId('back-to-summary');
  }

  /** Every editable-in-state-2 control, used to prove read-only mode wholesale. */
  private get editableFields(): Locator[] {
    return [this.title, this.term, this.type, this.docStatus, this.issueDate, this.expireDate, this.comments, this.waiver];
  }

  async expectLoaded(): Promise<void> {
    await expect(this.form).toBeVisible();
  }

  async goto(documentId: string, seid: string, edit = false): Promise<void> {
    await this.page.goto(appUrl(`/credential/${documentId}?seid=${seid}${edit ? '&edit=1' : ''}`));
    await this.expectLoaded();
  }

  async enterEditMode(): Promise<void> {
    await this.editButton.click();
    await expect(this.saveButton).toBeVisible();
  }

  async fill(edits: CredentialEdits): Promise<void> {
    if (edits.title !== undefined) await this.title.selectOption(edits.title);
    if (edits.term !== undefined) await this.term.selectOption(edits.term);
    if (edits.type !== undefined) await this.type.selectOption(edits.type);
    if (edits.docStatus !== undefined) await this.docStatus.selectOption(edits.docStatus);
    if (edits.issueDate !== undefined) await this.issueDate.fill(edits.issueDate);
    if (edits.expDate !== undefined) await this.expireDate.fill(edits.expDate);
    if (edits.auth !== undefined) await this.page.getByTestId('field-auth').fill(edits.auth);
    if (edits.renewal !== undefined) await this.page.getByTestId('field-renewal').fill(edits.renewal);
    if (edits.majors !== undefined) await this.page.getByTestId('field-majors').fill(edits.majors);
    if (edits.minors !== undefined) await this.page.getByTestId('field-minors').fill(edits.minors);
    if (edits.restrictions !== undefined) await this.page.getByTestId('field-restrictions').fill(edits.restrictions);
    if (edits.comments !== undefined) await this.comments.fill(edits.comments);
    if (edits.waiverConditions !== undefined) await this.waiver.fill(edits.waiverConditions);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /** State 1 assertion: no field on the form accepts input. */
  async expectReadOnly(): Promise<void> {
    for (const field of this.editableFields) {
      const disabled = await field.isDisabled();
      const readonly = await field.getAttribute('readonly');
      expect(disabled || readonly !== null, `${await field.getAttribute('data-testid')} should not be editable`).toBeTruthy();
    }
    await expect(this.saveButton).toHaveCount(0);
  }

  /** State 2 assertion: fields accept input and Save/Cancel are offered. */
  async expectEditable(): Promise<void> {
    await expect(this.saveButton).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
    await expect(this.comments).toBeEditable();
  }

  /**
   * Registration number and date are system-owned: 1 means the row arrived in the
   * weekly CTC load, anything else means a human touched it. Automation must never
   * be able to type into them.
   */
  async expectSystemOwnedRegistrationFields(): Promise<void> {
    await expect(this.regNbr).toHaveAttribute('readonly', '');
    await expect(this.regDate).toHaveAttribute('readonly', '');
  }
}
