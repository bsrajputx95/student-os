import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react(), publicContentBoundary()],
  server: { host: '127.0.0.1', port: 5180, strictPort: true, watch:{ignored:['**/data/**','**/.runtime/**']}, proxy: { '/api': 'http://127.0.0.1:5080' } },
});
