/**
 * Absolute COS2 URL for an app path such as '/admin'.
 *
 * The tests drive a browser they attach to rather than one Playwright created, and such
 * a browser ignores the `baseURL` in playwright.config.ts - so a relative page.goto('/')
 * fails with "Cannot navigate to invalid URL". Every direct navigation goes through this.
 */
const BASE_URL = process.env.BASE_URL ?? 'https://credentialsonlinesystemdev.azurewebsites.net/';

export function appUrl(path: string): string {
  return new URL(path, BASE_URL).href;
}
