import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Library build. `three` stays external so consumers deduplicate it
 * against their own copy.
 */
export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'threeJoystick',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js'),
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: { three: 'THREE' },
      },
    },
  },
});
