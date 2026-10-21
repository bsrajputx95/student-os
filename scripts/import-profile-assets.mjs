import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Stable fictional seeds; no student names or personal information reach DiceBear.
const count = 128;
const backgrounds = ['e8e0ff', 'dcecff', 'dcf6e8', 'ffe7d6', 'ffe3ee', 'e0f3f6', 'fff0c9', 'e6eaff'];
const root = new URL('../', import.meta.url);
const destination = new URL('public/avatars/', root);
mkdirSync(destination, {
  recursive: true
});
function validate(svg) {
  if (!/^\s*<svg\b/.test(svg) || !svg.includes('</svg>') || Buffer.byteLength(svg) > 500000) throw new Error('Unexpected SVG body or size.');
  if (/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|object|embed|image|style|animate|set)\b|\bon[a-z]+\s*=|javascript:|data:/i.test(svg)) throw new Error('Active or embedded content in SVG.');
  for (const match of svg.matchAll(/(?:\b(?:xlink:)?href|\bsrc)\s*=\s*(['"])(.*?)\1/gi)) if (!/^#[A-Za-z0-9_.:-]+$/.test(match[2])) throw new Error('External SVG reference.');
  for (const match of svg.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) if (!/^#[A-Za-z0-9_.:-]+$/.test(match[2])) throw new Error('External SVG paint reference.');
  return svg;
}
const records = [];
const failures = [];
async function importOne(index) {
  const id = 'campus-' + String(index + 1).padStart(3, '0');
  const seed = 'studentos-' + id;
  const source = new URL('https://api.dicebear.com/10.x/notionists/svg');
  source.searchParams.set('seed', seed);
  source.searchParams.set('backgroundColor', backgrounds[index % backgrounds.length]);
  source.searchParams.set('size', '128');
  const file = new URL(id + '.svg', destination);
  let svg;
  if (existsSync(file)) svg = validate(readFileSync(file, 'utf8'));else {
    let last;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(source, {
          signal: AbortSignal.timeout(20000)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        if (!response.headers.get('content-type')?.includes('svg')) throw new Error('Unexpected content type.');
        svg = validate(await response.text());
        writeFileSync(file, svg);
        break;
      } catch (error) {
        last = error;
        if (attempt < 2) await delay(600 * (attempt + 1));
      }
    }
    if (!svg) throw last;
  }
  return {
    id,
    path: '/avatars/' + id + '.svg',
    seed,
    background: backgrounds[index % backgrounds.length],
    source: source.href,
    creator: 'Zoish',
    style: 'DiceBear Notionists',
    license: 'CC0-1.0',
    retrievedAt: new Date().toISOString().slice(0, 10),
    bytes: Buffer.byteLength(svg),
    sha256: createHash('sha256').update(svg).digest('hex')
  };
}
for (let index = 0; index < count; index += 4) {
  const batch = await Promise.allSettled(Array.from({
    length: Math.min(4, count - index)
  }, (_, offset) => importOne(index + offset)));
  batch.forEach((result, offset) => {
    if (result.status === 'fulfilled') records.push(result.value);else failures.push({
      index: index + offset + 1,
      error: String(result.reason?.message || result.reason)
    });
  });
}
records.sort((a, b) => a.id.localeCompare(b.id));
if (failures.length) {
  console.error(JSON.stringify({
    imported: records.length,
    failures
  }));
  process.exitCode = 1;
} else {
  writeFileSync(new URL('shared/content/avatar-assets.json', root), JSON.stringify(records, null, 2) + '\n');
  writeFileSync(new URL('shared/content/avatar-paths.json', root), JSON.stringify(records.map(r => r.path)) + '\n');
  console.log(JSON.stringify({
    imported: records.length,
    totalBytes: records.reduce((total, asset) => total + asset.bytes, 0),
    uniqueImages: new Set(records.map(asset => asset.sha256)).size,
    failures
  }));
}
