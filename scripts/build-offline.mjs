// Builds every page (index.html and each <lab>.html at the repository root) as one
// self-contained HTML file in dist/offline/. The files link to each other with relative
// paths, so the whole folder can be copied to a USB stick or uploaded to Moodle.
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pages = readdirSync('.').filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
rmSync('dist/offline', { recursive: true, force: true });
for (const page of pages) {
  console.log(`\n▶ offline build: ${page}.html`);
  const r = spawnSync('npx', ['vite', 'build', '--mode', `offline-${page}`, '--logLevel', 'warn'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(`\n✓ ${pages.length} offline pages in dist/offline/`);
