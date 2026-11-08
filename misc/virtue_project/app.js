// Virtue Project pilot app.
//
// All data lives in a Google Sheet behind an Apps Script web app (backend.txt).
// The nickname is the login, so trails follow a person across devices.
//
// Saving is optimistic: new entries and trails show at once and are sent in
// the background, in order. Unsent items are kept in this browser until they
// reach the sheet, and retried.
//
// If API_URL is empty, or the page has ?local=1, the app runs in local test
// mode: backend.txt runs in the browser against a fake sheet in localStorage.

const API_URL = 'https://script.google.com/macros/s/AKfycbzYuMEf66bG6thuA1zt3hSbc3wpT0K-h78Xue2BWQ2YdCb3TSCw7E-Fxo2GZARKXEGKYw/exec';

const useLocal = !API_URL || new URLSearchParams(location.search).has('local');

// ---------- small helpers ----------

const $ = (sel) => document.querySelector(sel);

function remember(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) {
    return null;
  }
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

const trackById = (id) => TRACKS.find((t) => t.id === id);
const kindOf = (track, kindId) => track.kinds.find((k) => k.id === kindId) || { id: kindId, label: kindId };
const trackTitle = (t) => t.name + (t.subtitle ? ` (${t.subtitle})` : '');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return s;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------- theme ----------

let themeId = THEMES[remember('vp_theme')] ? remember('vp_theme') : 'trail';
const theme = () => THEMES[themeId];

function setTheme(id) {
  themeId = id;
  remember('vp_theme', id);
  document.body.dataset.theme = id;
  renderThemeBar();
  if (session) route();
}

function renderThemeBar() {
  $('#themes').replaceChildren(
    el('span', { class: 'small' }, 'Theme'),
    ...THEME_ORDER.map((id) => el('button', {
      class: id === themeId ? 'pill active' : 'pill',
      'aria-pressed': id === themeId,
      onclick: () => setTheme(id),
    }, THEMES[id].label)));
}

// Next milestone after n entries: a small one every CAMP_EVERY, a big one every PEAK_EVERY.
function progressInfo(n) {
  const th = theme();
  const next = Math.floor(n / CAMP_EVERY) * CAMP_EVERY + CAMP_EVERY;
  const bigNo = Math.ceil(next / PEAK_EVERY);
  const name = next % PEAK_EVERY === 0
    ? (bigNo === 1 ? th.big : `${th.bigN} ${bigNo}`)
    : `${th.small} ${(next % PEAK_EVERY) / CAMP_EVERY}`;
  return { name, left: next - n, frac: (n % CAMP_EVERY) / CAMP_EVERY };
}

function milestoneName(i) {
  const th = theme();
  return i % PEAK_EVERY === 0
    ? (i === PEAK_EVERY ? th.bigN : `${th.bigN} ${i / PEAK_EVERY}`)
    : `${th.small} ${(i % PEAK_EVERY) / CAMP_EVERY}`;
}

// ---------- talking to the backend ----------

let localCall = null;

async function call(action, payload = {}) {
  const req = { action, ...payload };
  let res;
  if (useLocal) {
    if (!localCall) {
      const src = await (await fetch('backend.txt')).text();
      localCall = makeLocalBackend(src, localStorage);
    }
    res = localCall(req);
  } else {
    try {
      // Plain-text POST avoids a CORS preflight, which Apps Script can't answer.
      const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(req) });
      res = await r.json();
    } catch (e) {
      const err = new Error("Couldn't reach the server. Check your connection and try again.");
      err.network = true;
      throw err;
    }
  }
  if (res.error) throw new Error(res.error);
  return res;
}

// ---------- background saving ----------
// ops: [{ action: 'startTrack', track } | { action: 'addEntry', entry }]

let ops = [];
let flushing = false;
let retryTimer = null;

const pendingKey = () => 'vp_pending:' + session.nickname.toLowerCase();
const savePending = () => remember(pendingKey(), ops.length ? JSON.stringify(ops) : null);

function loadPending() {
  try { ops = JSON.parse(remember(pendingKey()) || '[]'); } catch (e) { ops = []; }
  // show anything not yet on the server
  for (const op of ops) {
    if (op.action === 'startTrack' && !session.tracks.some((t) => t.track === op.track)) {
      session.tracks.push({ track: op.track, started: new Date().toISOString() });
    }
    if (op.action === 'addEntry' && !session.entries.some((e) => e.id === op.entry.id)) {
      session.entries.push(op.entry);
    }
  }
}

