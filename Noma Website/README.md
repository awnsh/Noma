# Noma — Marketing Website

The public marketing site for Noma, an adaptive computer interface. This is a
standalone project — it does not depend on the Noma desktop app's source, only
echoes its visual language.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Framer Motion
- Self-hosted fonts: Space Grotesk (display), Inter (body), JetBrains Mono (technical labels)

## Structure

```
src/
  components/
    layout/      Navigation, Footer, Section shell
    ui/           Button, ControlChip, Reveal (scroll-in animation)
    visuals/      KeyboardVisual (hero/hardware SVG), ModuleIcon
    sections/     One component per landing-page section
  data/
    appProfiles.ts   Shared VS Code / Chrome / Premiere / SolidWorks control sets,
                      reused across the Problem, Noma-intro, and Interactive Demo sections
  App.tsx          Assembles all sections in order
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

## Before shipping

- `og:url` / `canonical` in `index.html` point at a placeholder `https://noma.build/` — swap in the real domain once one exists.
- The footer/CTA "Contact" link points at a placeholder `mailto:` address — swap in a real one.
- `KeyboardVisual` is an abstract, hand-drawn SVG concept, not a CAD render — replace it once real hardware imagery exists.
- Social links (YouTube, TikTok, LinkedIn) are placeholder `#` hrefs.
