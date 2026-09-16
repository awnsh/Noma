/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 2026-09-16 visual system (v3, dark/OLED): near-black page canvas,
      // liquid-glass elevated surfaces (translucent white-on-black, real
      // backdrop blur — see lib/surfaces.ts), Noma Blue plus a sparing
      // violet secondary accent, and a soft ambient blue/violet light
      // source behind the interface (AppShell's own gradient layer).
      // Intelligence is still communicated through information — real
      // counts, plain language, real application icons — decoration never
      // substitutes for it: no sparkle, no rainbow gradients, no glass
      // outside the handful of surfaces the product brief calls "important"
      // (Noma Notice, controls, Holo, device status). Same token NAMES as
      // the prior light system (base/neutral/accent/success/error/gold) so
      // every existing `bg-base-900`/`text-neutral-100`/etc. class across
      // the app repaints dark automatically — only the values changed.
      colors: {
        // `base` is the surface ramp: 950 is the page canvas (true
        // near-black), 900 a hair lighter for a secondary flat panel
        // (the sidebar's own fill before its glass layer), 850/800 flat
        // "slightly raised" surfaces for plain (non-glass) chrome — an
        // input, a divider's rest state — 700/600 borders and hairlines.
        // The actual liquid-glass look (translucent + blurred) lives in
        // lib/surfaces.ts's GLASS_CARD/HERO_CARD, not here.
        base: {
          950: '#08090b',
          900: '#0d0f12',
          850: '#111318',
          800: '#15171d',
          700: 'rgba(255,255,255,0.09)',
          600: 'rgba(255,255,255,0.14)'
        },
        accent: {
          DEFAULT: '#637cff',
          muted: '#3d4a99',
          // The active-nav-item / "part of the adaptive loop" wash — a
          // translucent accent tint over dark glass, not a light color.
          subtle: 'rgba(99,124,255,0.12)'
        },
        // The sparing secondary accent (Part 4/17) — a soft violet used
        // only as a rare second light source (a gradient's far end, an
        // occasional highlight), never a second "meaning" color competing
        // with accent blue's one-meaning rule.
        violet: {
          DEFAULT: '#8b6cff',
          muted: 'rgba(139,108,255,0.16)'
        },
        success: {
          DEFAULT: '#4cbf82',
          muted: 'rgba(76,191,130,0.16)'
        },
        error: {
          DEFAULT: '#e0685f',
          muted: 'rgba(224,104,95,0.16)'
        },
        // Real hardware dock contact only (HardwareStatusPill, DeviceLogRow)
        // — never a general brand color, and never used for "Noma learned
        // something" (that's communicated through typography and real
        // information now, not a color).
        gold: {
          DEFAULT: '#c9a45f',
          muted: 'rgba(201,164,95,0.18)'
        },
        // `neutral` is the text ramp: 100 is primary reading text (near-
        // white, #F5F5F7), climbing toward 950 which lands on the same
        // near-black as `base`'s own 950 — text at the bottom of this
        // scale is for a surface, never a glyph.
        neutral: {
          50: '#ffffff',
          100: '#f5f5f7',
          200: '#d5d6db',
          300: '#adaeb8',
          400: '#8b8d94',
          500: '#75767e',
          600: '#5f626a',
          700: '#45474e',
          800: '#15171d',
          900: '#0d0f12',
          950: '#08090b'
        },
        // Holo keeps its own small token group — "a piece of Noma hardware
        // translated into software" (see Holo.tsx) needs to read as a
        // literal inset physical device face, deliberately a touch deeper/
        // more contrasted than the app's own now-dark canvas around it —
        // never reference `base`/`neutral` inside Holo's own components.
        holo: {
          bg: '#050506',
          surface: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.1)',
          text: '#f5f5f7',
          muted: '#83858d'
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
