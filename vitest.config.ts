import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Pure maths runs in Node; anything touching canvas or image loading runs in all three engines.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['test/**/*.test.ts'], exclude: ['test/**/*.browser.test.ts'] } },
      {
        test: {
          name: 'browser',
          include: ['test/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
          },
        },
      },
    ],
  },
});
