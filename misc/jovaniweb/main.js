// Jovani's Funhouse — page effects: wavy title, marquee bulbs, floating emoji, confetti.
(() => {
  'use strict';

  const COLORS = ['#ff2fd6', '#00f0ff', '#ffe600', '#39ff14', '#ff7b00', '#b14bff'];
  const EMOJI = ['🎈', '🎪', '🍭', '🎉', '⭐', '🤡', '🎠', '🍿', '🎡', '✨', '🦄', '🏓', '🍩', '🎯'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  // ---------- Wavy, clickable title letters ----------
  const title = document.getElementById('title');
  const words = title.textContent.trim().split(' ');
  title.textContent = '';
  let letterIndex = 0;
  words.forEach((word, wi) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    wordEl.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const s = document.createElement('span');
      s.className = 'letter';
      s.textContent = ch;
      s.style.setProperty('--i', letterIndex);
      s.style.color = COLORS[letterIndex % COLORS.length];
      letterIndex++;
      wordEl.appendChild(s);
    }
    title.appendChild(wordEl);
    if (wi < words.length - 1) title.appendChild(document.createTextNode(' '));
  });

  title.addEventListener('click', e => {
    const letter = e.target.closest('.letter');
    if (!letter) return;
    letter.classList.remove('boing');
    void letter.offsetWidth;
    letter.classList.add('boing');
    letter.addEventListener('animationend', () => letter.classList.remove('boing'), { once: true });
  });

  // ---------- Marquee light bulbs ----------
  const marquee = document.getElementById('marquee');
  const bulbs = document.getElementById('bulbs');

  function layoutBulbs() {
    const w = marquee.clientWidth;
    const h = marquee.clientHeight;
    const inset = parseFloat(getComputedStyle(marquee).paddingTop) / 2;
    const iw = w - inset * 2;
    const ih = h - inset * 2;
    const spacing = w < 600 ? 26 : 32;
    const nx = Math.max(2, Math.round(iw / spacing));
    const ny = Math.max(2, Math.round(ih / spacing));
    const pts = [];
    for (let i = 0; i < nx; i++) pts.push([inset + (iw * i) / nx, inset]);
    for (let i = 0; i < ny; i++) pts.push([w - inset, inset + (ih * i) / ny]);
    for (let i = 0; i < nx; i++) pts.push([w - inset - (iw * i) / nx, h - inset]);
    for (let i = 0; i < ny; i++) pts.push([inset, h - inset - (ih * i) / ny]);

    const frag = document.createDocumentFragment();
    for (const [x, y] of pts) {
      const b = document.createElement('span');
      b.className = 'bulb';
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      frag.appendChild(b);
    }
    bulbs.replaceChildren(frag);
  }
  new ResizeObserver(layoutBulbs).observe(marquee);

  // ---------- Floating emoji ----------
  if (!reduceMotion) {
    const floaties = document.getElementById('floaties');
    for (let i = 0; i < 16; i++) {
      const f = document.createElement('span');
      f.className = 'floatie';
      f.textContent = pick(EMOJI);
      f.style.left = rand(0, 96) + 'vw';
      const dur = rand(14, 28);
      f.style.animationDuration = dur + 's';
      f.style.animationDelay = -rand(0, dur) + 's';
      floaties.appendChild(f);
    }
  }

  // ---------- Full-screen confetti / sparkle layer ----------
  const fx = document.getElementById('fx');
  const fctx = fx.getContext('2d');
  const MAX_PARTS = 1500;
  let parts = [];

  function fitFx() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = innerWidth * dpr;
    fx.height = innerHeight * dpr;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', fitFx);
  fitFx();

  function addPart(p) {
    if (parts.length < MAX_PARTS) parts.push(p);
  }

  function confetti(x, y, n = 60, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2, 10) * power;
      addPart({
        kind: 'confetti', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4 * power,
        w: rand(6, 12), h: rand(4, 8),
        rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
        color: pick(COLORS), life: 1, decay: rand(0.005, 0.011),
      });
    }
  }

  function rain(n = 200) {
    for (let i = 0; i < n; i++) {
      addPart({
        kind: 'confetti', x: rand(0, innerWidth), y: rand(-innerHeight * 0.6, -10),
        vx: rand(-1.5, 1.5), vy: rand(1, 4),
        w: rand(6, 12), h: rand(4, 8),
        rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
        color: pick(COLORS), life: 1, decay: rand(0.002, 0.004),
      });
    }
  }

  function sparkle(x, y) {
    addPart({
      kind: 'spark', x, y,
      vx: rand(-0.8, 0.8), vy: rand(-1.2, 0.3),
      r: rand(2, 5), color: pick(COLORS), life: 1, decay: rand(0.025, 0.045),
    });
  }

  function tick() {
    fctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay;
      if (p.kind === 'confetti') {
        p.vy += 0.16;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.rot += p.vr;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.life <= 0 || p.y > innerHeight + 40) {
        parts.splice(i, 1);
        continue;
      }
      fctx.globalAlpha = Math.min(1, p.life * 2);
      fctx.fillStyle = p.color;
      if (p.kind === 'confetti') {
        fctx.save();
        fctx.translate(p.x, p.y);
        fctx.rotate(p.rot);
        const flip = Math.cos(p.rot * 2);
        fctx.fillRect(-p.w / 2, (-p.h / 2) * flip, p.w, p.h * flip);
        fctx.restore();
      } else {
        fctx.shadowColor = p.color;
        fctx.shadowBlur = 10;
        fctx.beginPath();
        fctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        fctx.fill();
        fctx.shadowBlur = 0;
      }
    }
    fctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Click anywhere (outside the game) for a confetti pop.
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('#pong')) return;
    confetti(e.clientX, e.clientY, 28, 0.7);
  });

  // Sparkle trail behind the mouse.
  if (!reduceMotion) {
    document.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' && Math.random() < 0.55) sparkle(e.clientX, e.clientY);
    });
  }

  // ---------- Rainbow-blasting unicorn ----------
  const RAINBOW = ['#ff3b3b', '#ff9a1f', '#ffe600', '#39ff14', '#00b3ff', '#b14bff', '#ff2fd6'];
  const UNICORN_LINES = ['NEIGH-CE! ✨', 'UNI-POWER!', 'RAINBOW BLAST!', 'DOUBLE BLOCK! 🌈', 'MAGICAL! 💖'];
  const unicorn = document.getElementById('unicorn');
  const unicornSay = document.getElementById('unicorn-say');
  const hornTip = unicorn.querySelector('.horn-tip');
  let blastDelay = null;
  let blastStream = null;

  function unicornBlast() {
    unicornSay.textContent = pick(UNICORN_LINES);
    unicorn.classList.remove('go');
    void unicorn.offsetWidth;
    unicorn.classList.add('go');

    clearTimeout(blastDelay);
    clearInterval(blastStream);
    // Stream rainbow sparks out of the horn while the CSS beam is firing.
    blastDelay = setTimeout(() => {
      const end = performance.now() + 1100;
      blastStream = setInterval(() => {
        const r = hornTip.getBoundingClientRect();
        for (let i = 0; i < 7; i++) {
          const a = -0.72 + rand(-0.25, 0.25);
          const sp = rand(7, 15);
          addPart({
            kind: 'spark', x: r.left, y: r.top,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: rand(3, 7), color: pick(RAINBOW), life: 1, decay: rand(0.012, 0.02),
          });
        }
        if (performance.now() > end) clearInterval(blastStream);
      }, 40);
    }, 350);
  }

  // ---------- Party mode ----------
  const partyBtn = document.getElementById('party-btn');
  partyBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('party');
    partyBtn.textContent = on ? '🪩 Party: ON!' : '🥳 Party Mode';
    if (on) rain(220);
  });

  // ---------- Easter egg: type "jovani" ----------
  let typed = '';
  document.addEventListener('keydown', e => {
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === 'jovani') {
      typed = '';
      rain(400);
      title.classList.remove('spin');
      void title.offsetWidth;
      title.classList.add('spin');
    }
  });

  window.funhouse = { confetti, rain, unicornBlast };
})();
