import { SiGooglechrome, SiGithub, SiFigma, SiBlender, SiDiscord, SiSpotify, SiNotion, SiClaude, SiYoutube } from 'react-icons/si'
import type { IconType } from 'react-icons'

// Real brand marks, where the simple-icons set this project pulls from still
// carries them — several were pulled from that set after trademark takedown
// requests (VS Code, the Adobe apps, plain Slack) and aren't available as a
// clean single-color icon at all anymore, at any version.
const REAL_ICONS: Record<string, IconType> = {
  chrome: SiGooglechrome,
  github: SiGithub,
  figma: SiFigma,
  blender: SiBlender,
  discord: SiDiscord,
  spotify: SiSpotify,
  notion: SiNotion,
  claude: SiClaude,
  youtube: SiYoutube,
}

// For everything else: a short letterform badge, not a traced logo — reads as
// "that app" at a glance next to the real marks above without reproducing a
// trademark pixel-for-pixel. Terminal isn't a brand at all, so it gets a
// generic prompt glyph instead of an initialism.
const BADGE_LABELS: Record<string, string> = {
  vscode: '</>',
  photoshop: 'Ps',
  premiere: 'Pr',
  aftereffects: 'Ae',
  slack: '#',
  solidworks: 'SW',
  terminal: '>_',
}

interface AppIconProps {
  id: string
  className?: string
  color?: string
}

export default function AppIcon({ id, className = '', color }: AppIconProps) {
  const Icon = REAL_ICONS[id]

  if (Icon) {
    return <Icon className={className} style={{ color: color ?? 'currentColor' }} aria-hidden />
  }

  const label = BADGE_LABELS[id] ?? id.slice(0, 2).toUpperCase()

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-semibold leading-none ${className}`}
      style={{ color: color ?? 'currentColor' }}
      aria-hidden
    >
      {label}
    </span>
  )
}
