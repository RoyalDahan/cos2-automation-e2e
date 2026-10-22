import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The deployed grid is a Radzen DataGrid. It carries testids on the grid, each row, each
 * View button, the count and Back - but none on the individual cells, so cells are
 * addressed positionally. Column order is fixed by the grid definition:
 *   1 Name | 2 SSN | 3 SEID | 4 Birth Date | 5 actions
 */
const GRID = '[data-testid="educators-grid"]';
const ROW = '[data-testid^="educator-row-"]';
const VIEW = '[data-testid^="educator-view-"]';
const COUNT = '[data-testid="educators-count"]';
const BACK = '[data-testid="search-back"]';

export type ResultColumn = 'name' | 'ssn' | 'seid' | 'birthDate';

const COLUMN_INDEX: Record<ResultColumn, number> = {
  name: 1,
  ssn: 2,
  seid: 3,
  birthDate: 4,
};

export class SearchResultsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get resultsTable(): Locator {
    return this.page.locator(GRID);
  }
  get rows(): Locator {
    return this.page.locator(ROW);
  }
  get resultCount(): Locator {
    return this.page.locator(COUNT);
  }
  get backButton(): Locator {
    return this.page.locator(BACK);
  }

  /** Birth Date column - absent entirely for roles not entitled to it, not merely blank. */
  get birthDateCells(): Locator {
    return this.page.locator(`${ROW} td:nth-child(${COLUMN_INDEX.birthDate})`);
  }

  /** A single cell, by column name, so specs never encode the grid's column order. */
  cell(column: ResultColumn, index = 0): Locator {
    return this.rows.nth(index).locator(`td:nth-child(${COLUMN_INDEX[column]})`);
  }

  /** Every value in one column, as trimmed text. */
  async columnValues(column: ResultColumn): Promise<string[]> {
    const cells = this.page.locator(`${ROW} td:nth-child(${COLUMN_INDEX[column]})`);
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  rowFor(seid: string): Locator {
    return this.rows.filter({
      has: this.page.locator(`td:nth-child(${COLUMN_INDEX.seid}):text-is("${seid}")`),
    });
  }

  async count(): Promise<number> {
    return this.rows.count();
  }

  /** SSN exactly as rendered in the results grid - masked or full depending on role. */
  async ssnTextAt(index = 0): Promise<string> {
    return (await this.cell('ssn', index).innerText()).trim();
  }

  async expectLoaded(): Promise<void> {
    // Blazor routes client-side, so there is no load event - assert on the rendered grid.
    await expect(this.page).toHaveURL(/\/search/);
    await expect(this.resultsTable).toBeVisible();
  }

  async openRow(index = 0): Promise<void> {
    await this.rows.nth(index).locator(VIEW).click();
  }

  async openEducator(seid: string): Promise<void> {
    await this.rowFor(seid).locator(VIEW).click();
  }

  async expectNoResults(): Promise<void> {
    await expect(this.rows).toHaveCount(0);
  }

  async expectResultCount(n: number): Promise<void> {
    await expect(this.rows).toHaveCount(n);
  }
}
