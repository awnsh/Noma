/**
 * 2026-11-12, keyboard redesign: the glass material is retired. These names
 * stay because the legacy pages (Contact, Feedback, Uninstall) still import
 * them; they now resolve to the site's flat surfaces and solid ink button.
 */
export const GLASS = 'border border-line bg-raised'

/** The one primary button: solid ink on paper, paper on ink in dark mode. */
export const GLASS_ACCENT =
  'border border-ink bg-ink text-paper transition-colors hover:bg-ink/85'

export const GLASS_TOGGLE =
  'border border-line bg-raised text-muted transition-colors duration-150 hover:text-ink'

export const GLASS_TOGGLE_ACTIVE = 'border border-ink bg-ink text-paper transition-colors duration-150'

export const SOLID_ON_LIGHT = GLASS_ACCENT
