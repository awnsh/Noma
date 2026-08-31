/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Shared with the Noma Website (src/index.css's @theme block there) —
      // keep these two palettes in sync by hand; there's no shared package
      // between the two deliberately-independent projects. Signature brand
      // blue replaces the original teal; gold/flow are the same two
      // semantic colors the website added (gold = real hardware dock
      // contact, flow = Flow noticed a pattern and is suggesting
      // something) — both available here now too, not yet applied
      // everywhere a website equivalent uses them.
      colors: {
        base: {
          950: '#050506',
          900: '#09090b',
          850: '#0e0e11',
          800: '#131317',
          700: '#1c1c21',
          600: '#28282f'
        },
        accent: {
          DEFAULT: '#4c7eff',
          muted: '#3150a4'
        },
        gold: {
          DEFAULT: '#cda15a',
          muted: '#6b5730'
        },
        flow: {
          DEFAULT: '#a78bd1',
          muted: '#5c4a78'
        },
        // Overrides Tailwind's default neutral scale with the website's
        // own cooler-tinted grays, so every existing text-neutral-*/
        // bg-neutral-*/border-neutral-* class across the app (its de facto
        // body-text scale) picks up the website's palette automatically.
        //
        // 400/500/600/700 are deliberately brighter than the website's own
        // matching base-* values (2026-08-31 contrast fix — a real user
        // reported non-white text being hard to read). Measured against
        // this app's #050506 background, the original 400/500/600 sat at
        // roughly 3.9:1 / 1.9:1 / 1.4:1 contrast — the two darkest were
        // used constantly (secondary body text, every uppercase section
        // label like "Current Application") and were functionally
        // unreadable, not just "muted." Re-picked to land close to
        // 5.4:1 / 4.4:1 / 3.1:1 / 2.0:1 respectively — 700 stays the
        // dimmest, genuinely-tertiary tier (rare timestamps/asides), but
        // even it is roughly double its old contrast. 50-300 were already
        // fine (7:1+) and are untouched; this only affects the app's own
        // `neutral` text ramp, not the shared `base` background ramp
        // (bg-base-*), so no panel/card background changes at all — see
        // [[noma-app-colors]] for that shared-palette history.
        neutral: {
          50: '#f7f7f8',
          100: '#eaeaec',
          200: '#c2c2c8',
          300: '#98989f',
          400: '#82828c',
          500: '#73737d',
          600: '#5c5c65',
          700: '#414148',
          800: '#131317',
          900: '#09090b',
          950: '#050506'
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
