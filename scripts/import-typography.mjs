import { mkdirSync, writeFileSync } from 'node:fs';
const source = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700&family=Manrope:wght@400..800&display=swap';
const response = await fetch(source, {
  headers: {
    'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'
  },
  signal: AbortSignal.timeout(20000)
});
if (!response.ok) throw new Error('Typography source unavailable.');
const css = await response.text();
mkdirSync('public/fonts', {
  recursive: true
});
const records = [];
for (const [family, slug] of [['DM Sans', 'dm-sans'], ['Manrope', 'manrope']]) {
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(m => m[1]);
  const block = blocks.find(b => b.includes("'" + family + "'") && b.includes('U+0000-00FF'));
  const url = block?.match(/url\(([^)]+)\)/)?.[1];
  if (!url || !url.startsWith('https://fonts.gstatic.com/')) throw new Error('Expected Latin font file was not returned.');
  const font = await fetch(url, {
    signal: AbortSignal.timeout(20000)
  });
  if (!font.ok) throw new Error('Font download unavailable.');
  const bytes = Buffer.from(await font.arrayBuffer());
  if (bytes.subarray(0, 4).toString() !== 'wOF2' || bytes.length > 300000) throw new Error('Unexpected font format.');
  writeFileSync('public/fonts/' + slug + '-latin.woff2', bytes);
  const licenseUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + slug.replaceAll('-', '') + '/OFL.txt';
  const license = await fetch(licenseUrl, {
    signal: AbortSignal.timeout(20000)
  });
  if (!license.ok) throw new Error('Font license unavailable.');
  writeFileSync('public/fonts/' + slug + '-OFL.txt', (await license.text()).replace(/[ \t]+$/gm, ''));
  records.push({
    family,
    path: '/fonts/' + slug + '-latin.woff2',
    source: url,
    license: licenseUrl,
    bytes: bytes.length,
    retrievedAt: new Date().toISOString().slice(0, 10)
  });
}
writeFileSync('shared/content/typography.json', JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify(records.map(({
  family,
  bytes
}) => ({
  family,
  bytes
}))));
