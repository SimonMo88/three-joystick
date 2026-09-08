import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname, 'examples');

/**
 * Builds the two demo pages into `docs/` for GitHub Pages.
 */
export default defineConfig({
  root,
  base: './',
  publicDir: false,
  resolve: {
    alias: {
      'three-joystick': resolve(import.meta.dirname, 'src/index.ts'),
    },
  },
  build: {
    target: 'es2022',
    outDir: resolve(import.meta.dirname, 'docs'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        basic: resolve(root, 'BasicExample/index.html'),
        rotating: resolve(root, 'RotatingTargetExample/index.html'),
      },
    },
  },
  server: {
    port: 8080,
    open: '/BasicExample/index.html',
  },
});
