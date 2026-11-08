// Virtue Trails pilot app.
//
// All data lives in a Google Sheet behind an Apps Script web app (backend.txt).
// The nickname is the login, so trails follow a person across devices. This
// browser only remembers which nickname is signed in.
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

function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return s;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Next landmark after n steps: a camp every CAMP_EVERY, a summit every PEAK_EVERY.
function progressInfo(n) {
  const next = Math.floor(n / CAMP_EVERY) * CAMP_EVERY + CAMP_EVERY;
  const peakNo = Math.ceil(next / PEAK_EVERY);
  const name = next % PEAK_EVERY === 0
    ? (peakNo === 1 ? 'the summit' : `summit ${peakNo}`)
    : `camp ${(next % PEAK_EVERY) / CAMP_EVERY}`;
  return { name, left: next - n, frac: (n % CAMP_EVERY) / CAMP_EVERY };
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
      throw new Error("Couldn't reach the server. Check your connection and try again.");
    }
  }
  if (res.error) throw new Error(res.error);
  return res;
}

// ---------- state and routing ----------
// Pages: #/  (trailhead)   #/trail/<id>   #/trail/<id>/entries   #/trail/<id>/new

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
    return renderTrack(t, sub === 'entries' ? 'log' : 'trail');
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
  remember('vp_nickname', null);
  session = null;
  go('', true);
}

function weekDots(count) {
  return el('span', { class: 'dots', 'aria-hidden': true },
    Array.from({ length: WEEKLY_GOAL }, (_, i) => el('span', { class: i < count ? 'dot on' : 'dot' })),
    count > WEEKLY_GOAL ? el('span', { class: 'extra' }, `+${count - WEEKLY_GOAL}`) : null);
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
  route();
}

function renderHome() {
  const started = TRACKS.filter((t) => session.tracks.some((x) => x.track === t.id));
  const unstarted = TRACKS.filter((t) => !started.includes(t));

  const cards = started.map((t) => {
    const entries = entriesFor(t.id);
    const n = entries.length;
    const wk = weekCount(entries);
    const p = progressInfo(n);
    return el('div', { class: 'track-card' },
      el('a', { class: 'track-card-main', href: `#/trail/${t.id}` },
        el('span', { class: 'mascot-big' }, t.mascot),
        el('span', { class: 'track-card-text' },
          el('strong', {}, trackTitle(t)),
          el('span', { class: 'small' }, `${plural(n, 'step')} · ${p.left} to ${p.name}`),
          progressBar(p.frac, `${t.name}: ${p.left} steps to ${p.name}`),
          el('span', { class: 'small week-line' },
            wk >= WEEKLY_GOAL ? `This week ${wk}, goal met` : `This week ${wk} of ${WEEKLY_GOAL}`,
            weekDots(wk)))),
      el('a', { class: 'button primary small-btn', href: `#/trail/${t.id}/new` }, 'Log'),
    );
  });

  const err = el('p', { class: 'error', role: 'alert' });
  const starters = unstarted.map((t) =>
    el('button', { class: 'track-option', onclick: async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      try {
        session.tracks = (await call('startTrack', { nickname: session.nickname, track: t.id })).tracks;
        go(`trail/${t.id}`);
      } catch (e) {
        err.textContent = e.message;
        btn.disabled = false;
      }
    } },
      el('span', { class: 'mascot-big' }, t.mascot),
      el('span', {},
        el('strong', {}, trackTitle(t)),
        el('span', { class: 'small' }, t.goal))));

  show(el('section', {},
    el('h2', {}, 'Trailhead'),
    started.length
      ? el('div', { class: 'track-cards' }, cards)
      : el('p', {}, 'Each virtue is its own trail with its own mascot. Pick one to start. You can add more any time.'),
    starters.length
      ? [started.length ? el('h3', {}, 'Start a new trail') : null,
         el('div', { class: 'track-options' }, starters)]
      : null,
    err,
  ));
}

