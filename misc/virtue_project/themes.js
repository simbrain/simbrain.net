// Picture themes. Each theme names its units and milestones, lays out the
// slots, and draws one item per entry. Colors come from style.css, keyed on
// body[data-theme]. Uses svgEl() from app.js.

// Deterministic jitter in [-0.5, 0.5), so pictures don't shift between renders.
function jitter(i, k) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

// Slots 0..total in rows of 3, bottom to top. Slot 0 is the starting spot.
function gridLayout(total, { rowH = 80, zigzag = false, jx = 0, jy = 0 } = {}) {
  const perRow = 3, W = 360, left = 60, right = 300;
  const rows = Math.ceil((total + 1) / perRow);
  const H = rows * rowH + 70;
  const pts = [];
  for (let i = 0; i <= total; i++) {
    const r = Math.floor(i / perRow), c = i % perRow;
    const frac = c / (perRow - 1);
    const x = zigzag && r % 2 ? right - frac * (right - left) : left + frac * (right - left);
    pts.push({ x: x + jitter(i, 1) * jx, y: H - 40 - r * rowH + jitter(i, 2) * jy, r });
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

function starPoints(cx, cy, R, r) {
  const out = [];
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 ? r : R;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    out.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return out.join(' ');
}

const THEMES = {
  trail: {
    label: 'Trail', unit: 'step', small: 'camp', big: 'the summit', bigN: 'summit',
    labelDy: 20,
    layout: (total) => gridLayout(total, { rowH: 74, zigzag: true }),
    background(svg, pts, n) {
      svg.append(svgEl('path', { class: 'path-ahead', d: trailPath(pts) }));
      if (n > 0) svg.append(svgEl('path', { class: 'path-walked', d: trailPath(pts.slice(0, n + 1)) }));
      svg.append(svgEl('text', { x: pts[0].x, y: pts[0].y + 22, class: 'pic-label', 'text-anchor': 'middle' }, 'Start'));
    },
    item: (p, hollow) => [svgEl('circle', { cx: p.x, cy: p.y, r: 7, class: hollow ? 'marker hollow' : 'marker' })],
    future: (p) => svgEl('circle', { cx: p.x, cy: p.y, r: 3, class: 'future' }),
    landmark: (p, isPeak) => svgEl('text', { x: p.x, y: p.y - 12, class: 'landmark', 'text-anchor': 'middle' }, isPeak ? '🚩' : '⛺'),
  },

  forest: {
    label: 'Forest', unit: 'tree', small: 'grove', big: 'a full forest', bigN: 'forest',
    labelDy: 12,
    layout: (total) => gridLayout(total, { rowH: 80, jx: 16, jy: 8 }),
    background() {},
    item(p, hollow) {
      const s = hollow ? 0.55 : 1;
      const { x, y } = p;
      return [
        svgEl('rect', { x: x - 2.5 * s, y: y - 9 * s, width: 5 * s, height: 9 * s, class: 'trunk' }),
        svgEl('polygon', { points: `${x},${y - 30 * s} ${x - 14 * s},${y - 8 * s} ${x + 14 * s},${y - 8 * s}`, class: 'canopy' }),
        svgEl('polygon', { points: `${x},${y - 42 * s} ${x - 10 * s},${y - 22 * s} ${x + 10 * s},${y - 22 * s}`, class: 'canopy' }),
      ];
    },
    future: (p) => svgEl('circle', { cx: p.x, cy: p.y - 2, r: 2.5, class: 'future' }),
    landmark: null, // uses a text label
  },

  garden: {
    label: 'Garden', unit: 'flower', small: 'flower bed', big: 'a full garden', bigN: 'garden',
    labelDy: 12,
    layout: (total) => gridLayout(total, { rowH: 80, jx: 16, jy: 8 }),
    background() {},
    item(p, hollow) {
      const { x, y } = p;
      const stem = [
        svgEl('line', { x1: x, y1: y, x2: x, y2: y - 22, class: 'stem' }),
        svgEl('ellipse', { cx: x + 5, cy: y - 9, rx: 5, ry: 2.2, class: 'leaf', transform: `rotate(-30 ${x + 5} ${y - 9})` }),
      ];
      if (hollow) return [...stem, svgEl('ellipse', { cx: x, cy: y - 27, rx: 3.5, ry: 6.5, class: 'petal' })];
      const petals = Array.from({ length: 5 }, (_, k) => {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
        return svgEl('circle', { cx: x + 6.5 * Math.cos(a), cy: y - 29 + 6.5 * Math.sin(a), r: 5.2, class: 'petal' });
      });
      return [...stem, ...petals, svgEl('circle', { cx: x, cy: y - 29, r: 3.6, class: 'center' })];
    },
    future: (p) => svgEl('circle', { cx: p.x, cy: p.y - 2, r: 2.5, class: 'future' }),
    landmark: null,
  },

  sky: {
    label: 'Night sky', unit: 'star', small: 'constellation', big: 'a galaxy', bigN: 'galaxy',
    labelDy: 12,
    layout: (total) => gridLayout(total, { rowH: 76, jx: 40, jy: 18 }),
    background(svg, pts, n, W, H) {
      for (let k = 0; k < H / 6; k++) {
        svg.append(svgEl('circle', {
          cx: (jitter(k, 7) + 0.5) * W, cy: (jitter(k, 9) + 0.5) * H, r: 0.6 + (jitter(k, 3) + 0.5), class: 'bgstar',
        }));
      }
      // join each group of CAMP_EVERY stars into a constellation
      for (let start = 1; start <= n; start += CAMP_EVERY) {
        const group = pts.slice(start, Math.min(n, start + CAMP_EVERY - 1) + 1);
        if (group.length > 1) {
          svg.append(svgEl('polyline', { points: group.map((p) => `${p.x},${p.y - 10}`).join(' '), class: 'constellation' }));
        }
      }
    },
    item: (p, hollow) => [svgEl('polygon', { points: starPoints(p.x, p.y - 10, hollow ? 6 : 10, hollow ? 2.6 : 4.2), class: hollow ? 'star hollow' : 'star' })],
    future: (p) => svgEl('circle', { cx: p.x, cy: p.y - 10, r: 1.4, class: 'future' }),
    landmark: null,
  },
};

const THEME_ORDER = ['trail', 'forest', 'garden', 'sky'];
