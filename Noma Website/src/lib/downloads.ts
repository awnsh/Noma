import { useEffect, useState } from 'react'

/**
 * Where the beta's installers live: the app's GitHub releases. Every link
 * points at the installer file itself, which GitHub serves as a download, so
 * clicking a button downloads it straight away and the visitor never lands
 * on a GitHub page.
 *
 * The page looks up the newest release that actually has each installer and
 * links to that exact file. It has to check the files, not just take the
 * newest release: a release is published a few minutes before its installers
 * finish uploading, and in that gap a "latest" link would hit GitHub's
 * not-found page (seen with v0.1.7). Until the lookup answers, or if GitHub
 * can't be reached, the buttons use the stable-name copies every release
 * gets (.github/workflows/noma-app-release-aliases.yml).
 */
const LATEST = 'https://github.com/awnsh/Noma/releases/latest/download'
const RELEASES_API = 'https://api.github.com/repos/awnsh/Noma/releases?per_page=10'

export interface Downloads {
  version: string | null
  /** When that version was published (ISO). */
  releasedAt: string | null
  windows: string
  macAppleSilicon: string
  macIntel: string
}

const FALLBACK: Downloads = {
  version: null,
  releasedAt: null,
  windows: `${LATEST}/Noma-Setup.exe`,
  macAppleSilicon: `${LATEST}/Noma-arm64.dmg`,
  macIntel: `${LATEST}/Noma-x64.dmg`,
}

/** Each installer's versioned file name, as electron-builder names it. */
const INSTALLERS = {
  windows: /^Noma-Setup-[\d.]+\.exe$/,
  macAppleSilicon: /^Noma-[\d.]+-arm64\.dmg$/,
  macIntel: /^Noma-[\d.]+-x64\.dmg$/,
} as const

interface Release {
  tag_name: string
  draft: boolean
  prerelease: boolean
  published_at?: string
  assets: { name: string; browser_download_url: string }[]
}

/** Picks, per installer, the newest published release that has it. */
export function pickDownloads(releases: Release[]): Downloads {
  const published = releases.filter((release) => !release.draft && !release.prerelease)
  const find = (pattern: RegExp) => {
    for (const release of published) {
      const asset = release.assets.find((candidate) => pattern.test(candidate.name))
      if (asset)
        return {
          url: asset.browser_download_url,
          version: release.tag_name.replace(/^v/, ''),
          releasedAt: release.published_at ?? null,
        }
    }
    return null
  }
  const windows = find(INSTALLERS.windows)
  const macAppleSilicon = find(INSTALLERS.macAppleSilicon)
  const macIntel = find(INSTALLERS.macIntel)
  const shown = windows ?? macAppleSilicon
  return {
    // The version shown is the one the visitor's likely download has; the
    // Windows build is checked first because it's uploaded alongside the Macs.
    version: shown?.version ?? null,
    releasedAt: shown?.releasedAt ?? null,
    windows: windows?.url ?? FALLBACK.windows,
    macAppleSilicon: macAppleSilicon?.url ?? FALLBACK.macAppleSilicon,
    macIntel: macIntel?.url ?? FALLBACK.macIntel,
  }
}

export function useLatestDownloads(): Downloads {
  const [downloads, setDownloads] = useState<Downloads>(FALLBACK)
  useEffect(() => {
    const controller = new AbortController()
    fetch(RELEASES_API, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((releases: Release[] | null) => {
        if (Array.isArray(releases)) setDownloads(pickDownloads(releases))
      })
      .catch(() => {
        // Offline, rate-limited or aborted: the fallback links stay.
      })
    return () => controller.abort()
  }, [])
  return downloads
}

/** The visitor's computer, to put their download first. A guess, so both
 *  are always shown. */
export function detectPlatform(): 'mac' | 'windows' | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = `${nav.userAgentData?.platform ?? ''} ${navigator.platform ?? ''} ${navigator.userAgent}`.toLowerCase()
  if (/iphone|ipad|android/.test(platform)) return null
  if (/mac/.test(platform)) return 'mac'
  if (/win/.test(platform)) return 'windows'
  return null
}
