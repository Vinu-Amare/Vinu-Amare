// Builds the README trim: the sparkle divider between sections and the
// scalloped footer that closes the page (like the portfolio's footer).
// Output: assets/divider.svg, assets/footer-light.svg, assets/footer-dark.svg
// Run: node scripts/build-trim.mjs
//
// Same 320-cell width as the hero, so at width="100%" the pixels line up.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INK, PAPER, WHITE, BUTTER, BUBBLE, LILAC, makeGrid, put, toPaths, layoutText, dilate, stickerOutline } from './lib/pixel.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const W = 320;

const BIG_SPARKLE = ['..#..', '..#..', '##.##', '..#..', '..#..'];
const SMALL_SPARKLE = ['.....', '..#..', '.#.#.', '..#..', '.....'];
// bigger pair for the footer, sized to sit next to the 2x text
const FOOTER_BIG_SPARKLE = ['...#...', '...#...', '..#.#..', '###.###', '..#.#..', '...#...', '...#...'];
const FOOTER_SMALL_SPARKLE = ['.......', '...#...', '...#...', '.##.##.', '...#...', '...#...', '.......'];

// butter sprite with a white pixel in the middle
const sparkleCells = (sprite, ox, oy) => {
  const cells = [];
  sprite.forEach((row, y) => [...row].forEach((p, x) => p === '#' && cells.push([ox + x, oy + y, BUTTER])));
  const c = Math.floor(sprite.length / 2);
  cells.push([ox + c, oy + c, WHITE]);
  return cells;
};

// twinkle between the big and small sparkle (big most of the time)
const TWINKLE_CSS = `
.big{animation:big 2.4s steps(1,end) infinite}.small{opacity:0;animation:small 2.4s steps(1,end) infinite}
@keyframes big{0%{opacity:1}70%{opacity:0}85%{opacity:1}100%{opacity:1}}
@keyframes small{0%{opacity:0}70%{opacity:1}85%{opacity:0}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

const svgDoc = (w, h, title, css, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}" shape-rendering="crispEdges"${title ? ` role="img" aria-labelledby="title"` : ' aria-hidden="true"'}>
${title ? `<title id="title">${title}</title>\n` : ''}<style>${css}</style>
${body}
</svg>
`;

// ---------- divider ----------
// An even dotted lilac line that pales toward the ends, with a sparkle in a
// clear gap in the middle.

const DIVIDER_PAD = 4; // breathing room above and below the line

function divider() {
  const H = 7 + DIVIDER_PAD * 2;
  const lineY = DIVIDER_PAD + 3;
  const g = makeGrid(W, H);
  const mid = Math.floor(W / 2);
  for (let i = 3; i <= 24; i++) {
    const colour = i <= 14 ? LILAC : i <= 20 ? '#c9b6ff' : '#e2d8ff';
    put(g, mid - 4 * i + 2, lineY, colour);
    put(g, mid + 4 * i - 3, lineY, colour);
  }
  const sx = Math.floor(mid) - 2;
  const big = makeGrid(W, H);
  const small = makeGrid(W, H);
  sparkleCells(BIG_SPARKLE, sx, lineY - 2).forEach(([x, y, c]) => put(big, x, y, c));
  sparkleCells(SMALL_SPARKLE, sx, lineY - 2).forEach(([x, y, c]) => put(small, x, y, c));
  return svgDoc(W, H, '', TWINKLE_CSS, `<g>${toPaths(g)}</g>\n<g class="big">${toPaths(big)}</g><g class="small">${toPaths(small)}</g>`);
}

// ---------- footer ----------

// pad = clear space above the scallops so the footer doesn't crowd what's above it
const FOOTER = { h: 38, pad: 10, shadow: 3, text: 'THANKS FOR STOPPING BY!', scallop: 14, scallopHeight: 6 };
const FOOTER_THEMES = {
  light: { outline: INK, shadow: INK },
  dark: { outline: PAPER, shadow: LILAC },
};

