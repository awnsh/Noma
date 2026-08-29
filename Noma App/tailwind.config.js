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
        neutral: {
          50: '#f7f7f8',
          100: '#eaeaec',
          200: '#c2c2c8',
          300: '#98989f',
          400: '#6b6b74',
          500: '#3c3c44',
          600: '#28282f',
          700: '#1c1c21',
          800: '#131317',
          900: '#09090b',
          950: '#050506'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
