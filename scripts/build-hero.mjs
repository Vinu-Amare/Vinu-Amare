// Builds the pixel-art hero banner for the GitHub profile README.
// Output: assets/hero-light.svg + assets/hero-dark.svg
// Run: node scripts/build-hero.mjs
//
// Everything is drawn on a 320x90 cell grid, then each colour's horizontal
// runs are merged into one <path>, so the SVG stays small and pixel-crisp.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INK, PAPER, BUTTER, BUBBLE, TOMATO, WHITE,
  makeGrid as newGrid, put, toPaths, inRound, noise, layoutText, dilate, stamp,
} from './lib/pixel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

const W = 320;
const H = 90;
const SHADOW = 4; // hard drop shadow offset, like --shadow-hard
const BOX = { x0: 0, y0: 0, x1: W - SHADOW - 1, y1: H - SHADOW - 1 };
const IN = { x0: 2, y0: 2, x1: BOX.x1 - 2, y1: BOX.y1 - 2 }; // inside the border
const LOOP = IN.x1 - IN.x0 + 1; // cloud loop width

const makeGrid = (w = W, h = H) => newGrid(w, h);

const THEMES = {
  light: {
    frame: INK,
    shadow: INK,
    sky: [
      [0, '#cdbbff'],
      [16, '#e6b9f2'],
      [29, '#ffc0de'],
      [42, '#ffd3a6'],
    ],
    sun: BUTTER,
    sunLight: '#fff1a8',
    hills: [
      { base: '#a88bff', light: '#c7b3ff', shade: '#9479ef' },
      { base: '#6cc4ff', light: '#a6dcff', shade: '#55b0ee' },
      { base: '#5ed6a8', light: '#9aeccb', shade: '#45bf91' },
    ],
    cloud: WHITE,
    cloudShade: '#ffe1ef',
    star: WHITE,
    bird: INK,
    tag: { text: INK, shadow: WHITE },
  },
  dark: {
    frame: PAPER,
    shadow: '#a88bff',
    sky: [
      [0, '#2b1d3a'],
      [16, '#3d2a5c'],
      [29, '#6a4a9a'],
      [42, '#b86aa8'],
    ],
    sun: BUTTER,
    sunLight: '#fff1a8',
    hills: [
      { base: '#5a46a8', light: '#7d68d0', shade: '#4b3a92' },
      { base: '#2f6fa8', light: '#4f93cc', shade: '#265d8f' },
      { base: '#2a9a72', light: '#4fc497', shade: '#1f7a5a' },
    ],
    cloud: '#e9dcff',
    cloudShade: '#b9a6e8',
    star: '#fff1a8',
    bird: PAPER,
    tag: { text: PAPER, shadow: INK },
  },
};

// ---------- sprites ----------

const CLOUDS = {
  big: ['......#####.......', '....#########.....', '..#############...', '.################.', '##################', '.################.'],
  mid: ['...####.....', '.#########..', '############', '.##########.'],
  small: ['..####..', '.######.', '########'],
};

const SPARKLE = ['..#..', '..#..', '##.##', '..#..', '..#..'];
const BIRD_UP = ['#...#', '.#.#.', '..#..'];
const BIRD_DOWN = ['..#..', '.#.#.', '#...#'];

// ---------- scene ----------

const SUN = { cx: 268, cy: 50, r: 20 };
const SUN_STRIPES = new Set([4, 8, 9, 12, 13, 16, 17, 18]);

const HILLS = [
  { base: 58, waves: [[5, 0.031, 0.4], [2.5, 0.097, 1.7]] },
  { base: 67, waves: [[4, 0.045, 2.1], [2, 0.13, 0.3]] },
  { base: 76, waves: [[3.5, 0.026, 4.2], [1.5, 0.19, 2.2]] },
];
const hillTop = (h, x) =>
  Math.round(h.base + h.waves.reduce((s, [a, f, p]) => s + a * Math.sin(x * f + p), 0));

const FLOWERS = [24, 41, 63, 92, 121, 150, 171, 199, 228, 247, 279, 301];
const FLOWER_COLOURS = [BUBBLE, WHITE, BUTTER, TOMATO];