function footer(themeName) {
  const t = FOOTER_THEMES[themeName];
  const { shadow: S } = FOOTER;
  const H = FOOTER.h + FOOTER.pad;
  const x0 = 1;
  const x1 = W - S - 2;
  const y1 = H - S - 2;
  const top = 8 + FOOTER.pad; // band starts here; scallops rise above it
  // scallops: round bumps along the top edge that dip all the way down to the band
  const r = FOOTER.scallop / 2 - 0.5; // half-width so the bump edges reach 0
  const scallopTop = (x) => {
    const dx = ((x - x0) % FOOTER.scallop) - r;
    return top - Math.round(FOOTER.scallopHeight * Math.sqrt(Math.max(0, 1 - (dx / (r + 0.5)) ** 2)));
  };
  const inside = (x, y) => {
    if (x < x0 || x > x1 || y > y1 || y < scallopTop(x)) return false;
    const dx = Math.min(x - x0, x1 - x);
    const dy = y1 - y;
    return !(dy < 3 && dx < 3 && dx + dy < 3); // rounded bottom corners
  };
  const near = (x, y, fn) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fn(x + dx, y + dy));
  const g = makeGrid(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (inside(x, y)) g[y][x] = y >= y1 - 1 ? '#e86fae' : BUBBLE; // shaded bottom rows
      else if (near(x, y, inside)) g[y][x] = t.outline;
      else if (inside(x - S, y - S) || near(x - S, y - S, inside)) g[y][x] = t.shadow;
    }

  // centred 2x text styled like the hero name: paper top, butter bottom,
  // ink outline + hard shadow; a sparkle twinkles after it
  const probe = layoutText(FOOTER.text, 0, 0, 2);
  const tx = Math.floor((x0 + x1 - probe.width - 10) / 2);
  const ty = top + Math.floor((y1 - top - 14) / 2);
  const text = layoutText(FOOTER.text, tx, ty, 2);
  const ring = dilate(text.cells);
  ring.forEach(([x, y]) => put(g, x + 1, y + 1, INK));
  ring.forEach(([x, y]) => put(g, x, y, INK));
  text.cells.forEach(([x, y, row]) => put(g, x, y, row >= 4 ? BUTTER : PAPER));

  const sx = tx + text.width + 5;
  const big = makeGrid(W, H);
  const small = makeGrid(W, H);
  sparkleCells(FOOTER_BIG_SPARKLE, sx, ty + 3).forEach(([x, y, c]) => put(big, x, y, c));
  sparkleCells(FOOTER_SMALL_SPARKLE, sx, ty + 3).forEach(([x, y, c]) => put(small, x, y, c));
  return svgDoc(W, H, 'Thanks for stopping by!', TWINKLE_CSS, `<g>${toPaths(g)}</g>\n<g class="big">${toPaths(big)}</g><g class="small">${toPaths(small)}</g>`);
}

// ---------- star ----------
// A single sticker-style sparkle centred under the footer: butter with an ink
// outline and white edge (reads on light and dark), twinkling big <-> small.

// solid four-point star (no gaps between the arms, so the outline stays clean)
const STAR_BIG = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
const STAR_SMALL = ['.......', '...#...', '..###..', '.#####.', '..###..', '...#...', '.......'];

function star() {
  const S = 13;
  const frame = (sprite) => {
    const g = makeGrid(S, S);
    const o = Math.floor((S - sprite.length) / 2);
    sparkleCells(sprite, o, o).forEach(([x, y, c]) => put(g, x, y, c));
    return toPaths(stickerOutline(g));
  };
  return svgDoc(S, S, '', TWINKLE_CSS, `<g class="big">${frame(STAR_BIG)}</g><g class="small">${frame(STAR_SMALL)}</g>`);
}

mkdirSync(OUT, { recursive: true });
const files = { 'divider.svg': divider(), 'footer-light.svg': footer('light'), 'footer-dark.svg': footer('dark'), 'star.svg': star() };
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(OUT, name), svg, 'utf8');
  console.log(`${name}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
