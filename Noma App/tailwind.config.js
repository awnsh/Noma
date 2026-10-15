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
      // 2026-10-14 visual system (v5, "App Spaces"; DESIGN.md): warm
      // graphite ground, off-white ink for anything you act on, and one
      // colour per app (`space`, driven by --space-h/--space-c from
      // lib/appSpace.ts) that only ever means "where you are". Same token
      // names as v4, so existing classes repaint; `accent` is now ink, not
      // blue.
      colors: {
        // Surfaces, darkest first: 950 the window, 900 the sidebar ground,
        // 850 a resting surface, 800 a raised one (inputs, hovers), 700 a
        // seam, 600 a strong seam. Warm, not blue-black.
        base: {
          950: '#141210',
          900: '#181614',
          850: '#1e1c19',
          800: '#26231f',
          700: '#322e2a',
          600: '#423d38'
        },
        // Ink: what you press. Off-white, the way Things and Apple's dark
        // mode fill a primary button, so no app's colour is ever mistaken
        // for a control.
        accent: {
          DEFAULT: '#ece8e1',
          muted: '#5a5751',
          subtle: 'rgba(236,232,225,0.08)'
        },
        // The current app's colour. Lightness is fixed so every app's hue
        // sits at the same brightness on graphite.
        space: {
          DEFAULT: 'oklch(0.76 var(--space-c) var(--space-h) / <alpha-value>)',
          ink: 'oklch(0.86 calc(var(--space-c) * 0.7) var(--space-h) / <alpha-value>)',
          deep: 'oklch(0.27 calc(var(--space-c) * 0.45) var(--space-h) / <alpha-value>)',
          wash: 'oklch(0.215 calc(var(--space-c) * 0.32) var(--space-h) / <alpha-value>)'
        },
        // Flow's own voice: a suggestion, something Flow noticed. Never
        // general UI.
        violet: {
          // v6: retired. The names stay so old classes compile; they now
          // resolve to the ordinary neutral surface and text.
          DEFAULT: '#b7b1a9',
          muted: 'rgba(255,250,240,0.06)',
          // Flow's note: the paper a suggestion is written on.
          note: '#1e1c19',
          edge: 'rgba(255,250,240,0.08)'
        },
        success: {
          DEFAULT: '#7cc49a',
          muted: 'rgba(124,196,154,0.14)'
        },
        error: {
          DEFAULT: '#ec8a7d',
          muted: 'rgba(236,138,125,0.14)'
        },
        // Real hardware contact only (HardwareStatusPill, DeviceLogRow).
        gold: {
          DEFAULT: '#d4ad66',
          muted: 'rgba(212,173,102,0.16)'
        },
        // Text, warm. 100 reading text, 300 secondary, 400/500 quiet,
        // 600 the faintest that still reads on base-950.
        neutral: {
          50: '#fffdf9',
          100: '#f1ede6',
          200: '#d9d4cc',
          300: '#b7b1a9',
          400: '#9e9891',
          500: '#8e8982',
          600: '#7d7871',
          700: '#4d4a46',
          800: '#26231f',
          900: '#181614',
          950: '#141210'
        },
        holo: {
          bg: '#0e0d0f',
          surface: 'rgba(255,250,240,0.05)',
          border: 'rgba(255,250,240,0.1)',
          text: '#f1ede6',
          muted: '#8d8882'
        }
      },
      fontFamily: {
        // 2026-10-14 (v6, "native"): the operating system's own UI fonts,
        // so Noma reads like the apps around it rather than like a web
        // template. Sora and Inter were the strongest "made by AI" tell.
        // `display` is kept as a name so existing classes still work; it
        // is the platform's display cut, not a separate brand face.
        display: ['"Segoe UI Variable Display"', '"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Mono"', 'Consolas', '"SF Mono"', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
}
