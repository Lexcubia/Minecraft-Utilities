/**
 * 写入 public/app-logo.svg — 128×128 逻辑像素 **木箱满铺画布**；四角圆角裁切；金属搭扣为 `U`。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const cfgPath = path.join(root, 'config', 'app-icons.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const logoOutputs = cfg.brandLogoSvg.outputsRelativeToRepoRoot;
if (!Array.isArray(logoOutputs) || logoOutputs.length === 0) {
  throw new Error(
    'config/app-icons.json: brandLogoSvg.outputsRelativeToRepoRoot must be a non-empty array',
  );
}

const PAL = {
  x: '#3a2818',
  A: '#6a4428',
  B: '#8a5c38',
  C: '#a87848',
  U: '#9aa4ac',
  N: '#4e565e',
  O: '#c8d0d8',
};

const W = 128;
const H = 128;
const SCALE = 2;
const VB = W * SCALE;

const CORNER_RADIUS_LOG = 10;

if (W !== H) {
  throw new Error('gen-app-logo-svg: W and H must be equal so four corners share one radius');
}

const LID_H = 50;
const LATCH_W = 22;
const LATCH_H = 11;

function insideRoundRect(x, y, width, height, rx) {
  const rx0 = Math.min(rx, Math.floor(width / 2));
  const ry0 = rx0;
  if (x >= rx0 && x < width - rx0) return true;
  if (y >= ry0 && y < height - ry0) return true;
  if (x < rx0 && y < ry0) {
    const dx = x - rx0;
    const dy = y - ry0;
    return dx * dx + dy * dy <= rx0 * rx0;
  }
  if (x >= width - rx0 && y < ry0) {
    const dx = x - (width - rx0);
    const dy = y - ry0;
    return dx * dx + dy * dy <= rx0 * rx0;
  }
  if (x < rx0 && y >= height - ry0) {
    const dx = x - rx0;
    const dy = y - (height - ry0);
    return dx * dx + dy * dy <= rx0 * rx0;
  }
  if (x >= width - rx0 && y >= height - ry0) {
    const dx = x - (width - rx0);
    const dy = y - (height - ry0);
    return dx * dx + dy * dy <= rx0 * rx0;
  }
  return false;
}

function inClip(x, y) {
  const r = Math.min(CORNER_RADIUS_LOG, Math.floor(W / 2));
  return insideRoundRect(x, y, W, W, r);
}

function blitRect(grid, x0, y0, x1, y1, ch) {
  const xa = Math.max(0, Math.min(x0, x1));
  const xb = Math.min(W - 1, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1));
  const yb = Math.min(H - 1, Math.max(y0, y1));
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      if (inClip(x, y)) grid[y][x] = ch;
    }
  }
}

function paintSquareChest(grid) {
  const L = 0;
  const R = W - 1;
  const T = 0;
  const B = H - 1;

  blitRect(grid, L, T, R, T, 'x');
  blitRect(grid, L, B, R, B, 'x');
  blitRect(grid, L, T + 1, L, B - 1, 'x');
  blitRect(grid, R, T + 1, R, B - 1, 'x');

  blitRect(grid, L + 1, T + 1, R - 1, B - 1, 'A');
  blitRect(grid, L + 1, T + 1, R - 1, T + LID_H, 'B');
  blitRect(grid, L + 1, T + 1, R - 1, T + 6, 'C');

  const seamY = T + LID_H + 1;
  blitRect(grid, L + 1, seamY, R - 1, seamY, 'x');

  const innerL = L + 1;
  const innerR = R - 1;
  const midX = (innerL + innerR) / 2;
  const latchL = Math.round(midX - (LATCH_W - 1) / 2);
  const latchR = latchL + LATCH_W - 1;
  const half = Math.floor(LATCH_H / 2);
  const latchT = seamY - half;
  const latchB = seamY + half;

  blitRect(grid, latchL, latchT, latchR, latchB, 'U');
  blitRect(grid, latchL, latchT, latchL, latchB, 'N');
  blitRect(grid, latchR, latchT, latchR, latchB, 'N');
  blitRect(grid, latchL, latchT, latchR, latchT, 'N');
  blitRect(grid, latchL, latchB, latchR, latchB, 'N');
  blitRect(grid, latchL + 3, seamY - 1, latchL + 3, seamY - 1, 'O');
}

function buildPixelChestGrid() {
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));
  paintSquareChest(grid);
  return grid.map((row) => row.join(''));
}

const ROWS = buildPixelChestGrid();

function rowRects(y) {
  const row = ROWS[y];
  const parts = [];
  for (let x = 0; x < W; ) {
    const ch = row[x];
    if (ch === '.') {
      x++;
      continue;
    }
    const fill = PAL[ch];
    if (!fill) throw new Error(`Unknown palette key: ${ch}`);
    let w = 1;
    while (x + w < W && row[x + w] === ch) w++;
    parts.push(
      `<rect x="${x * SCALE}" y="${y * SCALE}" width="${w * SCALE}" height="${SCALE}" fill="${fill}"/>`,
    );
    x += w;
  }
  return parts.join('\n  ');
}

const pixelLines = [];
for (let y = 0; y < H; y++) {
  const line = rowRects(y);
  if (line) pixelLines.push(line);
}
const pixels = pixelLines.join('\n  ');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" role="img" aria-label="Minecraft Utilities">
  <title>Minecraft Utilities</title>
  <g shape-rendering="crispEdges">
    ${pixels}
  </g>
</svg>
`;

for (const rel of logoOutputs) {
  const out = path.join(root, ...rel.split(/[/\\]/));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, svg, 'utf8');
}
