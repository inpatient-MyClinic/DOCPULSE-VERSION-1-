/* The test list. Every bug that gets fixed gets a test here, so it cannot come
   back unnoticed.

   name      the file in cases/ (without .js)
   master    master workbook uploaded before the test     (default back.xlsx)
   capacity  capacity workbook uploaded before the test   (default cap-banjar.xlsx)
   steps     run these cases first, on the same server (set-up)
   args      command-line arguments for the case
   golden    compare the printed output with fixtures/golden/<name>.txt (default true)
   snapshot  compare out/snapshot.json with fixtures/golden/<name>.json
   timeout   seconds (default 240)                                             */
module.exports = [
  /* ---- the numbers: every doctor, every month, in every counting mode ---- */
  { name: 'numbers-plain', args: ['plain'], snapshot: true, golden: false },
  { name: 'numbers-rules-holidays', args: ['rules'], snapshot: true, golden: false },
  { name: 'numbers-docpules-master', args: ['dpm', 'cfg'], snapshot: true, golden: false },
  { name: 'numbers-big-log', capacity: 'cap-big.xlsx', args: ['big'], snapshot: true, golden: false },
  { name: 'numbers-versions', steps: ['_setup-versions'], args: ['versions'], snapshot: true, golden: false, timeout: 300 },
  { name: 'unit-format' },

  /* ---- whole-page safety ---- */
  { name: 'stability-crawl', capacity: 'cap-hyb.xlsx', timeout: 420 },
  { name: 'perf-budget', capacity: 'cap-big.xlsx', golden: false, timeout: 300 },

  /* ---- live sync ---- */
  { name: 'live-two-browsers', golden: false },
  { name: 'live-upload-version-restart', golden: false, timeout: 300 },

  /* ---- fixed OT ---- */
  { name: 'ot-choice-counts' },
  { name: 'ot-fixed-total', golden: false },
  { name: 'ot-page-browser' },
  { name: 'ot-add-dialog' },
  { name: 'ot-add-focus' },
  { name: 'ot-month-check' },
  { name: 'card-close-paths', capacity: 'cap-big.xlsx', golden: false },

  /* ---- master schedule changes ---- */
  { name: 'change-panel-1' },
  { name: 'change-panel-2' },
  { name: 'change-panel-3' },
  { name: 'change-panel-4' },
  { name: 'change-panel-persist' },
  { name: 'parser-odd-1' },
  { name: 'parser-odd-2' },
  { name: 'notes-read' },
  { name: 'notes-confirm' },
  { name: 'versions-1' },
  { name: 'versions-2' },
  { name: 'versions-3' },
  { name: 'versions-4' },
  { name: 'time-labels' },

  /* ---- Pedia ---- */
  { name: 'pedia-save-versions' },
  { name: 'pedia-month' },
  { name: 'pedia-month-card' },
  { name: 'pedia-month-card-2' },

  /* ---- doctors, hybrid, filters ---- */
  { name: 'hybrid-list' },
  { name: 'hybrid-allowance', capacity: 'cap-hyb.xlsx' },
  { name: 'hybrid-allowance-edit', capacity: 'cap-hyb.xlsx' },
  { name: 'multiselect-master' },
  { name: 'multiselect-everywhere' },
  { name: 'doctors-filters' },
  { name: 'colours-kpi' },
  { name: 'rules-page' },
  { name: 'sidebar' },
  { name: 'fixes-cards' },

  /* ---- finance, telemedicine, files ---- */
  { name: 'finance-holidays' },
  { name: 'finance-columns' },
  { name: 'telemedicine' },
  { name: 'billing-big', golden: false, timeout: 300 },
  { name: 'upload-startup', golden: false },
  { name: 'reload-prompt' },
];
