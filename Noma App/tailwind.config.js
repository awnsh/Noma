/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 2026-09-17 visual system (v4, "restrained graphite hardware"):
      // supersedes v3's liquid-glass-everywhere direction — real user
      // feedback was that v3 had drifted into "generic AI SaaS" (glowing
      // borders, blue-to-violet gradients, glass on every card). The fix
      // is a palette change, not a rewrite: solid graphite surfaces
      // (`base.700`/`600` are now real hex borders, not translucent white
      // overlays), one blue accent used sparingly, and violet retired from
      // every actual UI surface (the `violet` token below is now dead
      // — kept defined, referenced nowhere, in case a future rebrand wants
      // it back, but no component should reach for it). Glass survives
      // only where lib/surfaces.ts's own doc comment now scopes it to:
      // navigation, device surfaces (Holo, the Noma Device card), and
      // Noma Notice — never as a blanket "every card is glass" default.
      // Intelligence is communicated through information — real counts,
      // plain language, real application icons — never decoration: no
      // sparkle, no rainbow gradients, no colored glow "because it's AI."
      // Same token NAMES as the prior system so every existing
      // `bg-base-900`/`text-neutral-100`/etc. class across the app
      // repaints automatically — only the values changed.
      colors: {
        // `base` is the surface ramp: 950 is the page canvas (true
        // near-black), 900 a hair lighter for a secondary flat panel, 850
        // is "Card" (the new default solid-card fill — see
        // lib/surfaces.ts), 800 is "Elevated" (an input, a hover state, a
        // step brighter than Card), and 700/600 are now real solid
        // graphite hex borders ("Border"/"Strong border") — not
        // translucent white overlays the way v3 had them, so a card's
        // edge reads as a material seam, not a light catching glass.
        base: {
          950: '#08090a',
          900: '#0d0f11',
          850: '#111214',
          800: '#15171a',
          700: '#24262a',
          600: '#30333a'
        },
        accent: {
          DEFAULT: '#5b6ff5',
          muted: '#384497',
          // The active-nav-item / "part of the adaptive loop" wash — a
          // translucent accent tint over dark glass, not a light color.
          subtle: 'rgba(91,111,245,0.12)'
        },
        // Dead token, deliberately: see this file's own top-of-block
        // comment. Retained only so nothing importing `violet` from an
        // older branch hard-fails; no component should add a new
        // reference to it.
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
          // 400 ("Secondary text") and 600 ("Muted") are the two tiers
          // named explicitly in the new restrained palette; 500/700 are
          // interpolated between them, unchanged from before.
          400: '#96999f',
          500: '#75767e',
          600: '#656970',
          700: '#45474e',
          800: '#15171a',
          900: '#0d0f11',
          950: '#08090a'
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
