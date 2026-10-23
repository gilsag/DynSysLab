import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Every *.html file at the repository root is a page: index.html (home) and one per lab (<id>.html).
const pages = readdirSync('.').filter((f) => f.endsWith('.html'));

// `vite build`                          → dist/ (static site with every page; needs a web server)
// `vite build --mode offline-<page>`    → dist/offline/<page>.html, one self-contained file that opens
//                                          offline by double-clicking it (run for all pages by
//                                          `npm run build:offline`)
export default defineConfig(({ mode }) => {
  const offline = mode.startsWith('offline-') ? mode.slice('offline-'.length) : null;
  return {
    base: './',
    resolve: { alias: { '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)) } },
    plugins: offline ? [react(), viteSingleFile()] : [react()],
    define: { 'import.meta.env.OFFLINE': JSON.stringify(!!offline) },
    build: offline
      ? {
          outDir: 'dist/offline',
          emptyOutDir: false,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          rollupOptions: { input: `${offline}.html` },
        }
      : {
          outDir: 'dist',
          chunkSizeWarningLimit: 2500,
          rollupOptions: { input: Object.fromEntries(pages.map((p) => [p.replace(/\.html$/, ''), p])) },
        },
    test: { include: ['src/**/*.test.ts'] },
  };
});
