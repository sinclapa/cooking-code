import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts', 'api/src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/env.d.ts',
        'src/content/config.ts',
        'src/faro.ts',
        'api/src/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
