import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const core = resolve(__dirname, '../../packages/core/src');

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  resolve: {
    alias: [
      { find: /^@mull\/core$/, replacement: resolve(core, 'index.ts') },
      { find: /^@mull\/core\/(.*)$/, replacement: resolve(core, '$1.ts') },
    ],
  },
});
