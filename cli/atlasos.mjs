#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';

const site = 'https://atlasos.net';
const api = 'https://api.atlasos.net';
const latestRelease = 'https://api.github.com/repos/Atlas-OS/Atlas/releases/latest';
const help = `Usage: atlasos <release|docs|stats> [--json]

  release   Show the latest stable Atlas release and Atlas Manager download link.
  docs      List the official requirements, install, upgrade, and troubleshooting guides.
  stats     Show public Atlas download and GitHub star counts.

Options: -h, --help, --json`;

async function getJson(url) {
  const response = await globalThis.fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'AtlasOS-CLI' },
    signal: globalThis.AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

const commands = {
  async release() {
    const release = await getJson(latestRelease);
    const manager = release.assets.find((asset) => asset.name === 'AtlasManager.exe');
    return {
      version: release.tag_name,
      release: release.html_url,
      atlasManager: manager?.browser_download_url ?? null,
    };
  },
  docs() {
    return {
      requirements: `${site}/docs/install/requirements/`,
      install: `${site}/docs/install/manager/`,
      upgrade: `${site}/docs/upgrade/`,
      troubleshooting: `${site}/docs/faq/`,
      markdownIndex: `${site}/llms.txt`,
    };
  },
  async stats() {
    const [downloads, stars] = await Promise.all([getJson(`${api}/`), getJson(`${api}/stars`)]);
    const atlas = downloads.find((row) => row.version === 'atlas');
    if (!atlas) throw new Error('The Atlas download count is currently unavailable.');
    return { downloads: atlas.count, stars: stars.count };
  },
};

const [command, ...options] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h' || command === 'help') {
  console.log(help);
} else if (
  !Object.hasOwn(commands, command) ||
  options.length > 1 ||
  options.some((option) => option !== '--json')
) {
  console.error(help);
  process.exitCode = 1;
} else {
  try {
    const data = await commands[command]();
    console.log(
      options.includes('--json')
        ? JSON.stringify(data, null, 2)
        : Object.entries(data)
            .map(([key, value]) => `${key}: ${value ?? 'Unavailable'}`)
            .join('\n')
    );
  } catch (error) {
    console.error(`atlasos: ${error.message}`);
    process.exitCode = 1;
  }
}
