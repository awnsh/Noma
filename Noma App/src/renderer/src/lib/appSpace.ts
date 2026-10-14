import { useEffect } from 'react'
import { useFlowStore } from '../stores/flowStore'

/**
 * App Spaces (DESIGN.md): Noma wears the colour of the app you're in, the
 * way an Arc space or a Things area has its own colour. It only ever means
 * "where you are": the sidebar frame, the wash at the top of a page, the
 * app's own name and its Glide zones. Never buttons, never charts, never
 * decoration.
 *
 * Each app gets a hue (OKLCH degrees) and a chroma. Lightness is fixed by
 * the tokens in tailwind.config.js, so every app's colour sits at the same
 * brightness and reads equally well on the graphite ground.
 */
export interface AppSpace {
  hue: number
  chroma: number
}

/** The space with no app: warm graphite, almost no colour. */
export const NEUTRAL_SPACE: AppSpace = { hue: 70, chroma: 0.012 }

/** Hues picked from each app's own identity, nudged so neighbours that are
 *  often used together (an editor and a browser) don't land on one colour. */
const KNOWN_SPACES: Record<string, AppSpace> = {
  code: { hue: 248, chroma: 0.13 },
  'code - insiders': { hue: 168, chroma: 0.12 },
  cursor: { hue: 260, chroma: 0.05 },
  devenv: { hue: 300, chroma: 0.12 },
  chrome: { hue: 82, chroma: 0.13 },
  msedge: { hue: 205, chroma: 0.12 },
  firefox: { hue: 50, chroma: 0.14 },
  brave: { hue: 38, chroma: 0.14 },
  safari: { hue: 230, chroma: 0.12 },
  claude: { hue: 42, chroma: 0.11 },
  chatgpt: { hue: 170, chroma: 0.09 },
  spotify: { hue: 150, chroma: 0.14 },
  discord: { hue: 275, chroma: 0.14 },
  slack: { hue: 340, chroma: 0.12 },
  'ms-teams': { hue: 285, chroma: 0.11 },
  teams: { hue: 285, chroma: 0.11 },
  zoom: { hue: 250, chroma: 0.14 },
  winword: { hue: 255, chroma: 0.12 },
  excel: { hue: 152, chroma: 0.12 },
  powerpnt: { hue: 35, chroma: 0.14 },
  outlook: { hue: 240, chroma: 0.12 },
  olk: { hue: 240, chroma: 0.12 },
  onenote: { hue: 305, chroma: 0.12 },
  notion: { hue: 70, chroma: 0.02 },
  obsidian: { hue: 295, chroma: 0.13 },
  figma: { hue: 20, chroma: 0.14 },
  photoshop: { hue: 240, chroma: 0.12 },
  resolve: { hue: 15, chroma: 0.12 },
  githubdesktop: { hue: 300, chroma: 0.1 },
  explorer: { hue: 88, chroma: 0.12 },
  finder: { hue: 235, chroma: 0.11 },
  windowsterminal: { hue: 70, chroma: 0.02 },
  terminal: { hue: 70, chroma: 0.02 },
  notepad: { hue: 220, chroma: 0.08 },
  mspaint: { hue: 195, chroma: 0.12 }
}

/** Evenly spread hues for apps Noma has no colour for, so an unknown app
 *  still gets a stable colour of its own rather than a default grey. */
const FALLBACK_HUES = [20, 65, 110, 160, 200, 240, 280, 325]

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}

export function appSpaceFor(applicationId: string | null | undefined): AppSpace {
  if (!applicationId) return NEUTRAL_SPACE
  const id = applicationId.toLowerCase()
  return KNOWN_SPACES[id] ?? { hue: FALLBACK_HUES[hashId(id) % FALLBACK_HUES.length], chroma: 0.11 }
}

/** CSS custom properties for one app's space, for an element that shows a
 *  particular app (a zone map for another app, a workflow step). */
export function spaceStyle(applicationId: string | null | undefined): Record<string, string> {
  const { hue, chroma } = appSpaceFor(applicationId)
  return { '--space-h': String(hue), '--space-c': String(chroma) }
}

/**
 * Puts the current app's space on the whole window. The two properties are
 * registered in globals.css, so switching apps slides the colour across
 * rather than snapping: the one authored motion in the app.
 */
export function useAppSpace(): void {
  const applicationId = useFlowStore((state) => state.context.application?.id ?? null)
  useEffect(() => {
    const { hue, chroma } = appSpaceFor(applicationId)
    const root = document.documentElement
    root.style.setProperty('--space-h', String(hue))
    root.style.setProperty('--space-c', String(chroma))
  }, [applicationId])
}