const skyAt = (t, x, y) => {
  const s = t.sky;
  let i = 0;
  while (i + 1 < s.length && y >= s[i + 1][0]) i++;
  const next = s[i + 1];
  if (next) {
    const d = next[0] - y; // rows until the next band: dither the seam
    if (d === 1 && (x + y) % 2 === 0) return next[1];
    if (d === 2 && x % 4 === (y % 2 ? 0 : 2)) return next[1];
  }
  return s[i][1];
};

const paintHill = (g, t, i) => {
  const h = HILLS[i];
  const pal = t.hills[i];
  for (let x = IN.x0; x <= IN.x1; x++) {
    const top = hillTop(h, x);
    for (let y = top; y <= IN.y1; y++) {
      if (!inRound(x, y, IN, 2)) continue;
      let c = pal.base;
      if (y === top) c = pal.light;
      else if (y > top + 1 && noise(x, y, i + 1) < 0.07) c = pal.shade;
      g[y][x] = c;
    }
  }
};

// Frame, sky, sun and the two back hills (everything behind the mid-hill grass).
function buildBackground(t) {
  const g = makeGrid();

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const shadowBox = { x0: BOX.x0 + SHADOW, y0: BOX.y0 + SHADOW, x1: BOX.x1 + SHADOW, y1: BOX.y1 + SHADOW };
      if (inRound(x, y, IN, 2)) {
        const dx = x - SUN.cx;
        const dy = y - SUN.cy;
        let c = skyAt(t, x, y);
        if (dx * dx + dy * dy <= SUN.r * SUN.r + SUN.r && !(dy > 0 && SUN_STRIPES.has(dy))) {
          const hl = (dx + 8) ** 2 + (dy + 8) ** 2 <= 30;
          c = hl ? t.sunLight : t.sun;
        }
        g[y][x] = c;
      } else if (inRound(x, y, BOX, 3)) g[y][x] = t.frame;
      else if (inRound(x, y, shadowBox, 3)) g[y][x] = t.shadow;
    }

  paintHill(g, t, 0);
  paintHill(g, t, 1);
  return g;
}

function buildFrontHill(t) {
  const g = makeGrid();
  paintHill(g, t, 2);
  return g;
}

// ---------- breeze ----------
// Each blade/flower has 5 poses, bent left -> upright -> bent right. They loop
// like a pendulum (lingering at each end of the swing) with no rest, and the
// delay grows with x so the sway ripples across the hills left to right.

const BREEZE = { period: 3.2, lag: 0.075, bucket: 8 };

// pose index order: 0 bent left, 1 lean left, 2 upright, 3 lean right, 4 bent right
const POSE_NAMES = ['L2', 'L1', 'A', 'R1', 'R2'];
const UPRIGHT = 2;
// one swing cycle in equal slots; repeated ends = the stem slowing before it swings back
const SWING = [2, 3, 4, 4, 3, 2, 1, 0, 0, 1];

const BLADE = {
  tall: [
    [[0, -1], [-1, -2], [-2, -3]],
    [[0, -1], [0, -2], [-1, -3]],
    [[0, -1], [0, -2], [0, -3]],
    [[0, -1], [0, -2], [1, -3]],
    [[0, -1], [1, -2], [2, -3]],
  ],
  short: [
    [[0, -1], [-1, -1]],
    [[0, -1], [-1, -2]],
    [[0, -1], [0, -2]],
    [[0, -1], [1, -2]],
    [[0, -1], [1, -1]],
  ],
};

// stem cells + flower head centre for each pose
const FLOWER_POSES = [
  { stem: [[0, -1], [-1, -2]], head: [-2, -3] },
  { stem: [[0, -1], [0, -2]], head: [-1, -3] },
  { stem: [[0, -1], [0, -2]], head: [0, -3] },
  { stem: [[0, -1], [0, -2]], head: [1, -3] },
  { stem: [[0, -1], [1, -2]], head: [2, -3] },
];

