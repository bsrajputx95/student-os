import { mkdirSync, writeFileSync } from 'node:fs';
import { projectLabs, projectFiles } from '../shared/assessments.js';
import { zipFiles } from '../shared/zip.js';
mkdirSync(new URL('../public/assessment-kits/', import.meta.url), {
  recursive: true
});
for (const lab of projectLabs) writeFileSync(new URL('../public/assessment-kits/' + lab.id + '.zip', import.meta.url), zipFiles(projectFiles(lab)));
console.log(`${projectLabs.length} runnable starter ZIP projects created.`);
