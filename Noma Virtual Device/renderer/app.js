// Noma Virtual Device — renderer.
//
// This is the whole app: connect to Noma App's local device transport
// (docs/hardware-protocol.md, src/main/hardware/deviceTransportServer.ts
// in the Noma App project), render whatever DEVICE_STATUS says, and
// report BUTTON_PRESS when a button is clicked. No shortcut vocabulary,
// no execution, no persistence — exactly the DEVICE side of that
// protocol, same as a real firmware module would be.

// Must match Noma App's DEVICE_TRANSPORT_PORT
// (Noma App/src/shared/constants/index.ts) — no shared package between
// the two projects, so this is a hand-kept-in-sync constant, same pattern
// already used between the website and app for color tokens.
const DEVICE_TRANSPORT_PORT = 47156
const RECONNECT_DELAY_MS = 2000
const PRESS_FLASH_MS = 150
const FAILURE_FLASH_MS = 1200
const FAILURE_MESSAGE_MS = 4000
const SLOT_COUNT = 4

const closeBtnEl = document.getElementById('close-btn')
closeBtnEl.addEventListener('click', () => window.close())

const oledStatusEl = document.getElementById('oled-status')
const oledAppEl = document.getElementById('oled-app')
const oledLineEl = document.getElementById('oled-line')
const buttonsEl = document.getElementById('buttons')

// 1-indexed by slot (1..SLOT_COUNT) — index 0 is always unused, so the
// array needs SLOT_COUNT+1 entries, not SLOT_COUNT.
/** @type {Array<{id:string, slot:number, label:string} | undefined>} */
let controlsBySlot = new Array(SLOT_COUNT + 1).fill(undefined)
/** @type {Map<string, HTMLButtonElement>} rebuilt on every renderButtons() call */
let buttonsByControlId = new Map()
let socket = null

// What the OLED's bottom line reverts to once a failure message's timeout
// clears — otherwise "reverting" would have nothing correct to revert to.
let idleLineText = 'Idle'
let lineRevertTimeout = null

function setConnectionState(state) {
  // state: 'connecting' | 'connected' | 'waiting'
  oledStatusEl.classList.remove('connected', 'waiting')
  if (state === 'connected') {
    oledStatusEl.textContent = 'connected'
    oledStatusEl.classList.add('connected')
  } else if (state === 'waiting') {
    oledStatusEl.textContent = 'noma not running — waiting…'
    oledStatusEl.classList.add('waiting')
    oledAppEl.textContent = '—'
    setIdleLine('Idle') // also clears any stale failure message/timeout
    controlsBySlot = new Array(SLOT_COUNT + 1).fill(undefined)
    renderButtons()
  } else {
    oledStatusEl.textContent = 'connecting…'
  }
}

function renderButtons() {
  buttonsEl.innerHTML = ''
  buttonsByControlId = new Map()
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const control = controlsBySlot[slot]
    const btn = document.createElement('button')
    btn.className = 'control-btn'
    btn.disabled = !control

    const slotLabel = document.createElement('span')
    slotLabel.className = 'control-slot'
    slotLabel.textContent = String(slot) // a real key just has a position, not a full "Control N" caption
    slotLabel.title = `Control ${slot}`

    const label = document.createElement('span')
    label.className = 'control-label'
    label.textContent = control ? control.label : '—'

    btn.append(slotLabel, label)

    if (control) {
      btn.addEventListener('click', () => pressControl(control, btn))
      buttonsByControlId.set(control.id, btn)
    }

    buttonsEl.appendChild(btn)
  }
}

/** Sets the OLED's bottom line as its normal, "nothing's wrong" content —
 *  remembered so a later failure message knows what to revert back to —
 *  and cancels any failure message currently showing. */
function setIdleLine(text) {
  idleLineText = text
  if (lineRevertTimeout !== null) {
    window.clearTimeout(lineRevertTimeout)
    lineRevertTimeout = null
  }
  oledLineEl.textContent = text
  oledLineEl.title = ''
  oledLineEl.classList.remove('warn')
}

/**
 * A press was refused or failed for real (e.g. a control mapped to
 * Ctrl+Q — permanently blocked host-side since it can quit an
 * application, see Noma App's actionExecutor.ts BLOCKED_COMBOS) — without
 * this, a refused press looked identical to a button silently doing
 * nothing.
 * Flashes the specific button red and shows the reason on the OLED
 * (truncated on-screen at this width; the full text is still available as
 * a hover tooltip) until it reverts back to `idleLineText`.
 */
function applyActionResult(result) {
  if (result.ok) return // a successful press already got its blue flash on click

  const btn = buttonsByControlId.get(result.controlId)
  if (btn) {
    btn.classList.add('failed')
    window.setTimeout(() => btn.classList.remove('failed'), FAILURE_FLASH_MS)
  }

  if (lineRevertTimeout !== null) window.clearTimeout(lineRevertTimeout)
  oledLineEl.textContent = result.reason || 'Refused'
  oledLineEl.title = result.reason || ''
  oledLineEl.classList.add('warn')
  lineRevertTimeout = window.setTimeout(() => {
    oledLineEl.textContent = idleLineText
    oledLineEl.title = ''
    oledLineEl.classList.remove('warn')
    lineRevertTimeout = null
  }, FAILURE_MESSAGE_MS)
}

function pressControl(control, btnEl) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  socket.send(
    JSON.stringify({
      type: 'BUTTON_PRESS',
      payload: { controlId: control.id, slot: control.slot }
    })
  )
  btnEl.classList.add('pressed')
  window.setTimeout(() => btnEl.classList.remove('pressed'), PRESS_FLASH_MS)
}

function applyStatus(status) {
  setConnectionState('connected')

  const bySlot = new Map((status.controls || []).map((c) => [c.slot, c]))
  controlsBySlot = new Array(SLOT_COUNT + 1).fill(undefined)
  for (const [slot, control] of bySlot) controlsBySlot[slot] = control
  renderButtons()

  const appName = status.displays && status.displays.status
  oledAppEl.textContent = appName || 'Idle'
  setIdleLine(status.deviceType === 'virtual' ? 'virtual device' : status.deviceType)
}

function connect() {
  setConnectionState('connecting')
  socket = new WebSocket(`ws://127.0.0.1:${DEVICE_TRANSPORT_PORT}`)

  socket.addEventListener('message', (event) => {
    let message
    try {
      message = JSON.parse(event.data)
    } catch {
      return
    }
    if (message.type === 'DEVICE_STATUS') applyStatus(message.payload)
    else if (message.type === 'ACTION_EXECUTED') applyActionResult(message.payload)
  })

  socket.addEventListener('close', scheduleReconnect)
  socket.addEventListener('error', () => socket.close())
}

function scheduleReconnect() {
  setConnectionState('waiting')
  window.setTimeout(connect, RECONNECT_DELAY_MS)
}

renderButtons()
connect()
