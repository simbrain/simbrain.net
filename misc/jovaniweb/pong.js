// Jovani's Funhouse — neon Pong: you (left) vs FUNBOT (right).
(() => {
  'use strict';

  const canvas = document.getElementById('pong');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayBig = document.getElementById('overlay-big');
  const overlaySmall = document.getElementById('overlay-small');
  const scorePlayerEl = document.getElementById('score-player');
  const scoreCpuEl = document.getElementById('score-cpu');
  const soundBtn = document.getElementById('sound-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Logical playfield size; the canvas is scaled with CSS.
  const W = 800, H = 500;
  const WIN_SCORE = 7;
  const PADDLE_W = 14, PADDLE_H = 92, BALL_R = 9;
  const PLAYER_KEY_SPEED = 9, CPU_SPEED = 5.4;
  const START_SPEED = 6.5, MAX_SPEED = 17, SPEED_UP = 0.55;
  const CYAN = '#00f0ff', PINK = '#ff2fd6', YELLOW = '#ffe600';

  const PLAYER_CHEERS = ['NICE! 🔥', 'BOOM! 💥', 'SICK SHOT! ⚡', 'YESSS! 🙌', 'TOO EASY 😎'];
  const CPU_CHEERS = ['FUNBOT SCORES 🤖', 'OOPS! 🙈', 'SO CLOSE! 😬', 'BEEP BOOP 🤖'];

  const player = { x: 26, y: (H - PADDLE_H) / 2, targetY: null };
  const cpu = { x: W - 26 - PADDLE_W, y: (H - PADDLE_H) / 2, aimOffset: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: START_SPEED };
  const keys = { up: false, down: false };
  const scores = { player: 0, cpu: 0 };

  let state = 'ready'; // ready | playing | between | paused | over
  let serveDir = Math.random() < 0.5 ? -1 : 1;
  let nextServeAt = 0;
  let trail = [];
  let sparks = [];
  let blockStreak = 0; // player blocks since FUNBOT last scored
  let shake = 0, flash = 0, hue = 0;
  let last = performance.now();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- Sound ----------
  let audio = null;
  let soundOn = true;

  function beep(freq, dur = 0.08, type = 'square', vol = 0.05) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur);
    } catch {
      // Audio is a bonus; ignore failures.
    }
  }

  function jingle(notes, step = 110, type = 'square') {
    notes.forEach((f, i) => setTimeout(() => beep(f, 0.14, type, 0.06), i * step));
  }

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊 Sound: On' : '🔇 Sound: Off';
    if (soundOn) beep(660);
  });

  // ---------- Overlay + score display ----------
  function showOverlay(big, small = '') {
    overlayBig.textContent = big;
    overlaySmall.textContent = small;
    overlay.classList.add('show');
  }

  function hideOverlay() {
    overlay.classList.remove('show');
  }

  function setScore(el, value) {
    el.textContent = value;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  // ---------- Effects ----------
  function burst(x, y, n, color, power = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * power + 1;
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: Math.random() * 4 + 2,
        color: color || `hsl(${(hue + Math.random() * 120) % 360}, 100%, 60%)`,
        life: 1,
      });
    }
  }

  // ---------- Game flow ----------
  function centerBall() {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = ball.vy = 0;
    trail = [];
  }

  function serve() {
    centerBall();
    ball.speed = START_SPEED;
    const angle = (Math.random() - 0.5) * 0.7;
    ball.vx = Math.cos(angle) * ball.speed * serveDir;
    ball.vy = Math.sin(angle) * ball.speed;
    cpu.aimOffset = 0;
    state = 'playing';
    hideOverlay();
    beep(520, 0.1, 'triangle');
  }

  function resetGame() {
    scores.player = scores.cpu = 0;
    blockStreak = 0;
    setScore(scorePlayerEl, 0);
    setScore(scoreCpuEl, 0);
    player.y = cpu.y = (H - PADDLE_H) / 2;
    centerBall();
    state = 'ready';
    showOverlay('READY?', 'Click, tap, or press Space to serve');
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    showOverlay('PAUSED ⏸', 'Press P or click to keep playing');
  }

  function resume() {
    state = 'playing';
    hideOverlay();
    last = performance.now();
  }

  // Click / tap / Space: whatever "go" means right now.
  function action() {
    if (state === 'ready') serve();
    else if (state === 'paused') resume();
    else if (state === 'over') {
      resetGame();
      serve();
    }
  }

  function pointTo(who) {
    scores[who]++;
    if (who === 'cpu') blockStreak = 0;
    setScore(who === 'player' ? scorePlayerEl : scoreCpuEl, scores[who]);
    burst(clamp(ball.x, 10, W - 10), ball.y, 50, who === 'player' ? CYAN : PINK, 9);
    flash = 0.45;
    shake = 18;
    serveDir = who === 'player' ? 1 : -1;
    centerBall();

    if (scores[who] >= WIN_SCORE) {
      state = 'over';
      if (who === 'player') {
        showOverlay('YOU WIN! 🏆', `${scores.player} – ${scores.cpu} · Click to play again`);
        jingle([523, 659, 784, 1047, 784, 1047]);
        const r = canvas.getBoundingClientRect();
        window.funhouse?.confetti(r.left + r.width / 2, r.top + r.height / 2, 180, 1.4);
        window.funhouse?.rain(250);
      } else {
        showOverlay('FUNBOT WINS 🤖', `${scores.player} – ${scores.cpu} · Click for a rematch`);
        jingle([392, 330, 262, 196], 160, 'sawtooth');
      }
      return;
    }

    state = 'between';
    nextServeAt = performance.now() + 1200;
    if (who === 'player') {
      showOverlay(pick(PLAYER_CHEERS), `${scores.player} – ${scores.cpu}`);
      jingle([660, 880, 1320], 90);
    } else {
      showOverlay(pick(CPU_CHEERS), `${scores.player} – ${scores.cpu}`);
      jingle([300, 200], 120, 'sawtooth');
    }
  }

  // ---------- Physics ----------
  function paddleHit(p, dir) {
    // dir is the direction the ball should travel after hitting this paddle.
    if (ball.x - BALL_R > p.x + PADDLE_W || ball.x + BALL_R < p.x) return false;
    if (ball.y + BALL_R < p.y || ball.y - BALL_R > p.y + PADDLE_H) return false;
    if (dir === 1 && ball.x < p.x) return false; // already slipped past
    if (dir === -1 && ball.x > p.x + PADDLE_W) return false;

    const rel = clamp((ball.y - (p.y + PADDLE_H / 2)) / (PADDLE_H / 2), -1, 1);
    const angle = rel * Math.PI * 0.32;
    ball.speed = Math.min(ball.speed + SPEED_UP, MAX_SPEED);
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.x = dir === 1 ? p.x + PADDLE_W + BALL_R : p.x - BALL_R;

    burst(ball.x, ball.y, 22, dir === 1 ? CYAN : PINK, 6);
    shake = 7;
    beep(dir === 1 ? 440 : 330, 0.07);
    // FUNBOT guesses where to aim; a big guess means it might whiff.
    if (dir === 1) {
      cpu.aimOffset = (Math.random() - 0.5) * PADDLE_H * 1.15;
      // Every second block in a row summons the unicorn.
      blockStreak++;
      if (blockStreak % 2 === 0) {
        window.funhouse?.unicornBlast();
        jingle([1047, 1319, 1568, 2093, 2637], 60, 'triangle');
      }
    }
    return true;
  }

  function update(dt, now) {
    hue = (hue + (document.body.classList.contains('party') ? 6 : 1.3) * dt) % 360;

    // Player paddle: keys win over the pointer.
    if (keys.up || keys.down) {
      player.y += (keys.down - keys.up) * PLAYER_KEY_SPEED * dt;
      player.targetY = null;
    } else if (player.targetY !== null) {
      player.y += (player.targetY - player.y) * Math.min(1, 0.4 * dt);
    }
    player.y = clamp(player.y, 0, H - PADDLE_H);

    // FUNBOT tracks the ball when it's coming its way, otherwise drifts to center.
    let target = H / 2;
    if (state === 'playing' && ball.vx > 0 && ball.x > W * 0.3) target = ball.y + cpu.aimOffset;
    const maxMove = CPU_SPEED * dt * (1 + Math.min(scores.player, 5) * 0.04);
    cpu.y += clamp(target - (cpu.y + PADDLE_H / 2), -maxMove, maxMove);
    cpu.y = clamp(cpu.y, 0, H - PADDLE_H);

    if (state === 'between' && now >= nextServeAt) serve();

    if (state === 'playing') {
      // Substeps so a fast ball can't tunnel through a paddle.
      const steps = Math.ceil((ball.speed * dt) / 5);
      for (let s = 0; s < steps; s++) {
        ball.x += (ball.vx * dt) / steps;
        ball.y += (ball.vy * dt) / steps;

        if (ball.y < BALL_R) {
          ball.y = BALL_R;
          ball.vy = Math.abs(ball.vy);
          burst(ball.x, ball.y, 8, YELLOW, 3);
          beep(240, 0.05);
        } else if (ball.y > H - BALL_R) {
          ball.y = H - BALL_R;
          ball.vy = -Math.abs(ball.vy);
          burst(ball.x, ball.y, 8, YELLOW, 3);
          beep(240, 0.05);
        }

        if (ball.vx < 0) paddleHit(player, 1);
        else paddleHit(cpu, -1);

        if (ball.x < -BALL_R * 3) return pointTo('cpu');
        if (ball.x > W + BALL_R * 3) return pointTo('player');
      }
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 20) trail.shift();
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.03 * dt;
      if (p.life <= 0) sparks.splice(i, 1);
    }

    shake *= Math.pow(0.88, dt);
    flash = Math.max(0, flash - 0.03 * dt);
  }

  // ---------- Drawing ----------
  function paddle(p, color) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(p.x, p.y, PADDLE_W, PADDLE_H, 7);
    else ctx.rect(p.x, p.y, PADDLE_W, PADDLE_H);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // Giant faint scores behind everything.
    ctx.font = '160px Bungee, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillText(scores.player, W * 0.25, H / 2);
    ctx.fillText(scores.cpu, W * 0.75, H / 2);

    // Marching rainbow center line.
    ctx.setLineDash([16, 14]);
    ctx.lineDashOffset = -now / 40;
    ctx.lineWidth = 4;
    ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Rainbow comet trail.
    trail.forEach((t, i) => {
      const a = (i + 1) / trail.length;
      ctx.fillStyle = `hsla(${(hue + i * 14) % 360}, 100%, 60%, ${a * 0.55})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_R * a, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sparks.
    for (const p of sparks) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    paddle(player, CYAN);
    paddle(cpu, PINK);

    // Ball (pulses while waiting to serve).
    const waiting = state !== 'playing';
    const r = waiting ? BALL_R * (1 + 0.18 * Math.sin(now / 140)) : BALL_R;
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    const dt = Math.min((now - last) / (1000 / 60), 3);
    last = now;
    if (state !== 'paused') update(dt, now);
    draw(now);
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  function pointerToTarget(e) {
    const rect = canvas.getBoundingClientRect();
    player.targetY = ((e.clientY - rect.top) / rect.height) * H - PADDLE_H / 2;
  }

  canvas.addEventListener('pointermove', pointerToTarget);
  canvas.addEventListener('pointerdown', e => {
    pointerToTarget(e);
    action();
  });

  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    const onButton = e.target.tagName === 'BUTTON';
    if (k === 'arrowup' || k === 'w') { keys.up = true; e.preventDefault(); }
    else if (k === 'arrowdown' || k === 's') { keys.down = true; e.preventDefault(); }
    else if (k === ' ' && !onButton) { e.preventDefault(); action(); }
    else if (k === 'p') { state === 'paused' ? resume() : pause(); }
  });

  document.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') keys.up = false;
    else if (k === 'arrowdown' || k === 's') keys.down = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  resetBtn.addEventListener('click', resetGame);

  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  requestAnimationFrame(loop);
})();
