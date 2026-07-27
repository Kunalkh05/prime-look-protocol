import { defineConfig } from 'vitest/config'

// The suite covers the pure logic — geometry, ranking and copy integrity —
// which needs no DOM, so it runs in plain node and stays fast.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
