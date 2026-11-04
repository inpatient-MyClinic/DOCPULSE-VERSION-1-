# Working on DocPules

- **Every change:** run the quick check plus the tests for the area touched:
  `cd tests && node run.js --quick <area names>` (about 1–3 minutes).
  The quick check covers every doctor's numbers in every counting mode and
  the counting rules, so a change that moves a number anywhere is caught.
- **The whole suite** (`node run.js`, ~15 minutes) when a change touches shared
  code (the count, saving/sync, page drawing) or before a big release.
- **Every bug fixed gets a test** in `tests/cases/` (listed in `tests/tests.js`)
  that fails on the broken version and passes on the fix.
- A change that is meant to change numbers or output: check the diff, then
  `node run.js --update NAME`, and say so when delivering.
- Don't change counting logic without asking first.
- The test workbooks live in `tests/fixtures/` (not committed while the repo is public).