function enqueue(op) {
  ops.push(op);
  savePending();
  flush();
}

function setStatus(kind, text) {
  const s = $('#status');
  s.className = kind;
  s.replaceChildren(text || '');
  if (kind === 'retry') {
    s.append(' ', el('button', { class: 'link', onclick: flush }, 'Retry now'));
  }
  if (kind === 'saved') setTimeout(() => { if (s.className === 'saved') setStatus('', ''); }, 2000);
}

async function flush() {
  if (flushing || !session) return;
  clearTimeout(retryTimer);
  flushing = true;
  const who = session;
  while (ops.length && session === who) {
    setStatus('saving', 'Saving…');
    const op = ops[0];
    try {
      if (op.action === 'startTrack') {
        await call('startTrack', { nickname: who.nickname, track: op.track });
      } else {
        const { entry } = await call('addEntry', { nickname: who.nickname, entry: op.entry });
        Object.assign(op.entry, entry); // server's id and time
      }
      ops.shift();
      savePending();
    } catch (e) {
      if (e.network) {
        setStatus('retry', 'Not saved yet. Will retry.');
        retryTimer = setTimeout(flush, 20000);
        flushing = false;
        return;
      }
      // The server refused it; drop it so it doesn't block the rest.
      ops.shift();
      savePending();
      if (op.action === 'addEntry') who.entries = who.entries.filter((x) => x !== op.entry);
      setStatus('error', `Couldn't save: ${e.message}`);
      flushing = false;
      route();
      return;
    }
  }
  flushing = false;
  if (session === who) setStatus('saved', 'Saved');
}

window.addEventListener('online', flush);

// ---------- state and routing ----------
// Pages: #/  (home)   #/trail/<id>   #/trail/<id>/entries   #/trail/<id>/new

let session = null; // { nickname, tracks, entries }
let newestId = null; // entry just saved, for highlighting
let prevHash = null; // page shown before the current one
let formFrom = null; // page the entry form was opened from

function go(path, replace = false) {
  const hash = '#/' + path;
  if (location.hash === hash) route();
  else if (replace) { history.replaceState(null, '', hash); route(); }
  else location.hash = hash;
}

function route() {
  const from = prevHash;
  prevHash = location.hash;
  renderHeader();
  if (!session) return renderWelcome();
  const [page, id, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const t = page === 'trail' && trackById(id);
  if (t && session.tracks.some((x) => x.track === id)) {
    if (sub === 'new') { formFrom = from; return renderEntryForm(t); }
    return renderTrack(t, sub === 'entries' ? 'log' : 'picture');
  }
  renderHome();
}

window.addEventListener('hashchange', route);

function entriesFor(trackId) {
  return session.entries
    .filter((e) => e.track === trackId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function weekCount(entries) {
  const since = startOfWeek();
  return entries.filter((e) => new Date(e.timestamp) >= since).length;
}

// ---------- page pieces ----------

function show(...nodes) {
  $('#main').replaceChildren(...nodes);
  window.scrollTo(0, 0);
}

function crumbs(...items) {
  // items: [label, href] pairs; the last is the current page (no link)
  const nav = el('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' });
  items.forEach(([label, href], i) => {
    if (i > 0) nav.append(el('span', { class: 'sep', 'aria-hidden': true }, '›'));
    nav.append(i < items.length - 1 ? el('a', { href }, label) : el('span', { 'aria-current': 'page' }, label));
  });
  return nav;
}

function renderHeader() {
  const bar = $('#userbar');
  bar.replaceChildren();
  if (!session) return;
  bar.append(
    el('span', {}, session.nickname),
    el('button', { class: 'link', onclick: signOut }, 'Sign out'),
  );
}

function signOut() {
  if (ops.length && !confirm("Some entries haven't reached the server yet. They'll be sent next time you sign in on this device. Sign out anyway?")) return;
  remember('vp_nickname', null);
  session = null;
  ops = [];
  setStatus('', '');
  go('', true);
}

function weekLine(wk) {
  return el('span', { class: 'week-line' },
    `${wk} this week (goal: ${WEEKLY_GOAL} a week)`,
    el('span', { class: 'dots', 'aria-hidden': true },
      Array.from({ length: WEEKLY_GOAL }, (_, i) => el('span', { class: i < wk ? 'dot on' : 'dot' })),
      wk > WEEKLY_GOAL ? el('span', { class: 'extra' }, `+${wk - WEEKLY_GOAL}`) : null));
}

function progressBar(frac, label) {
  return el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100,
    'aria-valuenow': Math.round(frac * 100), 'aria-label': label },
    el('div', { class: 'bar-fill', style: `width: ${Math.round(frac * 100)}%` }));
}

