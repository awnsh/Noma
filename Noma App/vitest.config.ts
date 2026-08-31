import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [react()],
  test: {
    globals: true,
    // Main-process tests (the vast majority) stay on the lighter 'node'
    // environment; renderer component tests opt into jsdom individually
    // via a `// @vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
})
