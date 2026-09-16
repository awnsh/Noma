# Noma — Marketing Website

The public marketing site for Noma, an adaptive computer interface. This is a
standalone project — it does not depend on the Noma desktop app's source, only
echoes its visual language.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Framer Motion
- Self-hosted fonts: Sora (display), Inter (body), JetBrains Mono (technical labels)

## Structure

```
src/
  components/
    layout/      Navigation, Footer, Section shell
    ui/           Button, ControlChip, WaitlistForm, Reveal (scroll-in animation)
    visuals/      KeyboardVisual (the keyboard SVG, reused across Hero/ProductDemo/
                   Hardware), ModuleEnclosure (module cards + the attach animation),
                   AppIcon (real brand icons — Problem/Applications/Holo's marketing
                   chips), appGlyphIcons/DemoAppIcon (the app's own hand-drawn glyph
                   icons — used only inside AppPreview's demo, to stay faithful to how
                   the real app looks; don't mix the two), demoSurfaces (the app's
                   liquid-glass recipe, re-themed for the AppPreview demo only)
    sections/     One component per landing-page section
  hooks/
    usePinnedScroll.ts   Shared pinned-scroll-scene mechanics (fixed→absolute hand-off,
                          short-viewport fit), used by AdaptiveIntelligence and ProductDemo
  data/
    appProfiles.ts   Shared VS Code / Chrome / Claude / GitHub / etc. control sets +
                      brand colors, reused across most sections
    config.ts        Waitlist endpoint — see "Before shipping" below
  App.tsx          Assembles all sections in order — see its own top-of-file comment
                    for the full-redesign (2026-09-16) section order and what got retired
```

Each section is a self-contained component — reorder, remove, or restyle one
without touching the others.

## Develop

```
npm install
npm run dev
```

## Build

```
npm run build
npm run preview
```

## Deploy

Hosted on [Vercel](https://vercel.com), connected to the `awnsh/Noma` GitHub repo
with **Root Directory** set to `Noma Website`. Every push to `main` that touches
this folder redeploys automatically — no config file needed, Vercel auto-detects
the Vite preset.

## Before shipping

- **Waitlist isn't connected yet.** `src/data/config.ts` has a `WAITLIST_ENDPOINT` constant — create a free form at [formspree.io](https://formspree.io), paste its endpoint in, done. Until then the form renders normally but shows a "not connected yet" notice on submit instead of sending anywhere.
- `og:url` / `canonical` / `og:image` in `index.html` point at a placeholder `https://noma.build/` — once Vercel assigns its URL (or a custom domain is attached), swap it in there.
- The footer/CTA "Contact" link points at a placeholder `mailto:` address — swap in a real one.
- `KeyboardVisual` is an abstract, hand-drawn SVG concept, not a CAD render — replace it once real hardware imagery exists.
- Social links (YouTube, TikTok, LinkedIn) are placeholder `#` hrefs, as are the footer's GitHub/Privacy/Terms links.
- "Try Holo Free" (Hero, Nav, Holo, CTA) currently routes to the waitlist section (`#cta`) rather than a real download — there's no public Holo distribution yet. Point it at the real thing once one exists.
