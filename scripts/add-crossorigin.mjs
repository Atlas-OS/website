/**
 * Post-build script: add crossorigin="anonymous" to JS preload/modulepreload
 * links in every HTML file under ./dist. Run after `jampack ./dist` so that
 * any preload hints Jampack injects or rewrites are also covered.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const jsPreloadLinkPattern =
  /<link\b(?=[^>]*\brel=["'](?:modulepreload|preload)["'])(?=[^>]*(?:\bas=["']script["']|\.js(?:["'?#])))(?![^>]*\bcrossorigin\b)[^>]*>/gi;

function addCrossoriginToJsPreloads(html) {
  return html.replace(jsPreloadLinkPattern, (tag) => {
    const insertAt = tag.endsWith('/>') ? tag.length - 2 : tag.length - 1;
    return `${tag.slice(0, insertAt)} crossorigin="anonymous"${tag.slice(insertAt)}`;
  });
}

async function* walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

for await (const filePath of walkFiles(distDir)) {
  if (!filePath.endsWith('.html')) continue;

  const html = await readFile(filePath, 'utf8');
  const updatedHtml = addCrossoriginToJsPreloads(html);

  if (updatedHtml !== html) {
    await writeFile(filePath, updatedHtml);
  }
}