// ---------- pages ----------

function renderWelcome(message = '') {
  const nick = el('input', {
    id: 'nick', name: 'nick', autocomplete: 'username', autocapitalize: 'none',
    required: true, maxlength: 40, placeholder: 'e.g. jeffy', value: remember('vp_last_nickname') || '',
  });
  const err = el('p', { class: 'error', role: 'alert' }, message);
  const buttons = [
    el('button', { type: 'submit', name: 'mode', value: 'login', class: 'primary' }, 'Log back in'),
    el('button', { type: 'submit', name: 'mode', value: 'register', class: 'secondary' }, "I'm new"),
  ];

  const form = el('form', { class: 'card', onsubmit: async (ev) => {
    ev.preventDefault();
    const mode = ev.submitter ? ev.submitter.value : 'login';
    buttons.forEach((b) => { b.disabled = true; });
    err.textContent = '';
    try {
      await signIn(mode, nick.value);
    } catch (e) {
      err.textContent = e.message;
      buttons.forEach((b) => { b.disabled = false; });
    }
  } },
    el('h2', {}, 'Welcome'),
    el('label', { for: 'nick' }, 'Nickname'),
    nick,
    el('p', { class: 'hint' },
      "Remember your nickname. It's how you log back in, on any device."),
    el('p', { class: 'notice' },
      "This sign-in isn't secure: there's no password, and the project team can see everything you enter. ",
      "Don't use your full name or a password as your nickname."),
    err,
    el('div', { class: 'row' }, buttons),
    useLocal ? el('p', { class: 'hint' }, 'Local test mode: data stays in this browser.') : null,
  );
  show(form);
  nick.focus();
}

async function signIn(mode, nickname) {
  session = await call(mode, { nickname });
  remember('vp_nickname', session.nickname);
  remember('vp_last_nickname', session.nickname);
  loadPending();
  route();
  flush();
}

function renderHome() {
  const th = theme();
  const started = TRACKS.filter((t) => session.tracks.some((x) => x.track === t.id));
  const unstarted = TRACKS.filter((t) => !started.includes(t));

  const cards = started.map((t) => {
    const entries = entriesFor(t.id);
    const n = entries.length;
    const p = progressInfo(n);
    return el('div', { class: 'track-card' },
      el('a', { class: 'track-card-main', href: `#/trail/${t.id}` },
        el('span', { class: 'mascot-big' }, t.mascot),
        el('span', { class: 'track-card-text' },
          el('strong', {}, trackTitle(t)),
          el('span', { class: 'small' }, `${plural(n, th.unit)} · ${p.left} to ${p.name}`),
          progressBar(p.frac, `${t.name}: ${p.left} ${th.unit}s to ${p.name}`),
          el('span', { class: 'small' }, weekLine(weekCount(entries))))),
      el('a', { class: 'button primary small-btn', href: `#/trail/${t.id}/new` }, 'Log'),
    );
  });

  const starters = unstarted.map((t) =>
    el('button', { class: 'track-card track-option', onclick: () => {
      session.tracks.push({ track: t.id, started: new Date().toISOString() });
      enqueue({ action: 'startTrack', track: t.id });
      go(`trail/${t.id}`);
    } },
      el('span', { class: 'mascot-big' }, t.mascot),
      el('span', { class: 'track-card-text' },
        el('strong', {}, trackTitle(t)),
        el('span', { class: 'small' }, t.goal)),
      el('span', { class: 'button secondary small-btn' }, 'Start')));

  show(el('section', {},
    started.length ? null : el('p', {}, 'Each virtue has its own mascot. Start as many as you like.'),
    el('div', { class: 'track-cards' }, cards, starters),
  ));
}

