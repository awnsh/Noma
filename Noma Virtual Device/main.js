// Noma Virtual Device — main process.
//
// Deliberately tiny: this app has no business logic of its own. It's a
// dumb terminal for docs/hardware-protocol.md's HOST<->DEVICE messages,
// exactly the way a real STM32-based module would be — see the renderer's
// app.js for the actual protocol handling (a plain WebSocket to Noma App,
// a web API, unaffected by contextIsolation).
const { app, BrowserWindow } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    // A narrow vertical strip, not a dashboard panel — matches the real
    // module (a narrow vertical OLED strip beside the arrow keys, see
    // Noma Website's KeyboardVisual.tsx) now that the 4 buttons are
    // stacked key-sized rather than laid out as a 2x2 grid of tiles.
    width: 180,
    height: 560,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0c',
    title: 'Noma Virtual Device',
    // No native OS title bar — the window has its own drag handle + close
    // button in the renderer instead (index.html's `.titlebar`), styled to
    // match the device faceplate rather than a normal app window. A native
    // frame's caption buttons don't reliably respond while `focusable:
    // false` below is set (they're designed around the window becoming
    // active on click, which this window deliberately never does).
    frame: false,
    // Floats over every other window/app, like a physical device sitting
    // on the desk next to the keyboard — not a normal window you alt-tab
    // to or that ever takes over the screen.
    alwaysOnTop: true,
    skipTaskbar: true,
    // This is the important one, not just cosmetic: a real button module
    // never steals OS focus when pressed. If this window COULD become the
    // foreground window, clicking a button here would make Noma App's own
    // active-window detection (windowsAdapter.ts) see "Noma Virtual
    // Device" as the current application instead of whatever real app
    // (VS Code, Premiere, ...) the press is actually meant to act on —
    // exactly the bug this whole tool exists to avoid. `focusable: false`
    // (WS_EX_NOACTIVATE on Windows) means the OS foreground window never
    // changes when this window is clicked, while mouse clicks on its own
    // buttons still work normally — Chromium handles those independently
    // of window activation.
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
