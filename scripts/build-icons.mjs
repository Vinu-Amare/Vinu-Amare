// Builds the small pixel bullet icons for the About section.
// Output: assets/icons/*.svg
// Run: node scripts/build-icons.mjs
//
// Each icon gets an ink outline plus a white sticker edge (like the portfolio
// stickers), so one file reads on both light and dark GitHub.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INK, PAPER, WHITE, BUTTER, BUBBLE, LILAC, MINT, MANGO, SKY, makeGrid, put, toPaths, stickerOutline } from './lib/pixel.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icons');

// letters map to colours; '.' is empty. Outline is added automatically.
const ICON_COLOURS = {
  M: MANGO, m: '#e88f35', Y: BUTTER, K: INK, W: WHITE, P: PAPER,
  L: LILAC, l: '#7a5fd0', G: MINT, g: '#2f9e78', D: MANGO, d: '#e88f35', S: SKY, B: BUBBLE,
};

const ICONS = {
  work: [
    '...KKK...',
    '...K.K...',
    'MMMMMMMMM',
    'MMMMMMMMM',
    'mmmmYmmmm',
    'MMMMMMMMM',
    'MMMMMMMMM',
  ],
  study: [
    '....L....',
    '..LLLLL..',
    'LLLLLLLLL',
    '..LLLLL.Y',
    '..lllll.Y',
    '..lllll.Y',
  ],
  ai: [
    '....Y...B',
    '....Y....',
    '...YYY...',
    'YYYYWYYYY',
    '...YYY...',
    '....Y....',
    '....Y....',
  ],
  learning: [
    '..GG.....',
    '.GGGG.GG.',
    '..GGGGGG.',
    '....g....',
    '....g....',
    '..DDDDD..',
    '..dDDDd..',
    '...DDD...',
  ],
};

function renderIcon(rows, palette = ICON_COLOURS) {
  const size = Math.max(rows[0].length, rows.length) + 4;
  const g = makeGrid(size, size);
  const ox = Math.floor((size - rows[0].length) / 2);
  const oy = Math.floor((size - rows.length) / 2);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && put(g, ox + x, oy + y, palette[ch])));
  stickerOutline(g);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 2}" height="${size * 2}" shape-rendering="crispEdges" aria-hidden="true">${toPaths(g)}</svg>\n`;
}

// Project folders, like the portfolio's folder grid: one sorbet colour each.
// B back + tab (shade), H front highlight, F front.
const FOLDER = [
  '.BBBB.......',
  'BBBBBBBBBBBB',
  'BHHHHHHHHHHB',
  'BFFFFFFFFFFB',
  'BFFFFFFFFFFB',
  'BFFFFFFFFFFB',
  'BFFFFFFFFFFB',
  'BBBBBBBBBBBB',
];
const FOLDER_COLOURS = {
  pink: { F: BUBBLE, B: '#e86fae', H: '#ffc2df' },
  lilac: { F: LILAC, B: '#8e6fe8', H: '#c9b6ff' },
  mint: { F: MINT, B: '#45bf91', H: '#9aeccb' },
  butter: { F: BUTTER, B: '#f2b92e', H: '#fff1a8' },
};

mkdirSync(OUT, { recursive: true });
for (const [name, rows] of Object.entries(ICONS)) writeFileSync(join(OUT, `${name}.svg`), renderIcon(rows), 'utf8');
for (const [name, colours] of Object.entries(FOLDER_COLOURS)) writeFileSync(join(OUT, `folder-${name}.svg`), renderIcon(FOLDER, colours), 'utf8');
console.log(`icons: ${Object.keys(ICONS).join(', ')}, folders: ${Object.keys(FOLDER_COLOURS).join(', ')}`);