// steps(1,end) keyframes: pose p is visible only in the slots where SWING has p
const swingKeyframes = () =>
  POSE_NAMES.map((name, p) => {
    const frames = SWING.map((s, i) => `${(i * 100) / SWING.length}%{opacity:${s === p ? 1 : 0}}`);
    frames.push(`100%{opacity:${SWING[0] === p ? 1 : 0}}`);
    return `@keyframes s${name}{${frames.join('')}}`;
  }).join('\n');

function swayers(t) {
  const items = []; // { layer, x, poses: [[x, y, colour][] x3] }
  const blade = (layer, x, top, shape, colour) =>
    items.push({
      layer,
      x,
      poses: BLADE[shape].map((pose) => pose.map(([dx, dy]) => [x + dx, top + dy, colour])),
    });

  // sparse short grass on the mid hill
  for (let x = IN.x0 + 2; x <= IN.x1 - 2; x++)
    if (noise(x, 0, 21) < 0.1) blade('mid', x, hillTop(HILLS[1], x), 'short', t.hills[1].light);

  // denser grass on the front hill, skipping the flower spots
  const nearFlower = (x) => FLOWERS.some((f) => Math.abs(f - x) <= 3);
  for (let x = IN.x0 + 2; x <= IN.x1 - 2; x++) {
    const r = noise(x, 0, 9);
    if (r >= 0.3 || nearFlower(x)) continue;
    const tall = r < 0.1;
    blade('front', x, hillTop(HILLS[2], x), tall ? 'tall' : 'short', tall ? t.hills[2].light : t.hills[2].base);
  }

  FLOWERS.forEach((x, i) => {
    const top = hillTop(HILLS[2], x);
    const petal = FLOWER_COLOURS[i % FLOWER_COLOURS.length];
    const centre = petal === BUTTER ? TOMATO : BUTTER;
    items.push({
      layer: 'front',
      x,
      poses: FLOWER_POSES.map(({ stem, head: [hx, hy] }) => [
        ...stem.map(([dx, dy]) => [x + dx, top + dy, t.hills[2].shade]),
        [x + hx - 1, top + hy, petal],
        [x + hx + 1, top + hy, petal],
        [x + hx, top + hy - 1, petal],
        [x + hx, top + hy, centre],
      ]),
    });
  });

  return items;
}

function renderBreezeLayer(items, layer) {
  const buckets = new Map();
  for (const it of items.filter((i) => i.layer === layer)) {
    const b = Math.floor((it.x - IN.x0) / BREEZE.bucket);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(it);
  }
  let out = '';
  for (const [b, list] of [...buckets].sort((p, q) => p[0] - q[0])) {
    const delay = -(BREEZE.period - ((b * BREEZE.lag) % BREEZE.period)).toFixed(3);
    POSE_NAMES.forEach((name, pose) => {
      const g = makeGrid();
      list.forEach((it) => it.poses[pose].forEach(([x, y, c]) => put(g, x, y, c)));
      out += `<g class="s s${name}" style="animation-delay:${delay}s">${toPaths(g)}</g>`;
    });
  }
  return out;
}

const NAME = { text: 'VINUKI AMARASINGHE', x: 14, y: 12, scale: 2 };
const TAG = { text: 'FULLSTACK ENGINEER', x: 14, y: 35 };

function buildForeground(t) {
  const g = makeGrid();

  // Name: paper top, butter bottom (pixel take on the portfolio title), ink outline + hard shadow
  const name = layoutText(NAME.text, NAME.x, NAME.y, NAME.scale);
  const outline = dilate(name.cells);
  outline.forEach(([x, y]) => put(g, x + 1, y + 1, INK));
  outline.forEach(([x, y]) => put(g, x, y, INK));
  name.cells.forEach(([x, y, row]) => put(g, x, y, row >= 4 ? BUTTER : PAPER));

  // Tagline: plain pixel text on the sky with a 1px drop shadow (like the garden caption)
  const tag = layoutText(TAG.text, TAG.x, TAG.y, 1);
  tag.cells.forEach(([x, y]) => put(g, x + 1, y + 1, t.tag.shadow));
  tag.cells.forEach(([x, y]) => put(g, x, y, t.tag.text));
  const cursorX = TAG.x + tag.width + 3;

  return { g, cursor: { x: cursorX, y: TAG.y, w: 4, h: 7 } };
}

