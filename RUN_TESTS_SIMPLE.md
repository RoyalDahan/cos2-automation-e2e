# How to Run Tests - Simple Version

## Setup (One Time)

1. Open VS Code
2. Install "Playwright Test for VSCode" extension
   - Click Extensions (Ctrl+Shift+X)
   - Search "Playwright Test for VSCode"
   - Click Install

## Running Tests

### First Test (With Login)

1. Click **Test icon** (flask) in left sidebar
2. Click **▶ play button** next to any test (e.g., SRCH-001)
3. **Edge browser opens** automatically
4. You'll see this message:
   ```
   ⏳ WAITING FOR YOU TO LOG IN
   
   A browser window is open.
   Please log in with your credentials:
     Username: cp-dahan_david@lacoe.edu
     Complete the phone MFA scan
   ```

5. **In the Edge browser:**
   - Click "Log in"
   - Enter your email
   - Scan QR code with your phone
   - Complete MFA
   - Wait for redirect to home page

6. **When you see the home page (with search boxes and your avatar):**
   - The test automatically detects you're logged in
   - Test starts running
   - You can watch it in the browser

### Second Test (No Login Needed!)

1. **Edge browser is STILL OPEN** with your login
2. Click ▶ next to another test (e.g., SRCH-002)
3. Test runs immediately
   - No login needed
   - Browser already has your session
   - Test navigates to home and runs

### Run All Tests in a File

1. Click ▶ next to "search" folder
2. All tests run one after another
3. You only log in ONCE (on the first test)
4. All others use that same login

## What to Watch For

✓ **Browser opens** - Edge starts automatically
✓ **First test shows login message** - You have 3 minutes to log in
✓ **You log in** - Complete MFA in the browser
✓ **Avatar appears** - Test detects login, starts running
✓ **Browser STAYS OPEN** - For next test
✓ **Second test runs immediately** - No login needed

## Common Issues

**Browser closed?**
- Just click ▶ again
- Edge will reopen (may need to log in again)

**Test times out waiting for login?**
- Make sure you actually clicked "Log in" in the browser
- Make sure you completed the phone MFA scan
- Check that you're on the home page (not still on login)

**Tests are running too fast, I can't see what's happening?**
- The browser is open, you can watch
- Check the terminal output for details
- Slow down by looking at the HTML report: `npx playwright show-report reports\html`

## Tips

- **Run one test at a time** while developing
- **Watch the Edge browser** to see what's being tested
- **Keep Edge open** between tests - no re-login needed
- **Close Edge manually** when completely done testing

---

**That's it! Just click ▶ and let it work.**
