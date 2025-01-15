import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    setupFiles: ['./app/test/setup.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
    },
  },
});