function buildClouds(t) {
  const g = makeGrid(LOOP * 2 + 40, H);
  const placed = [
    ['big', 8, 6],
    ['small', 70, 18],
    ['mid', 120, 4],
    ['big', 176, 14],
    ['small', 232, 6],
    ['mid', 286, 20],
  ];
  const shade = (x, y, sprite) => (y === sprite.length - 1 ? t.cloudShade : t.cloud);
  for (const [k, x, y] of placed) {
    stamp(g, CLOUDS[k], IN.x0 + x, y, shade);
    stamp(g, CLOUDS[k], IN.x0 + x + LOOP, y, shade);
  }
  return g;
}

const SPARKLES = [
  [292, 6, 0],
  [304, 30, -0.8],
  [214, 44, -1.6],
  [150, 50, -0.4],
  [246, 4, -2],
];
const BIRDS = [
  [232, 22],
  [242, 17],
  [252, 24],
];

function spriteGroup(sprite, positions, colour) {
  const g = makeGrid();
  positions.forEach(([x, y]) => stamp(g, sprite, x, y, colour));
  return toPaths(g);
}

// ---------- svg ----------

function render(themeName) {
  const t = THEMES[themeName];
  const fg = buildForeground(t);
  const breeze = swayers(t);

  const sparkles = SPARKLES.map(([x, y, delay]) => {
    const g = makeGrid();
    stamp(g, SPARKLE, x, y, t.star);
    return `<g class="twinkle" style="animation-delay:${delay}s">${toPaths(g)}</g>`;
  }).join('');

  const css = `
.clouds{animation:drift 120s steps(${LOOP}) infinite}
@keyframes drift{to{transform:translateX(-${LOOP}px)}}
.twinkle{opacity:0;animation:twinkle 2.4s steps(4) infinite}
@keyframes twinkle{0%,100%{opacity:0}40%,60%{opacity:1}}
.birds{animation:bob 3s infinite}
@keyframes bob{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(-1px)}}
.up,.down{animation:flap .7s infinite}
.down{animation-delay:-.35s}
@keyframes flap{0%,49%{opacity:1}50%,100%{opacity:0}}
.cursor{animation:blink 1.1s infinite}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.s{opacity:0;animation:${BREEZE.period}s steps(1,end) infinite}
.s${POSE_NAMES[UPRIGHT]}{opacity:1}
${POSE_NAMES.map((n) => `.s${n}{animation-name:s${n}}`).join('')}
${swingKeyframes()}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.twinkle{opacity:1}.down{opacity:0}}`;

  const c = fg.cursor;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" shape-rendering="crispEdges" role="img" aria-labelledby="title">
<title id="title">Vinuki Amarasinghe, fullstack engineer</title>
<style>${css}</style>
<defs><clipPath id="sky"><rect x="${IN.x0}" y="${IN.y0}" width="${LOOP}" height="${IN.y1 - IN.y0 + 1}"/></clipPath></defs>
<g>${toPaths(buildBackground(t))}</g>
<g class="breeze-mid">${renderBreezeLayer(breeze, 'mid')}</g>
<g>${toPaths(buildFrontHill(t))}</g>
<g class="breeze-front">${renderBreezeLayer(breeze, 'front')}</g>
<g clip-path="url(#sky)"><g class="clouds">${toPaths(buildClouds(t))}</g></g>
${sparkles}
<g class="birds"><g class="up">${spriteGroup(BIRD_UP, BIRDS, t.bird)}</g><g class="down">${spriteGroup(BIRD_DOWN, BIRDS, t.bird)}</g></g>
<g>${toPaths(fg.g)}</g>
<rect class="cursor" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${BUBBLE}"/>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const name of Object.keys(THEMES)) {
  const svg = render(name);
  const file = join(OUT, `hero-${name}.svg`);
  writeFileSync(file, svg, 'utf8');
  console.log(`${file}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