function renderTrack(t, view) {
  const entries = entriesFor(t.id);
  const wk = weekCount(entries);
  const base = `#/trail/${t.id}`;

  const viewToggle = el('div', { class: 'toggle' },
    [['trail', 'Trail', base], ['log', 'Log', `${base}/entries`]].map(([v, label, href]) =>
      el('a', {
        class: view === v ? 'active' : '',
        'aria-current': view === v ? 'page' : null,
        href,
        onclick: (ev) => { ev.preventDefault(); go(href.slice(2), true); },
      }, label)));

  show(
    crumbs(['Trailhead', '#/'], [t.name, base]),
    el('section', {},
      el('div', { class: 'track-head' },
        el('span', { class: 'mascot-big' }, t.mascot),
        el('div', {},
          el('h2', {}, trackTitle(t)),
          el('p', { class: 'small' }, t.goal))),
      el('p', { class: 'week' }, `This week: ${plural(wk, 'step')} (goal: ${WEEKLY_GOAL} or more)`, weekDots(wk)),
      el('a', { class: 'button primary', href: `${base}/new` }, 'Log a step'),
      el('div', { class: 'view-head' }, viewToggle, el('span', { class: 'small' }, `${plural(entries.length, 'step')} so far`)),
      view === 'trail' ? renderTrail(t, entries) : renderLog(t, entries),
    ),
  );

  // scroll the trail so the mascot is in view
  const wrap = document.querySelector('.trail-wrap');
  const mascot = document.querySelector('.trail .mascot');
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
  if (!entries.length) return el('p', { class: 'empty' }, 'No steps yet.');
  return el('ol', { class: 'log', reversed: true },
    entries.slice().reverse().map((e) =>
      el('li', { class: e.id === newestId ? 'new' : '' }, entryDetail(t, e, ''))));
}

function renderEntryForm(t) {
  const err = el('p', { class: 'error', role: 'alert' });
  const save = el('button', { type: 'submit', class: 'primary' }, 'Save step');

  const kindInputs = t.kinds.map((k, i) => el('label', { class: 'radio' },
    el('input', { type: 'radio', name: 'kind', value: k.id, required: i === 0 }), ' ', k.label));

  const extra = t.extraField
    ? [el('label', { for: 'extra' }, t.extraField.label),
       el('input', { id: 'extra', name: t.extraField.id, maxlength: 100, placeholder: t.extraField.placeholder || '' })]
    : [];

  const form = el('form', { class: 'card', onsubmit: async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const get = (k) => (fd.get(k) || '').trim();
    if (!fd.get('kind')) { err.textContent = 'Please choose one of the options.'; return; }
    const entry = {
      track: t.id,
      kind: get('kind'),
      assignment: t.extraField ? get(t.extraField.id) : '',
      description: get('description'),
      words: get('words'),
      designNote: get('designNote'),
    };
    save.disabled = true;
    save.textContent = 'Saving…';
    err.textContent = '';
    try {
      const { entry: saved } = await call('addEntry', { nickname: session.nickname, entry });
      session.entries.push(saved);
      newestId = saved.id;
      leaveForm(t, true);
    } catch (e) {
      err.textContent = e.message;
      save.disabled = false;
      save.textContent = 'Save step';
    }
  } },
    el('h2', {}, `${t.mascot} Log a step`),
    ...extra,
    el('fieldset', {}, el('legend', {}, t.kindLabel), kindInputs),
    el('label', { for: 'description' }, t.descLabel),
    el('textarea', { id: 'description', name: 'description', rows: 4, required: true, maxlength: 2000 }),
    el('label', { for: 'words' }, 'Now sum it up in a handful of words'),
    el('input', { id: 'words', name: 'words', required: true, maxlength: 60, placeholder: 'e.g. asked Holley, honors program' }),
    el('p', { class: 'hint' }, 'These words will appear on your trail.'),
    el('div', { class: 'design-note' },
      el('label', { for: 'designNote' }, 'Thoughts on the design of the app (optional)'),
      el('p', { class: 'hint' }, "This is a pilot, and we'll keep improving it as we go. Anything confusing, missing, or that you'd like to see?"),
      el('textarea', { id: 'designNote', name: 'designNote', rows: 2, maxlength: 2000 })),
    err,
    el('div', { class: 'row' },
      save,
      el('button', { type: 'button', class: 'secondary', onclick: () => leaveForm(t) }, 'Cancel')),
  );
  show(crumbs(['Trailhead', '#/'], [t.name, `#/trail/${t.id}`], ['Log a step']), form);
}

// Leave the form without leaving it in history, so Back never returns to it.
// Cancel goes back to wherever the form was opened. Saving shows the trail:
// by going back if the form was opened from this trail, else by replacing.
function leaveForm(t, saved = false) {
  const from = formFrom;
  formFrom = null;
  const fromThisTrail = from && from.startsWith(`#/trail/${t.id}`) && !from.endsWith('/new');
  if (from && (fromThisTrail || !saved)) history.back();
  else go(`trail/${t.id}`, true);
}

