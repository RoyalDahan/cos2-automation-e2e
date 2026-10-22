# Run Tests from Terminal - Quick Start

## One-Time Setup

Make sure you can run PowerShell scripts. In PowerShell as Admin:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## How to Run Tests

### Open PowerShell

Go to project folder:
```powershell
cd C:\Lacoe\cos2-automation-e2e
```

### Run All Search Tests

```powershell
$env:TEST_TARGET = "live"
npm test -- tests/search/search.spec.ts --workers=1
```

### Run One Test

```powershell
$env:TEST_TARGET = "live"
npm test -- tests/search/search.spec.ts -g "SRCH-001" --workers=1
```

### Run a Specific Group

```powershell
$env:TEST_TARGET = "live"
npm test -- tests/search/search.spec.ts -g "@smoke" --workers=1
```

## What Happens

1. **Edge opens** - a visible browser window
2. **Navigates to COS2** - the app loads
3. **Checks for login:**
   - If already logged in → tests start immediately
   - If NOT logged in → shows message and waits

4. **When asked to log in:**
   ```
   ========================================
   ⏳ WAITING FOR YOUR LOGIN
   ========================================
   
   Edge browser is open.
   
   Please log in with:
     Email: cp-dahan_david@lacoe.edu
     Complete phone MFA
     Click on "Credential Online System"
   
   Test will auto-start when you're on the home page.
   (Waiting up to 3 minutes...)
   ```

5. **You log in** - in the Edge browser
6. **Test auto-starts** - once avatar is detected
7. **Edge stays open** - for the next test

### Run Next Test (Same Browser)

```powershell
npm test -- tests/search/search.spec.ts -g "SRCH-002" --workers=1
```

- Edge is still open
- Already logged in
- Test runs immediately

## Stop a Test

Press **Ctrl+C** in PowerShell

## View Results

After tests complete:
```powershell
npx playwright show-report reports\html
```

## Tips

- **First test:** Takes longer (login required)
- **Subsequent tests:** Fast (already logged in)
- **Keep Edge open:** Between test runs
- **Don't close Edge:** Until all testing is done
- **Close Edge manually:** After you're done with all tests

## Examples

**Run one test by name:**
```powershell
$env:TEST_TARGET = "live"
npm test -- tests/search/search.spec.ts -g "SRCH-001"
```

**Run all search tests:**
```powershell
$env:TEST_TARGET = "live"
npm test -- tests/search/search.spec.ts
```

**Run tests with better output:**
```powershell
$env:TEST_TARGET = "live"
npm test -- tests/search/search.spec.ts --reporter=list
```

That's it! Simple terminal commands, Edge browser stays open.
