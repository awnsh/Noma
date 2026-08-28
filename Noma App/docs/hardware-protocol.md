# Flow ↔ Hardware Protocol (v0.1.0)

The communication protocol between Flow (the host software) and the
eventual physical keyboard (brainstorm.md section 21). This is a design
document for hardware that doesn't exist yet — everything here is already
implemented and exercised today by `VirtualHardwareDevice`, so a real
`USBHardwareDevice`/`SerialHardwareDevice` has an exact, tested contract to
implement against rather than a description to interpret from scratch.

## Status

**Implemented today, in-process**: every message below corresponds 1:1 to
a `HardwareDevice` interface method (HOST → DEVICE) or a `DeviceEvent`
variant (DEVICE → HOST) — see `src/main/hardware/types.ts` and
`src/shared/types/index.ts`. `VirtualHardwareDevice` is the reference
implementation; every message it sends/receives is recorded to a live log
visible in Developer Mode, using the exact message names below.

**Not yet real**: there is no serial/USB transport, no framing, no
firmware. The wire format below (message names, JSON shape) is designed
now so that work is "write a transport and a firmware parser for an
already-agreed contract," not "invent a protocol under deadline while also
bringing up hardware for the first time."

## Transport (proposed, not yet built)

Line-delimited JSON over USB CDC (virtual serial port), one JSON object
per line, UTF-8, newline-terminated (`\n`). Chosen over a binary format
specifically because "don't over-engineer" (brainstorm.md section 25)
applies to firmware too: an STM32 can parse line-delimited JSON without a
custom binary schema, and the same messages can be logged/replayed as
plain text (exactly what Developer Mode already does). Revisit only if a
real device's flash/RAM budget or serial throughput can't tolerate the
overhead — reasonable to defer that decision until real hardware exists to
measure.

Every message carries a `type` field and (except `PING`) an accompanying
payload. `protocolVersion` (`PROTOCOL_VERSION` in `src/shared/constants`,
currently `"0.1.0"`) is exchanged once at connect time via `GET_STATUS` /
`DEVICE_STATUS` so either side can refuse an incompatible peer rather than
silently misbehave.

## HOST → DEVICE

| Message        | Payload                                    | `HardwareDevice` method    |
|----------------|---------------------------------------------|-----------------------------|
| `SET_CONTROLS` | `Control[]` (id, slot, label, action)       | `setControls(controls)`     |
| `SET_DISPLAY`  | `{ displayId: string, content: string }`    | `updateDisplay(id, content)`|
| `SET_LED`      | `{ ledId: string, state: LEDState }`        | `setLEDState(id, state)`    |
| `SET_PROFILE`  | *(reserved — not yet distinct from `SET_CONTROLS`)* | —                    |
| `PING`         | *(none)*                                    | —                            |
| `GET_STATUS`   | *(none)* → replies with `DEVICE_STATUS`     | `getStatus()`                |
| `COMMAND`      | `{ command: string, payload?: unknown }`    | `sendCommand(command, payload)` |

Note: brainstorm.md section 21 lists `SET_CONTROL` (singular) and
`SET_PROFILE` as distinct messages. Today, `setControls()` always sends
the full 4-control set at once (matches how `ApplicationContextService`
already resolves a whole profile on every app switch — see
`docs/architecture.md`'s learning-loop diagram), so `SET_PROFILE` is
reserved rather than implemented: a real device doesn't yet need a
separate "load the whole profile" message distinct from "here are your 4
controls." Revisit if per-control updates (without resending all 4) turn
out to matter for latency once real hardware exists.

## DEVICE → HOST

| Message               | Payload                                  | `DeviceEvent` variant                          |
|------------------------|-------------------------------------------|--------------------------------------------------|
| `BUTTON_PRESS`         | `{ controlId: string, slot: number }`     | `{ type: 'buttonPress', controlId, slot }`       |
| `ENCODER_ROTATE`       | `{ moduleId: string, delta: number }`     | `{ type: 'encoderRotate', moduleId, delta }`     |
| `MODULE_CONNECTED`     | `{ module: Module }`                      | `{ type: 'moduleConnected', module }`            |
| `MODULE_DISCONNECTED`  | `{ moduleId: string }`                    | `{ type: 'moduleDisconnected', moduleId }`       |
| `DEVICE_STATUS`        | `DeviceStatus` (connected, protocolVersion, firmwareVersion, controls, displays, modules) | reply to `GET_STATUS` |

Every one of these is already a real, typed event flowing through the app
today — `VirtualHardwareDevice.pressControl()` (a UI click) and
`addModuleByType()`/`removeModule()` (the Virtual Keyboard's module
picker) raise the exact same `DeviceEvent` shapes a firmware device will
raise from a real button or a module being plugged in. The host-side
handling (main/index.ts's device-event listener → pattern detection,
suggestion engine, action execution) does not know or care which one
happened.

## Versioning

`DeviceStatus.protocolVersion` is a semver string. The host should refuse
to trust a device reporting a `protocolVersion` with a different major
version (breaking change) rather than guess at compatibility — not yet
implemented since there's only ever been one version, but worth deciding
now: **fail closed on a version mismatch, don't attempt best-effort
interop.**

## Developer Mode

The Developer page (`src/renderer/src/pages/Developer.tsx`) shows this
protocol live: every HOST → DEVICE call and DEVICE → HOST event, in the
message names from the tables above, as they happen — backed by
`VirtualHardwareDevice`'s internal log (`getLog()`/`onLogEntry()` in
`src/main/hardware/virtualDevice.ts`). This is deliberately the same log a
future firmware bridge will need for debugging real hardware bring-up, not
a separate debug-only feature.
