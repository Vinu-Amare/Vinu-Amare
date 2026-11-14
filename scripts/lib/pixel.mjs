// Shared pixel-art helpers for the README asset generators:
// palette tokens, a cell grid, path merging, and a 5x7 pixel font.

// Portfolio tokens
export const INK = '#2b1d3a';
export const PAPER = '#fff4e6';
export const BUTTER = '#ffd84d';
export const BUBBLE = '#ff8cc6';
export const TOMATO = '#ff5b4a';
export const WHITE = '#ffffff';
export const LILAC = '#a88bff';
export const MINT = '#5ed6a8';
export const SKY = '#6cc4ff';
export const MANGO = '#ffa94d';

// ---------- grid helpers ----------

export const makeGrid = (w, h) =>
  Array.from({ length: h }, () => Array(w).fill(null));

export const put = (g, x, y, c) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
};

// Merge horizontal runs of one colour into a single path per colour.
export const toPaths = (g) => {
  const byColour = new Map();
  for (let y = 0; y < g.length; y++) {
    let x = 0;
    while (x < g[y].length) {
      const c = g[y][x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < g[y].length && g[y][x + w] === c) w++;
      if (!byColour.has(c)) byColour.set(c, []);
      byColour.get(c).push(`M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  }
  return [...byColour]
    .map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`)
    .join('');
};

// Rounded rect with a pixel staircase corner (cells with dx+dy<r are cut).
export const inRound = (x, y, b, r) => {
  if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) return false;
  const dx = Math.min(x - b.x0, b.x1 - x);
  const dy = Math.min(y - b.y0, b.y1 - y);
  return dx + dy >= r;
};

// Deterministic noise so every build is identical.
export const noise = (x, y, seed = 1) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---------- 5x7 pixel font ----------

export const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ',': ['..', '..', '..', '..', '##', '##', '.#'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

// Returns { cells: [[x, y, row]], width } at the given scale.
export const layoutText = (str, ox, oy, scale = 1) => {
  const cells = [];
  let cx = ox;
  for (const ch of str) {
    const glyph = FONT[ch];
    if (!glyph) throw new Error(`No glyph for "${ch}"`);
    glyph.forEach((row, ry) => {
      [...row].forEach((p, rx) => {
        if (p !== '#') return;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++)
            cells.push([cx + rx * scale + sx, oy + ry * scale + sy, ry]);
      });
    });
    cx += (glyph[0].length + 1) * scale;
  }
  return { cells, width: cx - ox - scale };
};

export const dilate = (cells) => {
  const out = new Set();
  for (const [x, y] of cells)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) out.add(`${x + dx},${y + dy}`);
  return [...out].map((k) => k.split(',').map(Number));
};

// Draw an ASCII sprite ("#" = filled) onto the grid.
export const stamp = (g, sprite, ox, oy, colour) =>
  sprite.forEach((row, y) =>
    [...row].forEach((p, x) => {
      if (p === '#') put(g, ox + x, oy + y, typeof colour === 'function' ? colour(x, y, sprite) : colour);
    }),
  );

// Ink outline around every filled cell, then a white sticker edge around that.
export function stickerOutline(g) {
  const h = g.length;
  const w = g[0].length;
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && g[y][x];
  const pass = (colour, diagonal) => {
    const add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (g[y][x]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        if (diagonal) n.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        if (n.some(([dx, dy]) => filled(x + dx, y + dy))) add.push([x, y]);
      }
    add.forEach(([x, y]) => (g[y][x] = colour));
  };
  pass(INK, false);
  pass(WHITE, true);
  return g;
}
