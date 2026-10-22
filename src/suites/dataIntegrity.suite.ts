import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';
import { isSeid, isDisplayDate } from '../utils/validators';

/**
 * Data integrity (DI)
 *
 * The UI can look perfect while the record underneath is malformed. These assert the
 * shape of what the grid actually renders, so a formatting regression is caught before
 * anyone reads a wrong SSN off the screen.
 *
 * Driven through the UI rather than an API because COS2 exposes no test endpoint.
 */
export function registerDataIntegritySuite(role: Role): void {
  test.describe(`@regression @data Data integrity - ${role.label}`, () => {
    test.beforeEach(async ({ home, results }) => {
      await home.goto();
      await home.searchEducator('a');
      await results.expectLoaded();
    });

    test('DI-001 every rendered SEID is ten digits, or blank where none is held', async ({ results }) => {
      // One DEV educator genuinely has no SEID, so blank is a valid state; a malformed
      // value is not.
      for (const value of await results.columnValues('seid')) {
        if (value === '') continue;
        expect(isSeid(value), `SEID "${value}" must be 10 digits`).toBeTruthy();
      }
    });

    test('DI-002 every rendered SSN uses the masked ***-**-NNNN display format', async ({ results }) => {
      // Every role sees SSNs masked until it clicks one; the reveal itself is covered by
      // the SSN masking suite.
      for (const value of await results.columnValues('ssn')) {
        if (value === '') continue;
        expect(/^\*{3}-\*{2}-\d{4}$/.test(value), `SSN "${value}" must be ***-**-NNNN`).toBeTruthy();
      }
    });

    test('DI-003 every rendered birth date is MM/DD/YYYY', async ({ results }) => {
      for (const value of await results.columnValues('birthDate')) {
        if (value === '') continue;
        expect(isDisplayDate(value), `birth date "${value}" must be MM/DD/YYYY`).toBeTruthy();
      }
    });

    test('DI-004 no row renders an empty name', async ({ results }) => {
      // A nameless row means the grid bound to the wrong field, which has happened before
      // in grids that key off a nullable column.
      const names = await results.columnValues('name');
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(name.trim()).not.toBe('');
    });

    test('DI-005 SEID uniquely identifies an educator @negative', async ({ results }) => {
      // SEID is the educator key, so duplicates break every identifier-based lookup.
      const seids = (await results.columnValues('seid')).filter(Boolean);
      const duplicates = seids.filter((v, i) => seids.indexOf(v) !== i);
      expect(duplicates, `SEIDs shared by more than one educator: ${duplicates.join(', ')}`).toEqual([]);
    });
  });
}
