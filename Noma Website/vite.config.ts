import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://awnsh.github.io/Noma/ via GitHub Pages — asset URLs
  // need the repo-name subpath in production, but the dev server stays at '/'.
  base: command === 'build' ? '/Noma/' : '/',
  plugins: [react(), tailwindcss()],
}))
