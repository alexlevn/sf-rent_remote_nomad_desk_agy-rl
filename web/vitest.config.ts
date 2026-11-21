import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // DB integration test files share one local Postgres instance and mutate host/user flags temporarily
    fileParallelism: false,
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'lib/**/*.{test,spec}.{ts,tsx}'],
    server: {
      deps: {
        inline: ['next-auth'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
});
