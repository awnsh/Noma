import { app, type BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { sleep } from './util'

/**
 * Captures the real main window as PNGs for the website
 * (`NOMA_CAPTURE_APP=<folder>`, only honoured together with
 * NOMA_TEST_USER_DATA_DIR so it never touches a real profile). Same idea as
 * captureNotice.ts: the site shows what the product actually draws. Skips
 * onboarding, points the context at each demo application in turn, replays
 * the demo workflow so Home has a real suggestion, and saves each page.
 */
export async function captureApp(options: {
  folder: string
  window: BrowserWindow
  makeSuggestion: () => Promise<void>
}): Promise<void> {
  const { window } = options
  const run = (code: string) => window.webContents.executeJavaScript(code)
  const open = (label: string) =>
    run(`[...document.querySelectorAll('nav button, aside button, button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})?.click()`)
  const save = async (name: string) => {
    const image = await window.webContents.capturePage()
    writeFileSync(join(options.folder, name), image.toPNG())
  }
  try {
    mkdirSync(options.folder, { recursive: true })
    if (window.webContents.isLoading()) await new Promise((resolve) => window.webContents.once('did-finish-load', () => resolve(undefined)))
    window.setSize(1440, 900)
    window.show()
    // First launch, before setup: what a new person sees first.
    await sleep(1500)
    await save('onboarding.png')
    for (const step of ['glide', 'flow', 'firstAction']) {
      await run(`window.flow.saveOnboardingState({ step: '${step}' })`)
      window.webContents.reload()
      await new Promise((resolve) => window.webContents.once('did-finish-load', () => resolve(undefined)))
      await sleep(1500)
      await save(`onboarding-${step}.png`)
    }
    await run(
      "window.flow.saveOnboardingState({ completed: true, step: 'firstAction', selectedUseCases: [], flowEnabled: true, hardwareSkipped: true })"
    )
    // The state someone sees after setup rather than first launch: Flow and
    // Glide on, the checklist dismissed, no scrollbar in the picture.
    await run(
      "window.flow.setWorkflowMonitoringEnabled(true); window.flow.setGlideEnabled(true); localStorage.setItem('noma.home.gettingStartedHidden', '1')"
    )
    window.webContents.reload()
    await new Promise((resolve) => window.webContents.once('did-finish-load', () => resolve(undefined)))
    await window.webContents.insertCSS('::-webkit-scrollbar { display: none !important; }')
    await sleep(1500)

    for (const id of ['code', 'chrome', 'claude']) {
      await run(`window.flow.setDemoApplication(${JSON.stringify(id)})`)
      await open('Home')
      await sleep(1200)
      await save(`home-${id}.png`)
    }

    await options.makeSuggestion()
    await run("window.flow.setDemoApplication('code')")
    await open('Workflows')
    await sleep(300)
    await open('Home')
    await sleep(1500)
    await save('home-suggestion.png')
    // NOMA_CAPTURE_HOLD: keep Home on screen, on top, so the real window
    // (with its OS material, which capturePage can't see) can be
    // photographed from the screen. Writes the window's bounds in physical
    // pixels for that.
    if (process.env.NOMA_CAPTURE_HOLD) {
      const { screen } = await import('electron')
      window.setSize(1280, 800)
      window.center()
      await sleep(600)
      const bounds = window.getBounds()
      const scale = screen.getDisplayMatching(bounds).scaleFactor
      writeFileSync(join(options.folder, 'bounds.json'), JSON.stringify({ ...bounds, scale }))
      window.setAlwaysOnTop(true)
      window.focus()
      await sleep(Number(process.env.NOMA_CAPTURE_HOLD) / 2)
      // The second half unfocused, still on top: Windows draws the
      // material differently for an inactive window.
      window.blur()
      await sleep(Number(process.env.NOMA_CAPTURE_HOLD) / 2)
      window.setAlwaysOnTop(false)
    }
    await open('Workflows')
    await sleep(1200)
    await save('workflows.png')
    await open('Glide')
    await sleep(1200)
    await save('glide.png')
    // Every other page, for design review (not used by the website).
    for (const label of ['Learning', 'Activity', 'Macro Studio', 'Profiles', 'Usage Stats', 'Settings']) {
      await open(label)
      await sleep(1000)
      await save(`page-${label.toLowerCase().replace(/\s+/g, '-')}.png`)
    }
    app.exit(0)
  } catch (error) {
    console.error('[capture] failed:', error)
    app.exit(1)
  }
}
