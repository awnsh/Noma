import { app } from 'electron'
import { normalize } from 'path'

/**
 * Real OS-icon extraction — the actual backbone of the "arbitrary installed
 * application" requirement (product brief Part 2): this never touches this
 * app's own hand-drawn `lib/appIcons.ts` registry, so it works identically
 * for Chrome, VS Code, and something nobody wrote a fallback glyph for.
 *
 * `app.getFileIcon` is Electron's own cross-platform wrapper around the
 * OS's real icon-extraction API (SHGetFileInfo on Windows) — the same
 * artwork Explorer shows for that .exe. Converting the resulting
 * `NativeImage` to a `data:image/png;base64,...` string here, in the main
 * process, is required: a `NativeImage` is a native handle, not
 * JSON-serializable, so sending one directly over `ipcMain.handle`'s return
 * value would either throw or silently arrive as `{}` in the renderer.
 *
 * Cached by normalized path — `getFileIcon` is a real filesystem/OS call,
 * not free, and the same handful of executables (the user's current
 * application, whatever's in a workflow chain) get asked for on every
 * render of every `AppIcon` that references them. `null` results (path
 * doesn't exist, OS couldn't resolve an icon) are cached too, so a
 * consistently-missing path doesn't re-hit the OS on every call — see
 * `clearApplicationIconCache`'s own doc comment for the one case that needs
 * to escape this.
 */

const iconCache = new Map<string, string | null>()
const inFlightRequests = new Map<string, Promise<string | null>>()

function normalizeKey(executablePath: string): string {
  // Windows paths are case-insensitive; `normalize` also collapses
  // `..`/`.`/mixed separators so the same real file always lands on the
  // same cache key regardless of how the caller happened to spell it.
  return normalize(executablePath).toLowerCase()
}

export async function getApplicationIcon(executablePath: string | null | undefined): Promise<string | null> {
  if (!executablePath) return null

  const key = normalizeKey(executablePath)

  if (iconCache.has(key)) return iconCache.get(key) ?? null

  const pending = inFlightRequests.get(key)
  if (pending) return pending

  const request = (async (): Promise<string | null> => {
    try {
      // 'large' (32x32 on Windows) — legible at every size this app
      // actually renders an AppIcon at (16-22px inline, scaled up to ~35px
      // in a 'tile' variant); CSS scales it down, never up.
      const image = await app.getFileIcon(executablePath, { size: 'large' })
      const dataUrl = image.isEmpty() ? null : image.toDataURL()
      iconCache.set(key, dataUrl)
      return dataUrl
    } catch {
      // Path doesn't exist, permission denied, or the OS just doesn't have
      // an icon for it — every one of these is "no real icon available,"
      // never a crash. The caller falls back to the hand-drawn registry.
      iconCache.set(key, null)
      return null
    } finally {
      inFlightRequests.delete(key)
    }
  })()

  inFlightRequests.set(key, request)
  return request
}

/** Test-only escape hatch — the module-level cache is deliberately
 *  process-lifetime (an executable's icon doesn't change while Noma is
 *  running), which would otherwise leak state between test cases that
 *  mock `app.getFileIcon` differently. Never called from production code. */
export function __clearApplicationIconCacheForTesting(): void {
  iconCache.clear()
  inFlightRequests.clear()
}
