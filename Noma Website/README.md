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
                   WorkflowDemo/Hardware), ModuleEnclosure (module cards + the attach
                   animation), OledIcon
    sections/     One component per landing-page section
  hooks/
    usePinnedScroll.ts   Shared pinned-scroll-scene mechanics (fixed→absolute hand-off,
                          short-viewport fit), used by ProductDemo and WorkflowDemo
  data/
    appProfiles.ts   Shared VS Code / Chrome / Premiere / SolidWorks / etc. control sets,
                      reused across AppPreview and HowNomaWorks (ProductDemo and
                      WorkflowDemo define their own local control sets instead — see
                      those files' own comments for why)
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
- Social links (YouTube, TikTok, LinkedIn) are placeholder `#` hrefs.
- `FAQ.tsx`'s five questions are a first draft, not real copy — written to be honest (grounded only in facts already stated elsewhere on the site) but not reviewed. Replace with real FAQ content before shipping.
