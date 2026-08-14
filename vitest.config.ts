import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      // Unit tests never require the electron binary. See the stub's header.
      electron: resolve(__dirname, 'src/test/electron-stub.cjs')
    }
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node'
  }
});
