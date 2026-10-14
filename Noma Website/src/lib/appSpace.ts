import type { CSSProperties } from 'react'

/**
 * App Spaces, as the Noma app draws them (Noma App/src/renderer/src/lib/
 * appSpace.ts, 2026-10-14): each app has its own colour, used only to say
 * "this is that app", never for buttons. Same hues and chromas as the app,
 * keyed by this site's app ids (data/appProfiles.ts); keep the two in step
 * by hand, like every other ported piece of the app on this site.
 */
const SPACES: Record<string, { hue: number; chroma: number }> = {
  vscode: { hue: 248, chroma: 0.13 },
  chrome: { hue: 82, chroma: 0.13 },
  claude: { hue: 42, chroma: 0.11 },
  github: { hue: 300, chroma: 0.1 },
  figma: { hue: 20, chroma: 0.14 },
  premiere: { hue: 285, chroma: 0.12 },
  aftereffects: { hue: 290, chroma: 0.12 },
  photoshop: { hue: 240, chroma: 0.12 },
  spotify: { hue: 150, chroma: 0.14 },
  discord: { hue: 275, chroma: 0.14 },
  slack: { hue: 340, chroma: 0.12 },
  blender: { hue: 55, chroma: 0.14 },
  solidworks: { hue: 25, chroma: 0.13 },
  notion: { hue: 70, chroma: 0.02 },
  terminal: { hue: 70, chroma: 0.02 },
}

const NEUTRAL = { hue: 70, chroma: 0.012 }

/** The CSS variables that colour `space`, `space-ink` and `space-deep`
 *  for one app. */
export function spaceStyle(appId: string | undefined): CSSProperties {
  const { hue, chroma } = (appId && SPACES[appId]) || NEUTRAL
  return { '--space-h': String(hue), '--space-c': String(chroma) } as CSSProperties
}
