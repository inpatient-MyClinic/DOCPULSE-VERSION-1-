# DocPules tests

Every bug that has been fixed has a test here, so it cannot come back unnoticed.
**Run the whole suite before every change is shipped, and add a test with every fix.**

## Run them

```bash
cd tests
npm install                     # once: jsdom + playwright-core
npx playwright install chromium # once, if you have no Chromium (or set CHROME_PATH)
node run.js                     # everything (about 15–25 minutes)
node run.js ot live             # only tests whose name contains "ot" or "live"
node run.js -j 3                # three at a time
```

Each test starts its own fresh server and empty database on a free port,
signs in, uploads the workbooks it needs, runs, and is torn down. Nothing
touches your real data.

## When does a test fail?

- it prints a `✗` (a named check that did not hold)
- the page threw an error (`errors [...]` not empty)
- it crashed or ran past its time limit
- what it prints differs from the accepted copy in `fixtures/golden/<name>.txt`
- the numbers it captures differ from `fixtures/golden/<name>.json`
  (every doctor, every month — Sessions, Closed, Opened, Total, breakdown, paid)

Timings, clock times and dates are ignored when comparing.

## A change that is *meant* to change the output

Look at the diff the runner prints. If the new output is right, accept it:

```bash
node run.js --update NAME
```

## Adding a test for a bug

1. Write `cases/<short-name>.js`. Start with `const T=require('../lib/ctx');`
   - `T.base`, `T.login(page)`, `T.chrome` for a browser test (Playwright)
   - `require('../lib/srv')(T.cookie)` for a fast in-process test (jsdom)
   - `T.check('what should be true', condition, detail)` for each fact
   - `T.noErrors(errors)`, then `T.done()` at the end
2. Add it to `tests.js` (choose the workbooks it needs).
3. Run it against the **broken** version first: it must fail. Then against the fix: it must pass.

## The workbooks (`fixtures/`)

The tests read real master-schedule and capacity workbooks. They hold staff
names and schedules, so **`fixtures/` is not committed** while this repository
is public. Keep a copy somewhere safe and put these files in `tests/fixtures/`:

| file | used for |
|---|---|
| `back.xlsx` | master schedule (default for every test) |
| `back-new.xlsx`, `back-new2.xlsx`, `back-odd.xlsx` | changed / odd master schedules |
| `cap-banjar.xlsx` | capacity log (default) |
| `cap-hyb.xlsx` | capacity log with hybrid doctors |
| `cap-big.xlsx` | 6,000-row capacity log (speed) |
| `bill-big.xlsx` | Telemedicine billing (large file) |
| `fin.xlsx`, `fin2.xlsx` | finance |
| `golden/` | the accepted outputs and numbers |

If the repository is made private, remove `tests/fixtures/` from `.gitignore`
and commit them, so the suite works anywhere.
