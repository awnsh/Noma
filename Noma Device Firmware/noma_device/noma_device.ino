/*
 * Noma Device Firmware — reference implementation of the HOST<->DEVICE
 * protocol described in `Noma App/docs/hardware-protocol.md` (line-
 * delimited JSON over USB CDC serial, one JSON object per line, `\n`-
 * terminated). This talks directly to `SerialHardwareDevice`
 * (`Noma App/src/main/hardware/serialDevice.ts`) — same message names,
 * same payload shapes VirtualHardwareDevice already exercises in-process
 * today. See that file's own doc comment before changing message shapes
 * here; the two have to stay in sync by hand — there's no shared schema
 * between an Arduino sketch and the TypeScript app, same as the
 * hand-copied constants between Noma App and Noma Virtual Device.
 *
 * NOT YET FLASHED OR TESTED AGAINST REAL HARDWARE. This is written
 * carefully against the documented protocol and each library's public
 * API, but there is no physical board in this repository's history to
 * verify pin choices, timing, or wiring against. Treat the pin
 * assignments below as a starting point to adapt to your actual build,
 * not a verified bill of materials — see the sibling README.md for the
 * parts list this was written against.
 *
 * Target: any ESP32 board with native USB (e.g. Seeed XIAO ESP32-S3,
 * Arduino Nano ESP32). Arduino Library Manager dependencies:
 *   - "Adafruit SSD1306"
 *   - "Adafruit GFX Library"
 *   - "Adafruit NeoPixel"
 *   - "ArduinoJson" (v6.x)
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------------------
// Wiring — adjust every pin here to match your actual build. See
// README.md for the reference parts list and a suggested layout.
// ---------------------------------------------------------------------
#define PIN_BTN_1 4
#define PIN_BTN_2 5
#define PIN_BTN_3 6
#define PIN_BTN_4 7
#define PIN_ENC_A 8
#define PIN_ENC_B 9
#define PIN_ENC_BTN 10
#define PIN_NEOPIXEL 21

#define OLED_WIDTH 128
#define OLED_HEIGHT 32
#define OLED_I2C_ADDR 0x3C

const uint8_t BUTTON_PINS[4] = { PIN_BTN_1, PIN_BTN_2, PIN_BTN_3, PIN_BTN_4 };
const unsigned long DEBOUNCE_MS = 30;
// Mirrors PROTOCOL_VERSION in Noma App/src/shared/constants/index.ts —
// update both by hand if this ever changes.
const char* PROTOCOL_VERSION = "0.1.0";

Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
Adafruit_NeoPixel pixel(1, PIN_NEOPIXEL, NEO_GRB + NEO_KHZ800);

// ---------------------------------------------------------------------
// Local mirror of host-assigned state — exactly what a real Control looks
// like (shared/types/index.ts's Control), kept per physical slot 1-4.
// ---------------------------------------------------------------------
struct ControlSlot {
  bool assigned = false;
  String id;
  int slot = 0;
  String label;
};
ControlSlot controls[4];
String statusLine = "Noma";  // displays["status"] — current app/context line

bool lastButtonState[4] = { HIGH, HIGH, HIGH, HIGH };
unsigned long lastDebounceTime[4] = { 0, 0, 0, 0 };

uint8_t lastEncoderState = 0;
String serialBuffer;

void setup() {
  Serial.begin(115200);

  for (uint8_t i = 0; i < 4; i++) pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_BTN, INPUT_PULLUP);

  pixel.begin();
  setLed(false, nullptr);

  Wire.begin();
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
    display.setTextColor(SSD1306_WHITE);
    drawScreen();
  }

  lastEncoderState = readEncoderState();
}

void loop() {
  pollButtons();
  pollEncoder();
  pollSerial();
}

// ---------------------------------------------------------------------
// DEVICE -> HOST: BUTTON_PRESS / ENCODER_ROTATE
// ---------------------------------------------------------------------

void pollButtons() {
  for (uint8_t i = 0; i < 4; i++) {
    bool reading = digitalRead(BUTTON_PINS[i]);
    if (reading != lastButtonState[i]) {
      lastDebounceTime[i] = millis();
    }
    if ((millis() - lastDebounceTime[i]) > DEBOUNCE_MS && reading != lastButtonState[i]) {
      lastButtonState[i] = reading;
      if (reading == LOW) {  // active-low: pressed
        sendButtonPress(i + 1);
      }
    }
  }
}

void sendButtonPress(int slot) {
  ControlSlot& c = controls[slot - 1];
  StaticJsonDocument<192> doc;
  doc["type"] = "BUTTON_PRESS";
  JsonObject payload = doc.createNestedObject("payload");
  // A slot the host hasn't assigned yet still reports a press (using the
  // slot number itself as a fallback id) rather than silently dropping it
  // — matches "the hardware layer shouldn't need to know what a control
  // means" from docs/architecture.md's "Real execution" section.
  payload["controlId"] = c.assigned ? c.id : ("slot-" + String(slot));
  payload["slot"] = slot;
  sendLine(doc);
}

uint8_t readEncoderState() {
  return (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
}

void pollEncoder() {
  uint8_t state = readEncoderState();
  if (state == lastEncoderState) return;

  // Minimal quadrature decode: a lookup table of valid state transitions.
  // Anything not in the table is contact bounce/noise and is ignored
  // rather than reported as a spurious rotation.
  static const int8_t TRANSITION[16] = {
    0, -1, 1, 0,
    1, 0, 0, -1,
    -1, 0, 0, 1,
    0, 1, -1, 0
  };
  int8_t delta = TRANSITION[(lastEncoderState << 2) | state];
  if (delta != 0) {
    StaticJsonDocument<160> doc;
    doc["type"] = "ENCODER_ROTATE";
    JsonObject payload = doc.createNestedObject("payload");
    // No module-registration protocol exists over this transport yet (see
    // docs/hardware-protocol.md's DEVICE_STATUS.modules) — a fixed logical
    // id is enough for a single built-in encoder.
    payload["moduleId"] = "encoder-1";
    payload["delta"] = delta;
    sendLine(doc);
  }
  lastEncoderState = state;
}

void sendLine(JsonDocument& doc) {
  serializeJson(doc, Serial);
  Serial.print('\n');
}

// ---------------------------------------------------------------------
// HOST -> DEVICE: SET_CONTROLS / SET_DISPLAY / SET_LED / GET_STATUS / PING
// ---------------------------------------------------------------------

void pollSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      handleLine(serialBuffer);
      serialBuffer = "";
    } else if (c != '\r') {
      serialBuffer += c;
    }
  }
}

void handleLine(const String& line) {
  if (line.length() == 0) return;

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, line);
  if (err) return;  // malformed/partial line — ignore, the next line resyncs

  const char* type = doc["type"];
  if (!type) return;

  if (strcmp(type, "SET_CONTROLS") == 0) {
    handleSetControls(doc["payload"].as<JsonArray>());
  } else if (strcmp(type, "SET_DISPLAY") == 0) {
    handleSetDisplay(doc["payload"]["displayId"], doc["payload"]["content"]);
  } else if (strcmp(type, "SET_LED") == 0) {
    bool on = doc["payload"]["state"]["on"] | false;
    const char* color = doc["payload"]["state"]["color"];
    setLed(on, color);
  } else if (strcmp(type, "GET_STATUS") == 0) {
    sendDeviceStatus();
  } else if (strcmp(type, "PING") == 0) {
    StaticJsonDocument<32> pong;
    pong["type"] = "PONG";
    sendLine(pong);
  }
  // COMMAND / SET_PROFILE: no defined behavior yet — matches
  // hardware-protocol.md (SET_PROFILE is reserved; sendCommand has no
  // commands defined today). Ignored on purpose, not an error.
}

void handleSetControls(JsonArray incoming) {
  for (uint8_t i = 0; i < 4; i++) controls[i].assigned = false;
  for (JsonObject item : incoming) {
    int slot = item["slot"] | 0;
    if (slot < 1 || slot > 4) continue;
    controls[slot - 1].assigned = true;
    controls[slot - 1].id = String((const char*)item["id"]);
    controls[slot - 1].slot = slot;
    controls[slot - 1].label = String((const char*)item["label"]);
  }
  drawScreen();
}

void handleSetDisplay(const char* displayId, const char* content) {
  if (!displayId || !content) return;
  if (strcmp(displayId, "status") == 0) {
    statusLine = String(content);
    drawScreen();
  }
  // Additional displayIds beyond "status" have no defined placement on a
  // 2-line OLED yet — extend drawScreen() if/when a second readout is needed.
}

void sendDeviceStatus() {
  StaticJsonDocument<512> doc;
  doc["type"] = "DEVICE_STATUS";
  JsonObject payload = doc.createNestedObject("payload");
  payload["connected"] = true;
  payload["deviceType"] = "serial";
  payload["protocolVersion"] = PROTOCOL_VERSION;

  JsonArray controlsArray = payload.createNestedArray("controls");
  for (uint8_t i = 0; i < 4; i++) {
    if (!controls[i].assigned) continue;
    JsonObject c = controlsArray.createNestedObject();
    c["id"] = controls[i].id;
    c["slot"] = controls[i].slot;
    c["label"] = controls[i].label;
  }

  JsonObject displays = payload.createNestedObject("displays");
  displays["status"] = statusLine;
  payload.createNestedArray("modules");  // no module bus over this transport yet

  sendLine(doc);
}

// ---------------------------------------------------------------------
// Display / LED
// ---------------------------------------------------------------------

void drawScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(statusLine);
  display.drawLine(0, 10, OLED_WIDTH, 10, SSD1306_WHITE);

  String row;
  for (uint8_t i = 0; i < 4; i++) {
    row += controls[i].assigned ? controls[i].label : String("--");
    if (i < 3) row += " ";
  }
  display.setCursor(0, 16);
  display.println(row);
  display.display();
}

void setLed(bool on, const char* color) {
  if (!on) {
    pixel.setPixelColor(0, pixel.Color(0, 0, 0));
  } else if (color && strlen(color) == 7 && color[0] == '#') {
    long value = strtol(color + 1, nullptr, 16);
    pixel.setPixelColor(0, pixel.Color((value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF));
  } else {
    pixel.setPixelColor(0, pixel.Color(255, 255, 255));
  }
  pixel.show();
}