function renderTrack(t, view) {
  const th = theme();
  const entries = entriesFor(t.id);
  const base = `#/trail/${t.id}`;

  const viewToggle = el('div', { class: 'toggle' },
    [['picture', th.label, base], ['log', 'Log', `${base}/entries`]].map(([v, label, href]) =>
      el('a', {
        class: view === v ? 'active' : '',
        'aria-current': view === v ? 'page' : null,
        href,
        onclick: (ev) => { ev.preventDefault(); go(href.slice(2), true); },
      }, label)));

  show(
    crumbs(['Home', '#/'], [t.name, base]),
    el('section', {},
      el('div', { class: 'track-head' },
        el('span', { class: 'mascot-big' }, t.mascot),
        el('div', {},
          el('h2', {}, trackTitle(t)),
          el('p', { class: 'small' }, t.goal))),
      el('p', { class: 'week' }, weekLine(weekCount(entries))),
      el('a', { class: 'button primary', href: `${base}/new` }, 'New entry'),
      el('div', { class: 'view-head' }, viewToggle, el('span', { class: 'small' }, `${plural(entries.length, th.unit)} so far`)),
      view === 'picture' ? renderPicture(t, entries) : renderLog(t, entries),
    ),
  );

  // scroll the picture so the mascot is in view
  const wrap = document.querySelector('.pic-wrap');
  const mascot = document.querySelector('.pic .mascot');
  if (wrap && mascot) {
    const svg = wrap.querySelector('svg');
    const scale = svg.getBoundingClientRect().height / svg.viewBox.baseVal.height;
    wrap.scrollTop = Math.max(0, mascot.getAttribute('y') * scale - wrap.clientHeight / 2);
  }
  newestId = null;
}

function entryDetail(t, e, prefix) {
  return [
    el('div', { class: 'log-meta' }, `${prefix}${fmtDate(e.timestamp)} · ${kindOf(t, e.kind).label}`),
    e.assignment ? el('div', {}, el('em', {}, 'Assignment: '), e.assignment) : null,
    el('div', {}, e.description),
    el('div', { class: 'words' }, e.words),
  ];
}

function renderLog(t, entries) {
  if (!entries.length) return el('p', { class: 'empty' }, 'No entries yet.');
  return el('ol', { class: 'log', reversed: true },
    entries.slice().reverse().map((e) =>
      el('li', { class: e.id === newestId ? 'new' : '' }, entryDetail(t, e, ''))));
}

function renderEntryForm(t) {
  const th = theme();
  const err = el('p', { class: 'error', role: 'alert' });

  const kindInputs = t.kinds.map((k, i) => el('label', { class: 'radio' },
    el('input', { type: 'radio', name: 'kind', value: k.id, required: i === 0 }), ' ', k.label));

  const extra = t.extraField
    ? [el('label', { for: 'extra' }, t.extraField.label),
       el('input', { id: 'extra', name: t.extraField.id, maxlength: 100, placeholder: t.extraField.placeholder || '' })]
    : [];

  const form = el('form', { class: 'card', onsubmit: (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const get = (k) => (fd.get(k) || '').trim();
    if (!fd.get('kind')) { err.textContent = 'Please choose one of the options.'; return; }
    const entry = {
      id: newId(),
      timestamp: new Date().toISOString(),
      track: t.id,
      kind: get('kind'),
      assignment: t.extraField ? get(t.extraField.id) : '',
      description: get('description'),
      words: get('words'),
      designNote: get('designNote'),
    };
    session.entries.push(entry);
    newestId = entry.id;
    enqueue({ action: 'addEntry', entry });
    leaveForm(t, true);
  } },
    el('h2', {}, `${t.mascot} New entry`),
    ...extra,
    el('fieldset', {}, el('legend', {}, t.kindLabel), kindInputs),
    el('label', { for: 'description' }, t.descLabel),
    el('textarea', { id: 'description', name: 'description', rows: 4, required: true, maxlength: 2000 }),
    el('label', { for: 'words' }, 'Now sum it up in a handful of words'),
    el('input', { id: 'words', name: 'words', required: true, maxlength: 60, placeholder: 'e.g. asked Holley, honors program' }),
    el('p', { class: 'hint' }, `These words will appear with your ${th.unit}.`),
    el('div', { class: 'design-note' },
      el('label', { for: 'designNote' }, 'Thoughts on the design of the app (optional)'),
      el('p', { class: 'hint' }, "This is a pilot, and we'll keep improving it as we go. Anything confusing, missing, or that you'd like to see?"),
      el('textarea', { id: 'designNote', name: 'designNote', rows: 2, maxlength: 2000 })),
    err,
    el('div', { class: 'row' },
      el('button', { type: 'submit', class: 'primary' }, 'Save'),
      el('button', { type: 'button', class: 'secondary', onclick: () => leaveForm(t) }, 'Cancel')),
  );
  show(crumbs(['Home', '#/'], [t.name, `#/trail/${t.id}`], ['New entry']), form);
}

