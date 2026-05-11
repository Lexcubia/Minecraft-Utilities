/**
 * Writes public/app-logo.svg — 16×16 pixel grass block (Minecraft-style),
 * 32×32 SVG units, shape-rendering crispEdges.
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
  0: '#5fb134', // grass light
  1: '#4a9c2d', // grass mid
  2: '#3d7f28', // grass dark
  3: '#7bc85a', // grass highlight
  4: '#2d5a1f', // grass shadow line
  5: '#8b6a3d', // dirt light
  6: '#6b4f2d', // dirt mid
  7: '#5a4224', // dirt dark
  8: '#4a351c', // dirt deeper
};

/** 16×16: top = grass pattern, bottom = dirt */
const ROWS = [
  '0000000000000000',
  '0301010101010303',
  '0101010101010101',
  '0000440000440000',
  '0201010101010202',
  '0101010101010101',
  '4444444444444444',
  '5555555555555555',
  '5656565656565656',
  '5555555555555555',
  '6767676767676767',
  '5555555555555555',
  '7878787878787878',
  '5555555555555555',
  '8787878787878787',
  '5555555555555555',
];

function rowRects(y) {
  const row = ROWS[y];
  const parts = [];
  for (let x = 0; x < 16; ) {
    const ch = row[x];
    const fill = PAL[ch];
    let w = 1;
    while (x + w < 16 && row[x + w] === ch) w++;
    parts.push(`<rect x="${x * 2}" y="${y * 2}" width="${w * 2}" height="2" fill="${fill}"/>`);
    x += w;
  }
  return parts.join('\n  ');
}

const body = ROWS.map((_, y) => rowRects(y)).join('\n  ');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges" role="img" aria-label="Minecraft Utilities">
  <title>Minecraft Utilities</title>
  ${body}
</svg>
`;

for (const rel of logoOutputs) {
  const out = path.join(root, ...rel.split(/[/\\]/));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, svg, 'utf8');
}
