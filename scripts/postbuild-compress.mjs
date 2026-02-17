import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { brotli, gzip, walkDir, zstd } from 'astro-compressor/dist/compress.js';

const fileExtensions = [
  '.css',
  '.js',
  '.html',
  '.xml',
  '.cjs',
  '.mjs',
  '.svg',
  '.txt',
  '.json',
  '.pagefind',
  '.pf_meta',
  '.pf_fragment',
  '.pf_index',
  '.wasm',
];

const sidecarExtensions = ['.gz', '.br', '.zst'];
const batchSize = 20;
const targetDir = path.resolve(process.cwd(), process.argv[2] ?? 'dist');

const logger = {
  info(message) {
    console.log(`[postbuild-compress] ${message}`);
  },
  warn(message) {
    console.warn(`[postbuild-compress] ${message}`);
  },
};

async function ensureDirectoryExists(dir) {
  await readdir(dir);
}

async function removeSidecars(dir) {
  let removed = 0;
  for await (const sidecar of walkDir(dir, sidecarExtensions)) {
    await unlink(sidecar);
    removed += 1;
  }
  return removed;
}

async function collectCompressibleFiles(dir) {
  const files = [];
  for await (const file of walkDir(dir, fileExtensions)) {
    files.push(file);
  }
  return files;
}

await ensureDirectoryExists(targetDir);

const removed = await removeSidecars(targetDir);
if (removed > 0) {
  logger.info(`Removed ${removed} stale sidecar file(s).`);
}

const files = await collectCompressibleFiles(targetDir);
if (files.length === 0) {
  logger.warn(`No compressible files found in ${targetDir}.`);
  process.exit(0);
}

logger.info(`Compressing ${files.length} file(s) in ${targetDir}...`);

const results = await Promise.allSettled([
  gzip(files, logger, true, batchSize),
  brotli(files, logger, true, batchSize),
  zstd(files, logger, true, batchSize),
]);

const failures = results.filter((result) => result.status === 'rejected');
if (failures.length > 0) {
  for (const failure of failures) {
    logger.warn(String(failure.reason));
  }
  throw new Error(`Post-build compression failed with ${failures.length} error(s).`);
}

logger.info('Compression finished.');
