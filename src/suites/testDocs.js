/**
 * Long-form documentation for each test case, keyed by case id.
 *
 * The dashboard's "Details" panel reads this. Kept beside the suites rather than inside
 * them so a description can be improved without touching a passing test, and so there is
 * exactly one place to look when someone asks "what does SRCH-006 actually prove?".
 *
 * `steps` is optional. Leave it out and the dashboard derives the manual steps from the
 * test body, which stays in sync automatically. Supply it only where the derived version
 * would be misleading.
 */

/**
 * @typedef {object} TestDoc
 * @property {string}    description  What the test is for, why it matters, what it asserts.
 * @property {string[]} [steps]       Manual reproduction steps; omit to derive them.
 */

/** @type {Record<string, TestDoc>} */
const TEST_DOCS = {
  // ---- Session -------------------------------------------------------------------
  'SESS-001': {
    description:
      'Gate test for the whole run. Proves the District Portal SSO handoff completed, COS2 served the application rather than a sign-in redirect, and the Blazor circuit went live. If this fails, no other result in the run is trustworthy, so treat every other failure as unexplained until this passes.',
  },
  'SESS-002': {
    description:
      'Confirms the run is executing as the role it claims to be. Without this, a profile that silently signed in as the wrong account would still pass every permission test, because the permission tests would simply be measuring the wrong user. This is the guard that makes the rest of the suite mean anything.',
  },
  'SESS-003': {
    description:
      'The profile dropdown must open on click and expose Help and Logout. Also covers the toggle behaviour of the Radzen menu wrapper, which collapses again if clicked twice.',
  },
  'SESS-004': {
    description:
      'The Credentials logo is the app-wide escape hatch back to Home. Verifies it works from a results page, and that the results grid is actually torn down rather than left on screen under a Home URL.',
  },
  'SESS-005': {
    description:
      'An authenticated session must survive direct navigation, not just in-app clicks. Asserts the app is served and the user is not bounced to the portal or a sign-in page — the failure mode when a session cookie is scoped too narrowly.',
  },

  // ---- Search --------------------------------------------------------------------
  'SRCH-001': {
    description:
      'The core search path. An exact surname must return every educator holding it. On the DEV roster no surname is shared, so the expected result is exactly one row; this count changes when real data lands.',
  },
  'SRCH-002': {
    description:
      'Partial-name matching. Operators rarely know the full spelling, so a prefix must match. Guards against a regression to exact-only matching.',
  },
  'SRCH-003': {
    description:
      'A broad term must return the full roster, confirming search is not silently capping or paging results. Asserts against the known DEV roster size of 5.',
  },
  'SRCH-004': {
    description:
      'By design, a full SSN is a unique identifier, so the app skips the results grid and opens that educator record directly. Asserts the URL lands on /educator/<id>. Also confirms the unformatted SSN form is accepted, not just the dashed display form.',
  },
  'SRCH-005': {
    description:
      'Same single-match routing as SRCH-004 but entered by SEID. Validates the SEID is well formed (10 digits) before searching, so a malformed fixture fails loudly rather than producing a confusing no-match.',
  },
  'SRCH-006': {
    description:
      'Required behaviour: an identifier search that matches nothing drops the operator straight into educator creation rather than a dead-end "no results" page. Asserts the URL routes to the educator maintenance screen.',
  },
  'SRCH-007': {
    description:
      'The magnifier and the Enter key must be interchangeable. A keyboard-only operator must not be forced to reach for the mouse to submit.',
  },
  'SRCH-008': {
    description:
      'Negative case. A name with no match must return an empty grid rather than erroring, hanging, or falling back to returning everything.',
  },
  'SRCH-009': {
    description:
      'Negative case. A blank search must not be treated as "match everything" — returning the whole database on an accidental Enter is both a performance and a privacy problem.',
  },
  'SRCH-010': {
    description:
      'Security-adjacent negative case. Submits SQL and script metacharacters and asserts the app neither errors nor executes the payload: no results, and the page title is intact rather than replaced by a server error page.',
  },
  'SRCH-011': {
    description:
      'The results grid must expose Name, SSN and SEID. Searched by name on purpose, because a unique identifier would open the record instead of rendering the grid. Cells are located by column position: the shipped grid has no per-cell testids.',
  },
  'SRCH-012': {
    description:
      'The "N Educators Found" count must agree with the number of rows actually rendered. A count that disagrees with the grid is how paging and filtering bugs reach production unnoticed.',
  },
  'SRCH-013': {
    description:
      'Back must return from results to Credentials Home with a usable search box, rather than leaving the operator on a stale grid or at a dead URL.',
  },

  // ---- Educator record -----------------------------------------------------------
  'REC-001': {
    description:
      'The View button on a result row must open that educator record. This is the primary navigation path from search into a record.',
  },
  'REC-002': {
    description:
      'Privacy control. The record must be keyed by an internal id, never by SSN. An SSN in a URL is written to browser history, proxy logs, server access logs and Referer headers — masking it on screen while placing it in the address bar accomplishes nothing. Asserts neither the plain nor the dashed SSN appears in the URL.',
  },
  'REC-003': {
    description:
      'The record opened must be the educator that was asked for, not merely some record. Checks both page text and input values, because the record is a form and the name is held in field values rather than visible text.',
  },
  'REC-004': {
    description:
      'The header search box must remain available from inside a record, so the operator is always one action away from the next lookup rather than having to navigate back first.',
  },

  // ---- Data integrity ------------------------------------------------------------
  'DI-001': {
    description:
      'Every SEID rendered in the grid must be exactly 10 digits. Blank is accepted because one DEV educator genuinely holds no SEID; a malformed value is not. Catches truncation and numeric-formatting regressions in the grid binding.',
  },
  'DI-002': {
    description:
      'Every SSN in the results grid must render masked, as ***-**-NNNN, until someone clicks it. A full number here means the masking was bypassed; a different shape usually means the value reached the grid unformatted from the data layer.',
  },
  'DI-003': {
    description:
      'Every birth date rendered must be MM/DD/YYYY. Guards against locale-dependent formatting, which silently turns 04/08 into 08/04 for half the audience.',
  },
  'DI-004': {
    description:
      'No row may render an empty name. A nameless row means the grid bound to the wrong field — a failure mode seen in grids keyed off a nullable column.',
  },
  'DI-005': {
    description:
      'SEID is the unique educator key, so no two educators may share one. A duplicate breaks every identifier-based lookup: searching that SEID cannot deterministically resolve to a single record. Currently failing on DEV, where two educators share 1234567890.',
  },

  // ---- Accessibility -------------------------------------------------------------
  'A11Y-001': {
    description:
      'The page must declare a language on <html>. Screen readers select pronunciation rules from it; without it, content is announced with the wrong phonetics. A baseline WCAG requirement for a public agency.',
  },
  'A11Y-002': {
    description:
      'The document must have a non-empty title. Screen readers announce it on navigation, and it is what distinguishes tabs and history entries.',
  },
  'A11Y-003': {
    description:
      'Every search input must carry an accessible name via aria-label, title or placeholder. Note that placeholder alone is a weak accessible name — it disappears once the field has content — so this is a floor, not a target.',
  },
  'A11Y-004': {
    description:
      'The search flow must be completable without a mouse. Submits with the Enter key and confirms results render. Routed through the page object so the Blazor circuit is proven live first — raw keystrokes into an unhydrated input are silently discarded and would produce a misleading failure.',
  },
  'A11Y-005': {
    description:
      'The results grid must use real header cells so a screen reader can announce which column a value belongs to. Without <th> elements a grid is an unnavigable wall of numbers.',
  },
  'A11Y-006': {
    description:
      'Credentials Home must not scroll horizontally at 1280px, a standard laptop width. Horizontal overflow signals a fixed-width element and usually means content is unreachable at smaller sizes.',
  },

  // ---- Admin modules -------------------------------------------------------------
  'ADM-001': {
    description:
      'The Admin role must be able to reach the Admin area by direct URL. Paired with PERM-002, which asserts the same URL is refused for the other two roles — together they prove the route is permission-gated rather than merely hidden.',
  },
  'ADM-002': {
    description:
      'The Admin entry must be offered in the profile menu. The route being open is not sufficient: the role must also be able to discover it without typing a URL.',
  },
  'ADM-003': {
    description:
      'Clicking the Admin entry must navigate to the Admin area. Distinct from ADM-002, which only proves the entry is visible. Currently failing on DEV: the entry renders and /admin works when typed directly, so the route and the permission are both fine — the click handler is not.',
  },
  'ADM-004': {
    description:
      'The Admin area must render actual maintenance content, not an empty shell. Guards the case where the route resolves and authorisation passes but the module list fails to bind, which looks like a blank page rather than an error.',
  },

  // ---- Permissions ---------------------------------------------------------------
  'PERM-001': {
    description:
      'Positive control for the Admin role: it may open the Admin area. Without this, the negative cases for the other roles could pass simply because the Admin area is broken for everyone.',
  },
  'PERM-002': {
    description:
      'Negative case, high severity. A role without admin rights must be refused at /admin even when the URL is typed by hand. Hiding the menu entry is a usability choice; refusing the request is the actual control. A failure here is a privilege-escalation finding, not a UI bug.',
  },
  'PERM-003': {
    description:
      'The Admin entry must be absent from the profile menu for roles without admin rights — absent, not disabled. A disabled control still advertises that the capability exists and is worth probing.',
  },
  'PERM-004': {
    description:
      'Positive control for edit-capable roles: the educator maintenance screen is reachable. Uses the create-on-no-match route, which is the cheapest way to reach a maintenance surface without mutating an existing record.',
  },
  'PERM-005': {
    description:
      'Reaching the maintenance screen is not enough — it must actually offer editable controls. Guards the case where an edit-capable role is served a read-only rendering of the form.',
  },
  'PERM-006': {
    description:
      'Negative case. A view-only role must not reach an editor, including via the create-on-no-match route that edit-capable roles use. Asserts the URL does not land on the editor.',
  },
  'PERM-007': {
    description:
      'Negative case, high severity. A view-only role typing the editor URL directly must be refused — either redirected away or shown an authorisation message. This is the server-side control, as distinct from the hidden-navigation control in PERM-006.',
  },
  'PERM-008': {
    description:
      'Negative case. No edit, save, add-document or delete control may be offered to a view-only role on an educator record. Asserts absence rather than disabled state, for the same reason as PERM-003.',
  },
  'PERM-009': {
    description:
      'The counterweight to every negative case above. Restricting write access must not quietly break read access — a role locked out of everything would pass all the negative tests while being useless.',
  },

  // ---- SSN masking ---------------------------------------------------------------
  'SSN-001': {
    description:
      'Admin and Update users see every SSN masked as ***-**-NNNN. Clicking it on the search results grid must show the full NNN-NN-NNNN number, and clicking again must mask it. Uses DARKEL, NATALIE (223-45-5678).',
  },
  'SSN-002': {
    description:
      'The same reveal-and-hide check on the educator record screen: masked by default, full number after one click, masked again after a second click.',
  },
  'SSN-003': {
    description:
      'A View-only user must see only the last four digits on the search results grid. Clicking the SSN must not reveal it, and the full number must not be anywhere in the page, including hidden elements and attributes. Expected to FAIL when this project runs with an account that has SSN reveal rights.',
  },
  'SSN-004': {
    description:
      'The same View-only check on the educator record screen: only the last four digits, no reveal on click, and the full number absent from the page.',
  },
};

module.exports = { TEST_DOCS };