// Leave the form without leaving it in history, so Back never returns to it.
// Cancel goes back to wherever the form was opened. Saving shows the picture:
// by going back if the form was opened from this track, else by replacing.
function leaveForm(t, saved = false) {
  const from = formFrom;
  formFrom = null;
  const fromThisTrack = from && from.startsWith(`#/trail/${t.id}`) && !from.endsWith('/new');
  if (from && (fromThisTrack || !saved)) history.back();
  else go(`trail/${t.id}`, true);
}

// ---------- the picture ----------

function wrapWords(text, max = 20) {
  const lines = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  if (lines.length > 2) lines.splice(2, lines.length, lines[1].slice(0, max - 1) + '…');
  return lines;
}

function renderPicture(t, entries) {
  const th = theme();
  const n = entries.length;
  const total = Math.max(PEAK_EVERY, Math.ceil((n + 1) / PEAK_EVERY) * PEAK_EVERY);
  const { pts, W, H } = th.layout(total);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'pic', role: 'img',
    'aria-label': `${t.name} ${th.label.toLowerCase()}: ${n} of ${total} ${th.unit}s`,
  });
  th.background(svg, pts, n, W, H);

  const detail = el('div', { class: 'detail', 'aria-live': 'polite' });

  for (let i = 1; i <= total; i++) {
    const p = pts[i];
    const e = entries[i - 1];
    if (i % CAMP_EVERY === 0) {
      if (th.landmark) {
        svg.append(th.landmark(p, i % PEAK_EVERY === 0));
      } else {
        // label beside the item, on the side facing the middle
        const right = p.x < 180;
        const name = milestoneName(i);
        svg.append(svgEl('text', {
          x: p.x + (right ? 22 : -22), y: p.y - 16, class: 'pic-label', 'text-anchor': right ? 'start' : 'end',
        }, name[0].toUpperCase() + name.slice(1)));
      }
    }
    if (!e) {
      svg.append(th.future(p));
      continue;
    }

    const g = svgEl('g', {
      class: 'step' + (e.id === newestId ? ' new' : ''),
      tabindex: 0, role: 'button', 'aria-label': `${th.unit} ${i}: ${e.words}`,
    });
    g.append(svgEl('title', {}, `${fmtDate(e.timestamp)}: ${e.words}`));
    const item = svgEl('g', { class: 'item' });
    item.append(...th.item(p, kindOf(t, e.kind).hollow));
    g.append(item);
    const label = svgEl('text', { x: p.x, y: p.y + th.labelDy, class: 'words-label', 'text-anchor': 'middle' });
    wrapWords(e.words).forEach((line, j) => label.append(svgEl('tspan', { x: p.x, dy: j === 0 ? 0 : 11 }, line)));
    g.append(label);

    const showDetail = () => detail.replaceChildren(...entryDetail(t, e, `${th.unit[0].toUpperCase() + th.unit.slice(1)} ${i} · `));
    g.addEventListener('click', showDetail);
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showDetail(); }
    });
    svg.append(g);
  }

  const here = pts[n];
  svg.append(svgEl('text', { x: here.x + 16, y: here.y - 8, class: 'mascot' + (newestId ? ' arrive' : '') }, t.mascot));

  const p = progressInfo(n);
  return el('div', {},
    el('p', { class: 'small' }, `${plural(p.left, `more ${th.unit}`)} to ${p.name}. Tap one to see it.`),
    el('div', { class: 'pic-wrap' }, svg),
    detail,
  );
}

// ---------- start ----------

async function start() {
  document.body.dataset.theme = themeId;
  renderThemeBar();
  const saved = remember('vp_nickname');
  if (saved) {
    $('#main').replaceChildren(el('p', { class: 'empty' }, 'Loading…'));
    try {
      session = await call('login', { nickname: saved });
      loadPending();
    } catch (e) {
      session = null;
      renderHeader();
      renderWelcome(e.message);
      return;
    }
  }
  route();
  flush();
}

start();
