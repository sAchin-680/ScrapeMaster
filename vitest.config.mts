import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
      'server-only': path.resolve(import.meta.dirname, 'tests/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/index.ts',
        'lib/models/**',
        'lib/db/**',
        'lib/actions/**',
        'lib/data/**',
      ],
      reporter: ['text-summary', 'lcov'],
      // Guard against regressions; raise as coverage grows. Vitest 4+ remaps
      // V8 coverage through the AST, which counts ?., ?? and default
      // parameters as branches, so these sit just under the new baseline.
      thresholds: { statements: 65, branches: 60, functions: 65, lines: 68 },
    },
  },
});
