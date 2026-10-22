import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const images = [{
  id: 'code',
  photo: 'photo-1542831371-29b0f74f9713',
  author: 'Florian Olivo',
  source: 'https://unsplash.com/photos/lines-of-html-codes-4hbJ-eymZ1o'
}, {
  id: 'infrastructure',
  photo: 'photo-1558494949-ef010cbdcc31',
  author: 'Taylor Vick',
  source: 'https://unsplash.com/photos/cable-network-M5tzZtFCOfs'
}, {
  id: 'analytics',
  photo: 'photo-1551288049-bebda4e38f71',
  author: 'Luke Chesser',
  source: 'https://unsplash.com/photos/graphs-of-performance-analytics-on-a-laptop-screen-JKUTrJ4vK00'
}];
mkdirSync('public/learning', {
  recursive: true
});
const results = [];
for (const item of images) for (const width of [640, 1200]) {
  const url = `https://images.unsplash.com/${item.photo}?auto=format&fit=crop&fm=webp&w=${width}&h=${Math.round(width * .625)}&q=78`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image download failed: ${item.id}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 2000 || bytes.length > 600000 || bytes.subarray(8, 12).toString() !== 'WEBP') throw new Error('Invalid or oversized thumbnail');
  const path = `/learning/${item.id}-${width}.webp`;
  writeFileSync('public' + path, bytes);
  results.push({
    ...item,
    path,
    width,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    retrievedAt: new Date().toISOString(),
    license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license'
  });
}
writeFileSync('shared/content/learning-images.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({
  imported: results.length,
  totalBytes: results.reduce((n, r) => n + r.bytes, 0)
}));
