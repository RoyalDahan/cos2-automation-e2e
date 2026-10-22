# COS2 End-to-End Test Framework

Playwright regression suite for the LACOE **Credential Online System (COS2)**, run against the
live DEV environment at `https://credentialsonlinesystemdev.azurewebsites.net/`.

The suite is organised by **user role**. There are three regression runs, one per role, and each
can be executed on its own.

| Role | What it is | Tests | Run it with |
|---|---|---:|---|
| **Admin** | Credential Online user — full rights, including the Admin area | **43** | `Admin.bat` |
| **Update** | Can maintain data, but must not reach the Admin area | **40** | `Update.bat` |
| **View** | Read-only — must not edit and must not reach the Admin area | **41** | `View.bat` |
| | **Total** | **124** | |

---

## Quick start

Double-click one of the batch files in the project root:

```
Admin.bat        run the Admin regression, headed
Update.bat       run the Update regression, headed
View.bat         run the View-only regression, headed
```

Each accepts a mode:

```
Admin.bat              headed — a visible Edge window you can watch     (default)
Admin.bat headless     no visible browser, fastest
Admin.bat debug        step through with the Playwright Inspector
Admin.bat ui           open the Playwright UI runner
```

The same three runs from a terminal:

```powershell
npx playwright test --project=admin
npx playwright test --project=update
npx playwright test --project=view

npx playwright test                       # all three, one after another
npx playwright test --project=view --grep @negative
npx playwright test --project=admin --grep "SRCH-001"
```

---

## The first run signs you in. Later runs do not.

**On the first run for a role**, a real Edge window opens and the suite drives the LACOE
District Portal sign-in for you:

```
🤖 Signing in as the Admin (Credential Online user)...
   ✓ ticked "I agree to the following"
   ✓ clicked Log In
   ✓ chose Azure Active Directory
   ✓ picked the cp-dahan_david@lacoe.edu account
   ✓ opened Credential Online System
✓ Signed in. This profile is saved - the next run skips all of this.
```

If Entra ID asks for phone approval, the run pauses and prints **`📱 YOUR TURN`**. Approve it on
your phone; everything after that is automatic. You have three minutes
(raise `LOGIN_WAIT_MS` in `.env` if you need longer).

**Every run after that** prints `✓ Already signed in` and goes straight to the tests.

### How the sign-in is remembered

Each role has its own **Edge profile directory on disk**:

```
.auth/profile-admin
.auth/profile-update
.auth/profile-view
```

The suite launches Edge with `launchPersistentContext` against that folder, which is exactly
what makes your normal browser remember you. Playwright's default is a throwaway profile — a
brand-new empty browser every run — which is why sign-in used to be demanded every single time.

Two consequences worth knowing:

- **Closing the browser at the end of a run costs you nothing.** The session lives in the profile
  folder, just like closing and reopening real Edge.
- **Roles never share a profile.** A run therefore cannot silently execute as whoever signed in
  last, which would make every permission assertion meaningless.

To force a role to sign in again, delete its profile folder.

---

## How the tests are organised

Test **bodies** live once, in `src/suites/`. The role spec files only decide which suites apply.
A UI change is fixed in one place, not three.

```
src/suites/
  session.suite.ts          5 tests   sign-in, header, profile menu, logo-home
  search.suite.ts          13 tests   name / SSN / SEID search, negative + boundary
  educatorRecord.suite.ts   4 tests   opening a record, PII-safe URLs
  dataIntegrity.suite.ts    5 tests   format and uniqueness of what the grid renders
  accessibility.suite.ts    6 tests   language, title, labels, keyboard, headers, overflow
  adminModules.suite.ts     4 tests   the Admin area            (Admin only)
  permissions.suite.ts    4–6 tests   what each role may and may not do

tests/
  admin/admin-regression.spec.ts      composes all seven suites
  update/update-regression.spec.ts    all except adminModules
  view/view-regression.spec.ts        all except adminModules
```

A role spec is just composition:

```ts
const role = ROLES.update;

registerSessionSuite(role);
registerSearchSuite(role);
registerEducatorRecordSuite(role);
registerDataIntegritySuite(role);
registerAccessibilitySuite(role);
registerPermissionsSuite(role);
```

