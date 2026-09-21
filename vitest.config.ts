import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: [
      'factory/**/*.test.ts',
      'eval/**/*.test.ts',
      'web/**/*.test.ts',
      'server/**/*.test.ts',
    ],
    // Kegagalan tidak boleh senyap: kalau glob tidak menemukan tes, gagalkan.
    passWithNoTests: false,
    reporters: ['verbose'],
  },
});
