// Builds the "contribution garden": one column per week of the last year,
// busier weeks grow taller flowers, with a caption sticker for the stats.
// Output: assets/garden-light.svg + assets/garden-dark.svg
//
// Run (GitHub Action / with a token):  GITHUB_TOKEN=... node scripts/build-garden.mjs --user Vinu-Amare
// Run (preview from saved data):       node scripts/build-garden.mjs --from days.json
//   days.json = [{ "date": "2026-01-31", "count": 3 }, ...]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  INK, PAPER, WHITE, BUTTER, BUBBLE, TOMATO, LILAC, SKY, MANGO,
  makeGrid, put, toPaths, inRound, noise, layoutText,
} from './lib/pixel.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

// ---------- data ----------

async function fetchDays(login, token) {
  const query = `query($login: String!) {
    user(login: $login) { contributionsCollection { contributionCalendar {
      weeks { contributionDays { date contributionCount } }
    } } }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'readme-garden' },
    body: JSON.stringify({ query, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));
}

function stats(days) {
  const total = days.reduce((s, d) => s + d.count, 0);
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // today may still be in progress, so a zero today doesn't break the streak
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let current = 0;
  while (i >= 0 && days[i].count) current++, i--;
  return { total, longest, current };
}

function weekTotals(days) {
  const firstDow = new Date(`${days[0].date}T00:00:00Z`).getUTCDay(); // calendar weeks start on Sunday
  const weeks = [];
  days.forEach((d, i) => {
    const w = Math.floor((i + firstDow) / 7);
    weeks[w] = (weeks[w] ?? 0) + d.count;
  });
  return weeks.map((n) => n ?? 0);
}

// 0 = no contributions, 1-4 = quartiles of the active weeks (like GitHub's own levels)
function levels(weeks) {
  const active = weeks.filter(Boolean).sort((a, b) => a - b);
  const q = (p) => active[Math.min(active.length - 1, Math.floor(p * active.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return weeks.map((n) => (!n ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4));
}

// ---------- scene ----------

const W = 320;
const H = 64;
const SHADOW = 3;
const BOX = { x0: 0, y0: 0, x1: W - SHADOW - 1, y1: H - SHADOW - 1 };
const IN = { x0: 2, y0: 2, x1: BOX.x1 - 2, y1: BOX.y1 - 2 };
const COL = 5; // cells per week

const THEMES = {
  light: {
    frame: INK, shadow: INK,
    sky: [[0, '#e6b9f2'], [18, '#ffc0de'], [32, '#ffd3a6']],
    back: { base: '#a88bff', light: '#c7b3ff' },
    front: { base: '#5ed6a8', light: '#9aeccb', shade: '#45bf91' },
    stem: '#2f9e78', star: WHITE,
    text: { base: INK, num: '#c2307a', sep: '#7a5fd0', shadow: WHITE },
  },
  dark: {
    frame: PAPER, shadow: LILAC,
    sky: [[0, '#2b1d3a'], [18, '#3d2a5c'], [32, '#6a4a9a']],
    back: { base: '#5a46a8', light: '#7d68d0' },
    front: { base: '#2a9a72', light: '#4fc497', shade: '#1f7a5a' },
    stem: '#1f7a5a', star: '#fff1a8',
    text: { base: PAPER, num: BUTTER, sep: LILAC, shadow: INK },
  },
};

const backTop = (x) => Math.round(43 + 2.5 * Math.sin(x * 0.045 + 1) + Math.sin(x * 0.12));
const frontTop = (x) => Math.round(50 + 2 * Math.sin(x * 0.03 + 2) + Math.sin(x * 0.17));

const PETALS = [BUBBLE, LILAC, WHITE, SKY, TOMATO, MANGO];
const STEM = [0, 4, 7, 11, 16]; // stem height per level

const skyAt = (sky, x, y) => {
  let i = 0;
  while (i + 1 < sky.length && y >= sky[i + 1][0]) i++;
  const next = sky[i + 1];
  if (next && next[0] - y === 1 && (x + y) % 2 === 0) return next[1];
  return sky[i][1];
};

function buildBackground(t) {
  const g = makeGrid(W, H);
  const shadowBox = { x0: SHADOW, y0: SHADOW, x1: BOX.x1 + SHADOW, y1: BOX.y1 + SHADOW };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (inRound(x, y, IN, 2)) {
        let c = skyAt(t.sky, x, y);
        const bt = backTop(x);
        const ft = frontTop(x);
        if (y >= bt) c = y === bt ? t.back.light : t.back.base;
        if (y >= ft) c = y === ft ? t.front.light : noise(x, y, 4) < 0.07 ? t.front.shade : t.front.base;
        g[y][x] = c;
      } else if (inRound(x, y, BOX, 3)) g[y][x] = t.frame;
      else if (inRound(x, y, shadowBox, 3)) g[y][x] = t.shadow;
    }
  return g;
}

// Grass blade at x in pose d: 2 cells tall, the tip leans with the breeze.
const hasBlade = (x) => noise(x, 0, 11) < 0.3;
const blade = (x, d, t) => {
  const top = frontTop(x);
  return [[x, top - 1, t.front.light], [x + d, top - 2, t.front.light]];
};

// One flower in pose d (-1 lean left, 0 upright, 1 lean right) -> [x, y, colour][]
function flower(x, level, week, d, t) {
  const top = frontTop(x);
  const h = STEM[level];
  if (!h) return [];
  const cells = [];
  for (let i = 1; i <= h; i++) cells.push([x + (i > h * 0.6 ? d : 0), top - i, t.stem]);
  if (h >= 7) cells.push([x - 1, top - Math.floor(h / 2), t.front.light]);
  if (h >= 11) cells.push([x + 1, top - Math.floor(h * 0.7), t.front.light]);
  const hx = x + (h > 4 ? d : 0);
  const hy = top - h - 1;
  const petal = PETALS[week % PETALS.length];
  const centre = petal === MANGO ? TOMATO : BUTTER;
  const at = (dx, dy, c) => cells.push([hx + dx, hy + dy, c]);
  if (level === 1) {
    // bud
    at(0, 0, petal);
    at(0, -1, petal);
    return cells;
  }
  // level 2: cross; level 3: full ring; level 4: ring + long tips + a shine pixel
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => at(dx, dy, petal));
  if (level >= 3) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => at(dx, dy, petal));
  if (level === 4) {
    [[-2, 0], [2, 0], [0, -2], [0, 2]].forEach(([dx, dy]) => at(dx, dy, petal));
    at(-1, -1, WHITE);
  }
  at(0, 0, centre);
  return cells;
}

// pendulum sway: upright, right, right, upright, left, left
const SWING = [0, 1, 1, 0, -1, -1];
const SWAY = { period: 4, lag: 0.09 };

function render(themeName, weeks, lv, s) {
  const t = THEMES[themeName];
  const startX = IN.x0 + Math.floor((IN.x1 - IN.x0 + 1 - weeks.length * COL) / 2) + 2;

  // The meadow is cut into 5-cell columns (one per week, plus margin columns
  // at the edges). Each column gets one group per pose (its grass blades and
  // flower), delayed by column so the breeze ripples across left to right.
  const poses = [-1, 0, 1];
  const half = Math.floor(COL / 2);
  const colOf = (x) => Math.floor((x - startX + half) / COL);
  let garden = '';
  for (let w = colOf(IN.x0 + 1); w <= colOf(IN.x1 - 1); w++) {
    const fx = startX + w * COL; // flower x for this column
    const hasFlower = w >= 0 && w < weeks.length && lv[w] > 0;
    const xs = [];
    for (let x = Math.max(fx - half, IN.x0 + 1); x <= Math.min(fx + half, IN.x1 - 1); x++) xs.push(x);
    const lagged = (((w * SWAY.lag) % SWAY.period) + SWAY.period) % SWAY.period;
    const delay = -(SWAY.period - lagged).toFixed(3);
    poses.forEach((d) => {
      const g = makeGrid(W, H);
      xs.filter((x) => hasBlade(x) && !(hasFlower && x === fx)).forEach((x) => blade(x, d, t).forEach(([cx, cy, c]) => put(g, cx, cy, c)));
      if (hasFlower) flower(fx, lv[w], w, d, t).forEach(([cx, cy, c]) => put(g, cx, cy, c));
      garden += `<g class="p p${d + 1}" style="animation-delay:${delay}s">${toPaths(g)}</g>`;
    });
  }

  // stats caption: plain pixel text on the sky with a 1px drop shadow,
  // numbers picked out in an accent colour
  const caption = [
    [s.total.toLocaleString('en-US'), t.text.num],
    [' CONTRIBUTIONS ', t.text.base],
    ['/', t.text.sep],
    [' LONGEST STREAK ', t.text.base],
    [String(s.longest), t.text.num],
    [' DAYS', t.text.base],
  ];
  const fg = makeGrid(W, H);
  const glyphs = [];
  let cx = IN.x0 + 6;
  const cy = IN.y0 + 5;
  for (const [str, colour] of caption) {
    const seg = layoutText(str, cx, cy);
    seg.cells.forEach(([x, y]) => glyphs.push([x, y, colour]));
    cx += seg.width + 1;
  }
  glyphs.forEach(([x, y]) => put(fg, x + 1, y + 1, t.text.shadow));
  glyphs.forEach(([x, y, c]) => put(fg, x, y, c));
  const captionEnd = cx;

  // a few twinkling sparkles in the sky, clear of the caption
  const sparkles = [[captionEnd + 14, 6, 0], [captionEnd + 30, 16, -0.9], [W - 26, 8, -1.7]]
    .filter(([x]) => x < IN.x1 - 4)
    .map(([x, y, delay]) => {
      const g = makeGrid(W, H);
      [[2, 0], [2, 1], [0, 2], [1, 2], [3, 2], [4, 2], [2, 3], [2, 4]].forEach(([dx, dy]) => put(g, x + dx, y + dy, t.star));
      return `<g class="twinkle" style="animation-delay:${delay}s">${toPaths(g)}</g>`;
    })
    .join('');

  const swingFrames = (p) => {
    const frames = SWING.map((d, i) => `${+((i * 100) / SWING.length).toFixed(3)}%{opacity:${d === p ? 1 : 0}}`);
    frames.push(`100%{opacity:${SWING[0] === p ? 1 : 0}}`);
    return frames.join('');
  };
  const css = `
.p{opacity:0;animation:${SWAY.period}s steps(1,end) infinite}.p1{opacity:1}
.p0{animation-name:p0}.p1{animation-name:p1}.p2{animation-name:p2}
@keyframes p0{${swingFrames(-1)}}
@keyframes p1{${swingFrames(0)}}
@keyframes p2{${swingFrames(1)}}
.twinkle{opacity:0;animation:twinkle 2.4s steps(4) infinite}
@keyframes twinkle{0%,100%{opacity:0}40%,60%{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.twinkle{opacity:1}}`;

  const title = `Contribution garden: ${s.total.toLocaleString('en-US')} contributions in the last year, longest streak ${s.longest} days, current streak ${s.current} days. Each flower is a week; busier weeks grow taller.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" shape-rendering="crispEdges" role="img" aria-labelledby="title">
<title id="title">${title}</title>
<style>${css}</style>
<g>${toPaths(buildBackground(t))}</g>
${sparkles}
<g>${garden}</g>
<g>${toPaths(fg)}</g>
</svg>
`;
}

// ---------- main ----------

const { values: args } = parseArgs({ options: { user: { type: 'string', default: 'Vinu-Amare' }, from: { type: 'string' } } });
let days;
if (args.from) days = JSON.parse(readFileSync(args.from, 'utf8'));
else {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN, or pass --from days.json for an offline preview');
  days = await fetchDays(args.user, token);
}
days.sort((a, b) => a.date.localeCompare(b.date));

const weeks = weekTotals(days);
const lv = levels(weeks);
const s = stats(days);
mkdirSync(OUT, { recursive: true });
for (const name of Object.keys(THEMES)) {
  const svg = render(name, weeks, lv, s);
  writeFileSync(join(OUT, `garden-${name}.svg`), svg, 'utf8');
  console.log(`garden-${name}.svg  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
console.log(`${weeks.length} weeks, ${s.total} contributions, longest streak ${s.longest}, current ${s.current}, levels ${[0, 1, 2, 3, 4].map((l) => lv.filter((x) => x === l).length).join('/')}`);
