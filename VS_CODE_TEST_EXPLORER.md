# Running Tests with VS Code Test Explorer

## Setup

1. Open the project in VS Code
2. Make sure you have the **Playwright Test for VSCode** extension installed
   - In VS Code: Click Extensions (Ctrl+Shift+X)
   - Search for "Playwright Test for VSCode"
   - Install it

## Running Tests from Test Explorer

### Open the Test Explorer
1. Click the **Test** icon in the left sidebar (flask icon)
2. You'll see all test files and tests listed

### Run Individual Tests (RECOMMENDED)

1. Find the test you want (e.g., "SRCH-001 search by exact last name")
2. Click the **▶ Play button** next to it
3. A browser will open
4. **If it's the first test**: Log in when prompted (see instructions below)
5. Test runs automatically
6. **Browser stays open** between tests - you can run another test without re-logging in

### Run All Tests in a File

1. Click the ▶ button next to a test file (e.g., "search")
2. All tests in that file run one after another
3. You only log in once (on the first test)
4. Browser reuses your login for all subsequent tests

### Run All Tests

1. Click the ▶ button next to "tests" folder
2. All tests run

## If You Need to Log In

When the first test runs, you'll see this message:

```
========================================
⏳ WAITING FOR YOU TO LOG IN
========================================

A browser window is open.
Please log in with your credentials:
  Username: cp-dahan_david@lacoe.edu
  Complete the phone MFA scan

Tests will start automatically once you reach the home page.

Waiting... (up to 3 minutes)
```

**What to do:**
1. The browser window is already open
2. Log in with your Lacoe email
3. When asked, scan the QR code with your phone
4. Tests will start automatically once you're on the home page
5. **Do NOT close the browser** - keep it open

## After Login (Subsequent Tests)

- The browser already has you logged in
- No need to log in again
- Each test just navigates to the home page and runs
- You can run test after test without delays

## Live Mode vs Mock Mode

### Live Mode (Default)
- Tests run against: https://credentialsonlinesystemdev.azurewebsites.net/
- Browser opens visibly
- You see what's happening
- Login required first time only

### Mock Mode
- To switch: Open terminal and set: `$env:TEST_TARGET = "mock"`
- Tests run against: Local test server (faster, no login needed)

## Troubleshooting

**Tests won't start?**
- Make sure the browser window is visible and ready
- Check the terminal output for error messages

**Browser closed unexpectedly?**
- Run the test again - the browser will reopen

**Tests are slow?**
- Live mode is slower due to real API calls
- Try mock mode for faster testing: `$env:TEST_TARGET = "mock"`

**Need to log in again?**
- Close the browser manually if needed
- Run a test - it will open a fresh browser
- Log in when prompted

## Tips

- Run tests one at a time while developing
- Use "Run All" when you want to verify everything works
- Watch the browser to see exactly what the app is doing
- Check the terminal output for detailed logs
