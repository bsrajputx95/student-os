import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { catalog } from './shared/catalog.js';
// Publish exactly the already-sanitized public API shape as a hashed CDN asset.
// Scoring modules are evaluated by the build, never imported into browser code.
function publicCatalogAsset() {
  let reference, build = false;
  return {
    name: 'studentos-public-catalog-asset',
    configResolved(config) { build = config.command === 'build'; },
    buildStart() { if (build) reference = this.emitFile({ type: 'asset', name: 'learning-catalog.json', source: JSON.stringify(catalog) }); },
    resolveId(id) { if (id === 'virtual:studentos-catalog-url') return '\0studentos-catalog-url'; },
    load(id) { if (id === '\0studentos-catalog-url') return build ? `export default import.meta.ROLLUP_FILE_URL_${reference};` : 'export default "/api/catalog";'; }
  };
}
// Shared navigation may use public metadata, but must never bundle scoring keys.
function publicContentBoundary() {
  return {
    name: 'studentos-public-content-boundary',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const moduleId of Object.keys(chunk.modules)) {
          const path = moduleId.replaceAll('\\', '/');
          if (/\/server\//.test(path) || /\/shared\/(catalog|curriculum|advanced-curriculum|core-quizzes|role-quizzes)\.js$/.test(path)) {
            this.error('Private assessment content reached a browser bundle: ' + path);
          }
        }
      }
    }
  };
}
export default defineConfig({
  plugins: [react(), publicCatalogAsset(), publicContentBoundary()],
  server: { host: '127.0.0.1', port: 5180, strictPort: true, watch:{ignored:['**/data/**','**/.runtime/**']}, proxy: { '/api': 'http://127.0.0.1:5080' } },
});
