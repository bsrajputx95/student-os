import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
export function publicCachePlugin() {
  return {
    name: 'studentos-public-cache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const root = process.cwd(), paths = ['/index.html', '/favicon.svg'];
      const hash = createHash('sha256');
      for (const item of Object.values(bundle)) {
        paths.push('/' + item.fileName);
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const directory of ['fonts', 'brands', 'avatars', 'learning', 'icons']) {
        for (const item of readdirSync(resolve(root, 'public', directory), { withFileTypes: true })) {
          if (!item.isFile() || !/\.(woff2|svg|webp|png|jpg)$/.test(item.name)) continue;
          const path = '/' + directory + '/' + item.name;
          paths.push(path);
          hash.update(readFileSync(resolve(root, 'public' + path)));
        }
      }
      const template = readFileSync(resolve(root, 'src/service-worker.js'), 'utf8').replace('export function', 'function');
      hash.update(template).update(readFileSync(resolve(root, 'index.html'))).update(readFileSync(resolve(root, 'public/favicon.svg')));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: template + `\ninstallPublicCache(self, ${JSON.stringify(hash.digest('hex').slice(0, 16))}, ${JSON.stringify(paths)});\n` });
    }
  };
}
