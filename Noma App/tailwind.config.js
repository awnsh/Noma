/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 2026-09-15 visual system (v2, light-first): a warm, sophisticated
      // neutral canvas, Noma Blue as the one accent (interaction only —
      // never a glow, never a gradient), and a restrained editorial voice.
      // Intelligence is communicated through information (the workflow
      // itself, real counts, plain language), never through decoration —
      // no sparkle, no "AI" color, no glass, no gradient.
      colors: {
        // `base` is the surface ramp: 950 is the page canvas, 900 is the
        // one true "elevated card" white, the rest are rarely-used
        // in-between steps (a slightly recessed input, a hover wash).
        // `neutral` is the text ramp: 100 is primary reading text (near-
        // black), climbing toward 950 which — by design — lands on the
        // exact same near-white as `base`'s own 900/950, mirroring how
        // this scale was originally built.
        base: {
          950: '#f7f7f5',
          900: '#ffffff',
          850: '#fbfbfa',
          800: '#f0f0ee',
          700: '#dcdcd8',
          600: '#d0d0cc'
        },
        accent: {
          DEFAULT: '#536dff',
          muted: '#c8d0fc'
        },
        success: {
          DEFAULT: '#3f8f5f',
          muted: '#bfe3cd'
        },
        error: {
          DEFAULT: '#c24f4f',
          muted: '#f0cccc'
        },
        // Real hardware dock contact only (HardwareStatusPill, DeviceLogRow)
        // — never a general brand color, and never used for "Noma learned
        // something" (that's communicated through typography and real
        // information now, not a color).
        gold: {
          DEFAULT: '#b08d3f',
          muted: '#e7d9b6'
        },
        neutral: {
          50: '#000000',
          100: '#111111',
          200: '#28282a',
          300: '#424244',
          400: '#57575a',
          500: '#6d6d72',
          600: '#87878b',
          700: '#a3a3a6',
          800: '#f0f0ee',
          900: '#ffffff',
          950: '#f7f7f5'
        },
        // Holo is a deliberate exception to the rest of the app: "a piece
        // of Noma hardware translated into software" (see Holo.tsx), so it
        // keeps a small, self-contained dark palette instead of the
        // app-wide light one — never reference `base`/`neutral` inside
        // Holo's own components.
        holo: {
          bg: '#0a0a0b',
          surface: '#17171a',
          border: '#2a2a2e',
          text: '#f5f5f2',
          muted: '#9a9aa0'
        }
      },
      fontFamily: {
        // Shared with the Noma Website (src/index.css's --font-display/
        // --font-sans/--font-mono tokens there) — same three fonts, same
        // roles: Sora for page/section titles (echoes the "noma" wordmark's
        // rounded-geometric letterforms), Inter for body text, JetBrains
        // Mono for technical/log labels. Fonts are loaded via @fontsource
        // imports in styles/globals.css.
        display: ['"Sora Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
