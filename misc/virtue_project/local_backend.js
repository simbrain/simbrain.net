// Local test mode: runs backend.txt (the real Apps Script code) in the browser
// against a fake spreadsheet kept in localStorage. Used only when API_URL in
// app.js is empty or the page has ?local=1. Also loaded by the Node tests.

function makeFakeGoogle(storage) {
  const KEY = 'vp_local_sheets';
  const load = () => JSON.parse(storage.getItem(KEY) || '{}');
  const save = (db) => storage.setItem(KEY, JSON.stringify(db));

  // Mimic Sheets: a leading apostrophe means literal text; Dates stay Dates.
  const toCell = (v) => (v instanceof Date ? { date: v.toISOString() }
    : typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);
  const fromCell = (v) => (v && typeof v === 'object' && v.date ? new Date(v.date) : v);

  function sheetObj(name) {
    return {
      getLastRow: () => (load()[name] || []).length,
      appendRow(row) {
        const db = load();
        db[name] = db[name] || [];
        db[name].push(row.map(toCell));
        save(db);
      },
      setFrozenRows() {},
      getDataRange: () => ({ getValues: () => (load()[name] || []).map((r) => r.map(fromCell)) }),
    };
  }

  return {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => (n in load() ? sheetObj(n) : null),
        insertSheet(n) { const db = load(); db[n] = []; save(db); return sheetObj(n); },
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => Math.random().toString(16).slice(2) + Date.now().toString(16) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }),
    },
  };
}

// Build a call(request) -> response function from the backend source text.
function makeLocalBackend(source, storage) {
  const g = makeFakeGoogle(storage);
  const mod = new Function('SpreadsheetApp', 'LockService', 'Utilities', 'ContentService',
    source + '\nreturn { setup, doPost, doGet };')(g.SpreadsheetApp, g.LockService, g.Utilities, g.ContentService);
  mod.setup();
  return (req) => JSON.parse(mod.doPost({ postData: { contents: JSON.stringify(req) } }).content);
}

if (typeof module !== 'undefined') module.exports = { makeLocalBackend };