### Roles drive the permission tests

`src/roles/roles.ts` declares what each role may do:

```ts
admin:  { canAdmin: true,  canEdit: true  }
update: { canAdmin: false, canEdit: true  }
view:   { canAdmin: false, canEdit: false }
```

`permissions.suite.ts` selects cases from those flags, so each role automatically gets the
positive cases for what it may do and the **negative** cases for what it must not:

| Case | Admin | Update | View |
|---|:--:|:--:|:--:|
| PERM-001 may open the Admin area | ✅ | — | — |
| PERM-002 Admin refused on direct URL `/admin` @negative | — | ✅ | ✅ |
| PERM-003 Admin entry absent from the profile menu @negative | — | ✅ | ✅ |
| PERM-004 reaches the educator maintenance screen | ✅ | ✅ | — |
| PERM-005 maintenance screen offers an editable form | ✅ | ✅ | — |
| PERM-006 maintenance screen refused @negative | — | — | ✅ |
| PERM-007 direct URL to the editor refused @negative | — | — | ✅ |
| PERM-008 no edit control on an educator record @negative | — | — | ✅ |
| PERM-009 can still read what it is entitled to | ✅ | ✅ | ✅ |

Adding a fourth role later means declaring its capabilities — not writing a fourth copy of
these tests.

---

## The dashboard

`reports/dashboard.html` — the single place to see what the suite covers, what each test
proves, how to reproduce it by hand, and why anything failed.

It is **rewritten automatically after every run**, pass or fail, and **opens by itself** when a
batch file finishes. Regenerate it by hand with:

```powershell
npm run dashboard
```

### Every test has three buttons

| Button | What it opens |
|---|---|
| **Details** | The full explanation — what the test is for, why it matters, what it asserts — plus its suite, source `file:line` and role. |
| **Test case** | Numbered **manual reproduction steps**, so anyone can run the test by hand without reading code. Derived from the test body (including its `beforeEach` setup), so the steps cannot drift from what the automation actually does. |
| **Error** | Why it failed: **Expected** vs **Actual**, the locator involved, the raw Playwright message, and the **screenshot** taken at the moment of failure. Disabled when the test did not fail in the last run. |

A real example — `DI-005`, which is currently failing:

> **Test case**
> 1. Sign in to COS2 as the Admin (Credential Online user).
> 2. Open Credentials Home (the application root URL).
> 3. Type `a` into the educator search box ("Name, SSN, SEID") and click the magnifier.
> 4. Confirm the results grid is shown and the address contains /search.
> 5. Read every value in the seid column.
> 6. Confirm: SEIDs shared by more than one educator.
>
> **Error** — Expected `Array []`, Actual `Array [ "1234567890" ]`, plus the screenshot.

### Filters

Free-text search, plus role, page object, tag, your status, and last-run result. Selecting
`view` shows only that role's 39; `SearchResultsPage` shows only tests that touch it;
`@negative` shows only the negative cases.

### Two status columns, deliberately

- **Last run** — written by the suite. Read-only.
- **Status** — yours: `NO RUN` / `PASS` / `FAILED` / `IN PROGRESS`. Use `IN PROGRESS` for a test
  whose script still needs work.

Your statuses are stored in the browser's `localStorage`, **so regenerating after a run never
wipes what you set by hand.** *Adopt last run* bulk-copies run outcomes into your column for
whatever rows are currently filtered; *Reset my statuses* clears them.

### Where the content comes from

| Shown | Source |
|---|---|
| Which tests exist, per role | Playwright `--list`. Suites register cases conditionally per role, so counting the source would credit every role with every case. |
| Description | `src/suites/testDocs.js`, keyed by case id — **edit descriptions there**. |
| Manual steps | Derived from the test body, unless `testDocs.js` supplies a `steps` override. |
| Tags, page objects, `file:line` | Parsed from the spec sources. |
| Last run, errors, screenshots | `reports/json/results.json` from the run. |

To improve a description, edit `src/suites/testDocs.js` and run `npm run dashboard`. No test
needs to change.

