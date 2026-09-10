import type { LineTransport } from './serialDevice'

/**
 * Wraps a real USB CDC serial port into the minimal `LineTransport` shape
 * `SerialHardwareDevice` depends on. This is the one place in the app that
 * needs the `serialport` npm package — deliberately isolated here behind a
 * runtime `require` (not a static `import`) so nothing else in the app
 * fails to build or typecheck before that package is installed. Not wired
 * into anything yet (see serialDevice.ts's doc comment for why) — call
 * this yourself once you're ready to point a running Noma App at a real
 * attached device.
 *
 * Before calling this, install the two packages it needs:
 *   npm install serialport @serialport/parser-readline
 *
 * Not unit tested directly — it needs a real port, which no CI/dev
 * environment here has. serialDevice.test.ts covers all of the actual
 * protocol logic (framing, handshake, version checks, message parsing)
 * through an in-memory fake transport instead; this function is
 * deliberately kept this thin specifically so there's as little as
 * possible left unverified by that.
 *
 * See firmware/noma_device/noma_device.ino for the device-side
 * counterpart, and docs/hardware-protocol.md for the wire format.
 */
export function openSerialPort(path: string, baudRate = 115200): LineTransport {
  // Untyped on purpose: `serialport`'s own type declarations aren't
  // resolvable (or even necessarily installed) until the packages above
  // are added, and this function must not require that to typecheck the
  // rest of the app. `require`'s return type is `any` per @types/node, so
  // this doesn't trip `noImplicitAny` the way an actually-implicit `any`
  // would.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serialportModule = require('serialport')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const readlineModule = require('@serialport/parser-readline')

  const port = new serialportModule.SerialPort({ path, baudRate })
  const parser = port.pipe(new readlineModule.ReadlineParser({ delimiter: '\n' }))
  const listeners = new Set<(line: string) => void>()

  parser.on('data', (line: string) => {
    for (const listener of listeners) listener(line)
  })

  return {
    write(line: string) {
      port.write(`${line}\n`)
    },
    onLine(callback: (line: string) => void) {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    close() {
      port.close()
    }
  }
}
