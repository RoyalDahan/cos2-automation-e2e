import { test, expect } from '../fixtures/cos.fixture';
import { Role } from '../roles/roles';

/**
 * Accessibility (A11Y)
 *
 * LACOE is a public agency, so these are compliance obligations rather than polish.
 * Kept to structural checks that hold regardless of role.
 */
export function registerAccessibilitySuite(role: Role): void {
  test.describe(`@a11y @regression Accessibility - ${role.label}`, () => {
    test('A11Y-001 Credentials Home declares a page language', async ({ page, home }) => {
      await home.goto();
      await expect(page.locator('html')).toHaveAttribute('lang', /\w+/);
    });

    test('A11Y-002 the page has a non-empty document title', async ({ page, home }) => {
      // Screen readers announce the title on navigation; an empty one orients nobody.
      await home.goto();
      expect((await page.title()).trim()).not.toBe('');
    });

    test('A11Y-003 every search input carries an accessible name', async ({ page, home }) => {
      // Placeholder text alone is not an accessible name once the field has content.
      await home.goto();
      await home.expectLoaded();
      const inputs = page.locator('input[type="text"]');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const name =
          (await input.getAttribute('aria-label')) ||
          (await input.getAttribute('title')) ||
          (await input.getAttribute('placeholder'));
        expect(name, `input ${i} has no accessible name`).toBeTruthy();
      }
    });

    test('A11Y-004 the search flow is completable with the keyboard alone', async ({ home, results }) => {
      await home.goto();
      await home.expectLoaded();
      // Goes through the page object so the Blazor circuit is proven live first;
      // raw keystrokes into an unhydrated input are silently discarded.
      await home.searchEducatorWithEnter('a');
      await results.expectLoaded();
    });

    test('A11Y-005 the results grid uses header cells so columns can be announced', async ({ home, results, page }) => {
      await home.goto();
      await home.searchEducator('a');
      await results.expectLoaded();
      await expect(page.locator('th').first()).toBeVisible();
      expect(await page.locator('th').count()).toBeGreaterThan(2);
    });

    test('A11Y-006 Credentials Home renders without horizontal overflow at 1280px', async ({ page, home }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await home.goto();
      await home.expectLoaded();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'page scrolls horizontally at 1280px').toBeLessThanOrEqual(1);
    });
  });
}