---

## Two app behaviours the framework has to handle

**Blazor Server prerendering.** The header is server-rendered and is visible *and typeable*
before its SignalR circuit attaches. Anything typed in that window is silently discarded and the
DOM reverted on the next render — a `fill()` followed by a click looks perfect and does nothing.
`CredentialsHomePage.enterTerm()` therefore fills until the value **survives a round-trip**,
which is the only reliable signal the component has gone interactive. Always search through the
page object; never type into the box directly.

**Client-side routing.** Blazor changes the URL without a page load, so `waitForURL` with its
default wait-for-`load` never resolves. Assert with `expect.poll(() => page.url())` or on
rendered content instead.

---

## Configuration

`.env` in the project root:

```ini
BASE_URL=https://credentialsonlinesystemdev.azurewebsites.net/
PORTAL_URL=https://districtbusinessportaldev.lacoe.edu/

COS_ADMIN_USER=cp-dahan_david@lacoe.edu
COS_UPDATE_USER=
COS_VIEW_USER=

LOGIN_WAIT_MS=180000
```

### Running the other two roles with one account

Three separate accounts do not exist yet, and they are not required. `COS_UPDATE_USER` and
`COS_VIEW_USER` fall back to `COS_ADMIN_USER`, so the workflow is:

1. Change your account's role in the District Portal (for example to Update).
2. Run the matching batch file — `Update.bat`.
3. Sign in once for that role; its profile is saved separately from the others.

The profile directories stay separate regardless of the account used, so a session left over
from a previous role can never leak into the next run. If you switch your account's role again,
delete that role's profile folder (`.auth/profile-update`) so the next run signs in fresh.

Set `COS_UPDATE_USER` / `COS_VIEW_USER` only once real per-role accounts exist.

---

## Project layout

```
Admin.bat  Update.bat  View.bat      one per role
playwright.config.ts                 one project per role
.env                                 URLs, accounts, timeouts

src/
  roles/roles.ts                     role definitions and capabilities
  suites/                            every test body, written once
  pages/                             page objects
  fixtures/cos.fixture.ts            role-aware fixtures, persistent Edge profile
  auth/liveLogin.ts                  portal sign-in automation
  data/testData.ts                   the DEV roster
  utils/                             format validators, PII helpers

scripts/
  generate-dashboard.js              builds reports/dashboard.html
  dashboard-reporter.js              runs it after every test run

reports/
  dashboard.html                     the test inventory
  html/                              Playwright's own report
  junit/ json/                       CI-consumable results
  artifacts/                         screenshots and traces from failures

.auth/profile-admin|update|view      Edge profiles — these are what remember your sign-in
```

---

## Reports

```powershell
npx playwright show-report reports/html        # Playwright's report, with traces
npm run dashboard                              # rebuild the inventory dashboard
```

A failing test leaves a screenshot and a trace in `reports/artifacts/`. Open a trace with:

```powershell
npx playwright show-trace reports/artifacts/<folder>/trace.zip
```

---

## Open findings against DEV

Current Admin run: **39 passed, 2 failed**. Both failures are real, and both are left failing
on purpose rather than skipped:

- **DI-005** — `TAMAYO TORRES, LEONARDO` and `JONES, MARY` share SEID `1234567890`. If SEID is
  the unique educator key, this breaks every identifier-based lookup. (`MARQUEZ, JANIS` has no
  SEID at all, which the suite treats as valid.)
- **ADM-003** — the **Admin** entry in the profile menu does not navigate. `/admin` works when
  typed directly and the menu entry is visible, so the route and the permission are fine; the
  click handler is not.

Not yet covered, because DEV has no data or screen for them: credential documents, the Credential
Summary screen, educator status, and the retired / Sub-708 fields. The `testid-contract.md`
page objects for those screens are kept in `src/pages/` ready for when they land.

Note also that the shipped testids differ from `docs/testid-contract.md`
(`header-search-credentials`, not `educator-search-input`), and the results grid has **no
per-cell testids**, so cells are addressed by column position — brittle if column order changes.
Worth reconciling with the dev team.
