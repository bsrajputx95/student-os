import { mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { learningResources } from '../shared/learning-library.js';
const results = [];
for (let offset = 0; offset < learningResources.length; offset += 4) {
  await Promise.all(learningResources.slice(offset, offset + 4).map(async item => {
    try {
      const response = await fetch(item.url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent': 'StudentOS-LearningCatalog/1.0 (source-link-check)'
        }
      });
      const html = await response.text();
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, ' ').trim().slice(0, 200);
      results.push({
        id: item.id,
        source: item.url,
        resolvedSource: response.url,
        status: response.status,
        title: title || item.title,
        retrievedAt: new Date().toISOString(),
        attribution: item.provider
      });
    } catch (error) {
      results.push({
        id: item.id,
        source: item.url,
        title: item.title,
        status: null,
        error: error.message,
        retrievedAt: new Date().toISOString(),
        attribution: item.provider
      });
    }
  }));
}
results.sort((a, b) => a.id.localeCompare(b.id));
mkdirSync('shared/content', {
  recursive: true
});
const failed = results.some(r => !r.status || r.status >= 300);
if (failed) process.exitCode = 1;else {
  const temporary = 'shared/content/learning-sources.json.tmp';
  try {
    writeFileSync(temporary, JSON.stringify(results, null, 2) + '\n', {
      flag: 'wx'
    });
    renameSync(temporary, 'shared/content/learning-sources.json');
  } finally {
    rmSync(temporary, {
      force: true
    });
  }
}
console.log(JSON.stringify({
  checked: results.length,
  successful: results.filter(r => r.status >= 200 && r.status < 300).length,
  needsReview: results.filter(r => !r.status || r.status >= 300).map(r => ({
    id: r.id,
    status: r.status,
    error: r.error
  }))
}));
