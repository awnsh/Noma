import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Suggestion } from '@shared/types'
import { getWorkflowNoticeWindow } from './notifications/notificationWindow'
import { sleep } from './util'

/**
 * Captures the real workflow notice as PNGs for the website
 * (`NOMA_CAPTURE_NOTICE=<folder>`, only honoured together with
 * NOMA_TEST_USER_DATA_DIR so it never touches a real profile). Runs the demo
 * workflow through the real pipeline, puts its suggestion up as an ordinary
 * (non-demo) notice, and saves the window's own pixels: the card at rest,
 * then after Review is clicked. What the site shows is then exactly what
 * the product draws, icons included, rather than a redrawing of it.
 */
export async function captureNotice(options: {
  folder: string
  makeSuggestion: () => Promise<Suggestion | undefined>
  show: (suggestion: Suggestion) => void
}): Promise<void> {
  try {
    mkdirSync(options.folder, { recursive: true })
    const suggestion = await options.makeSuggestion()
    if (!suggestion) throw new Error('the demo workflow produced no suggestion')
    options.show({ ...suggestion, isDemo: false })
    await sleep(2500)
    const window = getWorkflowNoticeWindow()
    if (!window) throw new Error('no notice window')
    const save = async (name: string) => {
      const image = await window.webContents.capturePage()
      writeFileSync(join(options.folder, name), image.toPNG())
    }
    await save('notice.png')
    await window.webContents.executeJavaScript(
      "[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Review'))?.click()"
    )
    await sleep(1200)
    await save('notice-review.png')
    app.exit(0)
  } catch (error) {
    console.error('[capture] failed:', error)
    app.exit(1)
  }
}
