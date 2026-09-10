# Noma Device Firmware

The first real (non-virtual) physical prototype for Noma — an ESP32 sketch
that speaks the exact HOST↔DEVICE protocol `Noma App/docs/hardware-protocol.md`
already specifies and `VirtualHardwareDevice` already exercises in-process.
This is the device side of `Noma App/src/main/hardware/serialDevice.ts`
(`SerialHardwareDevice`), the desktop-side counterpart written alongside this
sketch — see that file's doc comment for the full picture.

**Status: written against the documented protocol, not yet flashed onto or
verified against real hardware.** Treat pin assignments as a starting point
for your own wiring, not a verified BOM.

## Why this exists

Every prior implementation of `HardwareDevice` (`VirtualHardwareDevice`, the
`STM32HardwareDevice` stub) proved the *interface* was sufficient — this is
the first attempt to prove it against something that can't be faked: real
buttons, a real encoder, a real display, over a real wire. Nothing about the
message vocabulary changes here; only the transport (serial instead of an
in-process call or a loopback WebSocket) is new.

## Reference parts list (MVP, no custom PCB)

| Part | Suggestion | Approx. cost |
|---|---|---|
| Microcontroller | Seeed XIAO ESP32-S3 (or any ESP32 board with native USB CDC) | $10-14 |
| Display | 128×32 or 128×64 SSD1306 I2C OLED | $3-5 |
| Buttons | 4× tactile switches (real keyswitches for feel, optional) | ~$1 each |
| Rotary control | 1× EC11 rotary encoder with push button | $1-2 |
| Feedback | 1× WS2812/NeoPixel addressable RGB LED | ~$1 |
| Connectivity | USB cable (serial + power — skip Bluetooth for v1) | — |

Total: roughly $25-35, buildable on a breadboard in a day or two.

## Suggested wiring (adjust the `#define`s at the top of the sketch to match)

| Signal | Default pin |
|---|---|
| Button 1 (slot 1) | GPIO 4 |
| Button 2 (slot 2) | GPIO 5 |
| Button 3 (slot 3) | GPIO 6 |
| Button 4 (slot 4) | GPIO 7 |
| Encoder A | GPIO 8 |
| Encoder B | GPIO 9 |
| Encoder push | GPIO 10 |
| NeoPixel data | GPIO 21 |
| OLED SDA / SCL | your board's default I2C pins |

Buttons and the encoder's A/B/push pins are wired to ground through the
switch, using the ESP32's internal pull-ups (`INPUT_PULLUP`) — no external
resistors needed. The OLED is I2C (`0x3C` by default — check your specific
module).

## Required Arduino libraries (Library Manager)

- `Adafruit SSD1306`
- `Adafruit GFX Library`
- `Adafruit NeoPixel`
- `ArduinoJson` (v6.x)

## Protocol summary

Line-delimited JSON over USB CDC serial, 115200 baud, one object per line,
`\n`-terminated. Full spec: `Noma App/docs/hardware-protocol.md`.

**Device → Host:** `BUTTON_PRESS`, `ENCODER_ROTATE`, `DEVICE_STATUS` (reply
to `GET_STATUS`), `PONG` (reply to `PING`).

**Host → Device:** `SET_CONTROLS`, `SET_DISPLAY`, `SET_LED`, `GET_STATUS`,
`PING`. (`SET_PROFILE`/`COMMAND` are reserved/unused, matching the desktop
app's own current implementation — see hardware-protocol.md.)

## Bring-up order

1. Flash the sketch, open a serial terminal (115200 baud) instead of the
   desktop app first — send `{"type":"GET_STATUS"}\n` by hand and confirm a
   `DEVICE_STATUS` line comes back. This isolates firmware bugs from
   desktop-side ones before involving Noma App at all.
2. Send `{"type":"SET_CONTROLS","payload":[{"id":"test","slot":1,"label":"HI"}]}\n`
   and confirm the OLED updates and `GET_STATUS` now echoes that control back.
3. Press physical button 1 and confirm a `BUTTON_PRESS` line appears
   unprompted.
4. Only once 1-3 all work standalone, point `SerialHardwareDevice` at the
   board's serial port (see `serialTransport.ts`'s doc comment — you'll need
   `npm install serialport @serialport/parser-readline` in `Noma App` first).
   This class is deliberately not wired into the running app's default
   device yet; see its doc comment for why, and what to decide once you get
   this far.

## Keeping this in sync

There is no shared schema between this sketch and the TypeScript app (same
as the hand-copied constants between `Noma App` and `Noma Virtual Device`).
If `docs/hardware-protocol.md`'s message vocabulary or
`PROTOCOL_VERSION` ever changes, update both `serialDevice.ts` and this
sketch by hand.
