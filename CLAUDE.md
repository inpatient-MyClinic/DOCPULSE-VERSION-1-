# Working on DocPules

- **Before any change ships, run the whole test suite:** `cd tests && node run.js`.
  Nothing is delivered with a failing test.
- **Every bug fixed gets a test** in `tests/cases/` (listed in `tests/tests.js`)
  that fails on the broken version and passes on the fix.
- A change that is meant to change numbers or output: check the diff, then
  `node run.js --update NAME`, and say so when delivering.
- Don't change counting logic without asking first.
- The test workbooks live in `tests/fixtures/` (not committed while the repo is public).