// ---------- the trail picture ----------
// A switchback path climbing upward. Steps sit at fixed points; a camp
// every CAMP_EVERY steps and a summit every PEAK_EVERY steps.

function trailPoints(n) {
  const perRow = 3, W = 360, rowH = 74, left = 60, right = 300;
  const rows = Math.ceil((n + 1) / perRow);
  const H = rows * rowH + 60;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow;
    const frac = c / (perRow - 1);
    const x = r % 2 === 0 ? left + frac * (right - left) : right - frac * (right - left);
    pts.push({ x, y: H - 40 - r * rowH, r });
  }
  return { pts, W, H };
}

function trailPath(pts) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.r === b.r) {
      d += ` L ${b.x} ${b.y}`;
    } else {
      const out = a.x > 180 ? 50 : -50; // switchback bulges outward
      d += ` C ${a.x + out} ${a.y} ${b.x + out} ${b.y} ${b.x} ${b.y}`;
    }
  }
  return d;
}

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

function renderTrail(t, entries) {
  const n = entries.length;
  const total = Math.max(PEAK_EVERY, Math.ceil((n + 1) / PEAK_EVERY) * PEAK_EVERY);
  const { pts, W, H } = trailPoints(total);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'trail', role: 'img',
    'aria-label': `${t.name} trail: ${n} of ${total} steps`,
  });

  svg.append(svgEl('path', { class: 'path-ahead', d: trailPath(pts) }));
  if (n > 0) svg.append(svgEl('path', { class: 'path-walked', d: trailPath(pts.slice(0, n + 1)) }));
  svg.append(svgEl('text', { x: pts[0].x, y: pts[0].y + 22, class: 'label', 'text-anchor': 'middle' }, 'Start'));

  const detail = el('div', { class: 'detail', 'aria-live': 'polite' });

  for (let i = 1; i <= total; i++) {
    const p = pts[i];
    const e = entries[i - 1];
    const isPeak = i % PEAK_EVERY === 0;
    if (isPeak || i % CAMP_EVERY === 0) {
      svg.append(svgEl('text', { x: p.x, y: p.y - 12, class: 'landmark', 'text-anchor': 'middle' }, isPeak ? '🚩' : '⛺'));
    }
    if (!e) {
      svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: 3, class: 'future' }));
      continue;
    }

    const g = svgEl('g', {
      class: 'step' + (e.id === newestId ? ' new' : ''),
      tabindex: 0, role: 'button', 'aria-label': `Step ${i}: ${e.words}`,
    });
    g.append(svgEl('title', {}, `${fmtDate(e.timestamp)}: ${e.words}`));
    g.append(svgEl('circle', { cx: p.x, cy: p.y, r: 7, class: kindOf(t, e.kind).hollow ? 'marker hollow' : 'marker' }));
    const label = svgEl('text', { x: p.x, y: p.y + 20, class: 'words-label', 'text-anchor': 'middle' });
    wrapWords(e.words).forEach((line, j) => label.append(svgEl('tspan', { x: p.x, dy: j === 0 ? 0 : 11 }, line)));
    g.append(label);

    const showDetail = () => detail.replaceChildren(...entryDetail(t, e, `Step ${i} · `));
    g.addEventListener('click', showDetail);
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showDetail(); }
    });
    svg.append(g);
  }

  const here = pts[n];
  svg.append(svgEl('text', { x: here.x + 14, y: here.y - 6, class: 'mascot' + (newestId ? ' arrive' : '') }, t.mascot));

  const p = progressInfo(n);
  return el('div', {},
    el('p', { class: 'small' }, `${plural(p.left, 'more step')} to ${p.name}. Tap a step to see it.`),
    el('div', { class: 'trail-wrap' }, svg),
    detail,
  );
}

// ---------- start ----------

async function start() {
  const saved = remember('vp_nickname');
  if (saved) {
    $('#main').replaceChildren(el('p', { class: 'empty' }, 'Loading…'));
    try {
      session = await call('login', { nickname: saved });
    } catch (e) {
      session = null;
      renderHeader();
      renderWelcome(e.message);
      return;
    }
  }
  route();
}

start();
