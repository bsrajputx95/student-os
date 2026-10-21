import { readFileSync, readdirSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { parse } from '@babel/parser';
import generatorPackage from '@babel/generator';
import traversePackage from '@babel/traverse';
const generate = generatorPackage.default || generatorPackage,
  traverse = traversePackage.default || traversePackage;
const format = process.argv.includes('--format'),
  root = process.cwd();
const sharedGlobals = new Set([...Object.getOwnPropertyNames(globalThis), 'undefined', 'NaN', 'Infinity']);
const browserGlobals = ['window', 'document', 'location', 'history', 'navigator', 'self', 'parent', 'localStorage', 'sessionStorage', 'EventSource', 'Worker', 'requestAnimationFrame', 'cancelAnimationFrame', 'PopStateEvent', 'CustomEvent', 'MutationObserver', 'ResizeObserver', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'Node', 'NodeFilter', 'matchMedia'];
function files(directory) {
  return readdirSync(directory, {
    withFileTypes: true
  }).flatMap(entry => entry.isDirectory() ? files(resolve(directory, entry.name)) : ['.js', '.jsx', '.mjs'].includes(extname(entry.name)) ? [resolve(directory, entry.name)] : []);
}
let errors = 0,
  count = 0;
for (const path of ['src', 'shared', 'server', 'scripts', 'tests', 'api'].filter(directory => existsSync(resolve(root, directory))).flatMap(directory => files(resolve(root, directory)))) {
  const source = readFileSync(path, 'utf8'),
    relative = path.slice(root.length + 1).replaceAll('\\', '/');
  try {
    const ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'importAttributes']
      }),
      allowed = new Set(sharedGlobals);
    if (relative.startsWith('src/')) {
      browserGlobals.forEach(name => allowed.add(name));
      for (const name of ['process', 'global', 'Buffer', 'require', '__dirname', '__filename']) allowed.delete(name);
    }
    if (relative === 'scripts/cua-smoke.mjs') for (const name of [...browserGlobals, 'innerWidth']) allowed.add(name);
    traverse(ast, {
      ReferencedIdentifier(p) {
        const name = p.node.name;
        if (!p.scope.hasBinding(name) && !allowed.has(name)) {
          console.error(`${relative}:${p.node.loc.start.line}: undefined identifier ${name}`);
          errors++;
        }
      },
      DebuggerStatement(p) {
        console.error(`${relative}:${p.node.loc.start.line}: remove debugger before release`);
        errors++;
      }
    });
    if (format) {
      const formatted = generate(ast, {
        comments: true,
        compact: false,
        jsescOption: {
          minimal: true
        }
      }, source).code + '\n';
      if (formatted !== source) {
        const temporary = path + '.studentos-format.tmp';
        try {
          writeFileSync(temporary, formatted, {
            flag: 'wx'
          });
          renameSync(temporary, path);
        } finally {
          rmSync(temporary, {
            force: true
          });
        }
      }
    }
    count++;
  } catch (error) {
    console.error(`${relative}: ${error.message}`);
    errors++;
  }
}
if (errors) process.exitCode = 1;
console.log(`${format ? 'Formatted and checked' : 'Checked'} ${count} JavaScript modules; ${errors} issue(s).`);
