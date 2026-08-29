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
    ui/           Button, ControlChip, WaitlistForm, Reveal (scroll-in animation)
    visuals/      KeyboardVisual (the keyboard SVG, reused across Hero/Hardware/Demo/Modules),
                   ModuleEnclosure (module cards + the attach animation), OledIcon
    sections/     One component per landing-page section
  data/
    appProfiles.ts   Shared VS Code / Chrome / Premiere / SolidWorks control sets,
                      reused across the Problem, Noma-intro, and Interactive Demo sections
    config.ts        Waitlist endpoint — see "Before shipping" below
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

- **Waitlist isn't connected yet.** `src/data/config.ts` has a `WAITLIST_ENDPOINT` constant — create a free form at [formspree.io](https://formspree.io), paste its endpoint in, done. Until then the form renders normally but shows a "not connected yet" notice on submit instead of sending anywhere.
- Deployed via GitHub Pages (`.github/workflows/deploy-website.yml`, builds on every push to `main`) at `https://awnsh.github.io/Noma/`. `og:url` / `canonical` / `og:image` in `index.html` and `base` in `vite.config.ts` all point at that path — update all three together if a custom domain is added later.
- The footer/CTA "Contact" link points at a placeholder `mailto:` address — swap in a real one.
- `KeyboardVisual` is an abstract, hand-drawn SVG concept, not a CAD render — replace it once real hardware imagery exists.
- Social links (YouTube, TikTok, LinkedIn) are placeholder `#` hrefs.
