// Builds the "BUILDING" ticker under the hero: a small label, and under it the
// kinds of systems I build gliding past like a slow conveyor belt.
// Output: assets/ticker-light.svg + assets/ticker-dark.svg
// Run: node scripts/build-ticker.mjs
//
// Same 320-cell width as the hero, so at width="100%" the pixels line up.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INK, PAPER, BUBBLE, BUTTER, LILAC, makeGrid, put, toPaths, layoutText } from './lib/pixel.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const LABEL = 'BUILDING';
const ITEMS = ['MOBILE APPS', 'EXECUTIVE SALES DASHBOARDS', 'RESTAURANT POS SYSTEMS', 'PHARMACY POS SYSTEMS', 'E-COMMERCE SITES'];
const SPEED = 6; // cells per second: slow and readable
const GAP = 7; // cells of space either side of each sparkle separator

const THEMES = {
  light: { label: '#7a5fd0', text: INK, sep: BUBBLE },
  dark: { label: LILAC, text: PAPER, sep: BUTTER },
};

const W = 320;
// vertical rhythm (cells): space from the hero, label, gap, belt, space before the divider
const PAD_TOP = 7;
const LABEL_Y = PAD_TOP;
const BELT_Y = LABEL_Y + 7 + 7;
const H = BELT_Y + 7 + 7;
const SPARKLE = ['..#..', '..#..', '##.##', '..#..', '..#..'];

// One full loop of the belt, laid out from x = 0: item, sparkle, item, sparkle, ...
function beltCells(t) {
  const cells = [];
  let x = 0;
  for (const item of ITEMS) {
    const seg = layoutText(item, x, BELT_Y);
    seg.cells.forEach(([cx, cy]) => cells.push([cx, cy, t.text]));
    x += seg.width + GAP;
    SPARKLE.forEach((row, dy) => [...row].forEach((p, dx) => p === '#' && cells.push([x + dx, BELT_Y + 1 + dy, t.sep])));
    x += 5 + GAP;
  }
  return { cells, loop: x };
}

function render(themeName) {
  const t = THEMES[themeName];

  // centred label
  const label = makeGrid(W, H);
  const lx = Math.floor((W - layoutText(LABEL, 0, 0).width) / 2);
  layoutText(LABEL, lx, LABEL_Y).cells.forEach(([x, y]) => put(label, x, y, t.label));

  // belt: two back-to-back copies slide left by exactly one loop, so it repeats seamlessly
  const { cells, loop } = beltCells(t);
  const copies = Math.ceil(W / loop) + 1;
  const belt = makeGrid(loop * copies, H);
  for (let c = 0; c < copies; c++) cells.forEach(([x, y, col]) => put(belt, x + c * loop, y, col));

  const duration = (loop / SPEED).toFixed(1);
  const css = `
.belt{animation:belt ${duration}s steps(${loop}) infinite}
@keyframes belt{to{transform:translateX(-${loop}px)}}
@media (prefers-reduced-motion:reduce){.belt{animation:none}}`;

  const title = `Building: ${ITEMS.map((s) => s.toLowerCase()).join(', ')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" shape-rendering="crispEdges" role="img" aria-labelledby="title">
<title id="title">${title}</title>
<style>${css}</style>
<defs>
<linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.14" stop-color="#fff"/><stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<mask id="edges" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
<clipPath id="strip"><rect width="${W}" height="${H}"/></clipPath>
</defs>
<g>${toPaths(label)}</g>
<g clip-path="url(#strip)" mask="url(#edges)"><g class="belt">${toPaths(belt)}</g></g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const name of Object.keys(THEMES)) {
  const svg = render(name);
  writeFileSync(join(OUT, `ticker-${name}.svg`), svg, 'utf8');
  console.log(`ticker-${name}.svg  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
