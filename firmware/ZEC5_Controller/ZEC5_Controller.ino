// ============================================================================
//  ZEC-5 | Zimbabwean Energy Controller — 5 Channel
//  ESP32 Firmware — Full Build
//
//  Author  : Engineer Nyasha Praise Mapetere
//  Date    : 17 May 2026
//  School research project — liable to refactoring and further development
//
//  Hardware:
//    - ESP32 DevKit V1
//    - 5x SCT-013-030 (30A/1V) CT Clamp sensors via 3.5mm audio jacks
//    - 8x Relay module (active LOW)
//
//  Communication:
//    - WiFi Access Point mode (SSID: ZEC-5, Password: zec5admin)
//    - WebSocket server on ws://<IP>/ws
//    - Broadcasts: { "sensors": [s1..s5], "relays": [r1..r8] }  every 1.5s
//    - Receives:   { "relay": <0-7>, "state": <true/false> }
//
//  Required Libraries (install via Arduino Library Manager):
//    1. EmonLib                     (by OpenEnergyMonitor)
//    2. ESPAsyncWebServer           (by me-no-dev / lacamera)
//    3. AsyncTCP                    (by me-no-dev / dvarrel)  [ESP32 dependency]
//    4. ArduinoJson                 (by Benoit Blanchon, v7+)
// ============================================================================

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include "EmonLib.h"

// ========================== CONFIGURATION ====================================

// WiFi Access Point credentials
const char* AP_SSID     = "ZEC-5";
const char* AP_PASSWORD = "zec5admin";

// --- CT Clamp Sensor Pins (ADC1 only — ADC2 conflicts with WiFi) ---
// All on ADC1: GPIO 32, 33, 34, 35, 36, 39
const int SENSOR_PINS[5] = {
  36,   // S1 — Fridge      (VP)
  39,   // S2 — Geyser      (VN)
  34,   // S3 — Borehole
  35,   // S4 — Entertainment
  32    // S5 — Lighting
};

// CT clamp calibration value (30A / 1V = 30.0)
// Adjust per-sensor if your clamps have different ratios
const float SENSOR_CALIBRATION[5] = {
  30.0,  // S1
  30.0,  // S2
  30.0,  // S3
  30.0,  // S4
  30.0   // S5
};

// Number of samples per Irms calculation
// 1480 samples captures multiple full 50Hz AC cycles for accurate RMS
const int EMON_SAMPLES = 1480;

// Noise floor — readings below this are zeroed out
const float NOISE_FLOOR = 0.1;  // Amps

// --- Relay Output Pins ---
// 8 channels — using safe output GPIOs (no boot-strapping conflicts)
const int RELAY_PINS[8] = {
  4,    // Relay 1 — Main Supply
  16,   // Relay 2 — Geyser
  17,   // Relay 3 — Borehole
  18,   // Relay 4 — Kitchen
  19,   // Relay 5 — Lighting
  21,   // Relay 6 — Entertainment
  22,   // Relay 7 — Garage
  23    // Relay 8 — Auxiliary
};

// Relay module logic: true = LOW activates relay (active-LOW modules)
const bool RELAY_ACTIVE_LOW = true;

// WebSocket broadcast interval (milliseconds)
const unsigned long BROADCAST_INTERVAL = 1500;

// Serial debug output
const bool SERIAL_DEBUG = true;

// ========================== GLOBALS ==========================================

// EmonLib instances — one per sensor
EnergyMonitor emon[5];

// Current sensor readings (Amps RMS)
float sensorValues[5] = {0, 0, 0, 0, 0};

// Relay states
bool relayStates[8] = {false, false, false, false, false, false, false, false};

// WebSocket + HTTP server
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// Timing
unsigned long lastBroadcast = 0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_READ_INTERVAL = 200;  // Read sensors every 200ms
int currentSensorIndex = 0;  // Round-robin sensor reading

// --- Simulated Load Configuration (For testing without physical sensors) ---
#define SIMULATE_SENSORS 1  // Set to 1 to enable software simulation, 0 for physical ADC readings

// ========================== FUNCTION DECLARATIONS ============================

void setupWiFiAP();
void setupSensors();
void setupRelays();
void setupWebSocket();
void readNextSensor();
void broadcastData();
void handleWebSocketMessage(void* arg, uint8_t* data, size_t len);
void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
               AwsEventType type, void* arg, uint8_t* data, size_t len);
void setRelay(int index, bool state);
void printStatus();

// ========================== SETUP ============================================

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("================================================");
  Serial.println("  ZEC-5 | Zimbabwean Energy Controller");
  Serial.println("  5-Channel Current Monitor + 8-Channel Relay");
  Serial.println("  [HARDWARE-IN-THE-LOOP SIMULATION RUNNING]");
  Serial.println("================================================");
  Serial.println();

  // 1. Configure ADC
  analogReadResolution(12);  // 12-bit: 0–4095

  // 2. Initialize sensors
  #if !SIMULATE_SENSORS
  setupSensors();
  #else
  Serial.println("[Sensors] SIMULATION ACTIVE: CT clamps bypassed.");
  #endif

  // 3. Initialize relays (all OFF on boot)
  setupRelays();

  // 4. Start WiFi Access Point
  setupWiFiAP();

  // 5. Start WebSocket server
  setupWebSocket();

  Serial.println();
  Serial.println("[ZEC-5] System ready. Waiting for connections...");
  Serial.println();
}

// ========================== MAIN LOOP ========================================

void loop() {
  // Clean up disconnected WebSocket clients
  ws.cleanupClients();

  unsigned long now = millis();

  // --- Read sensors in round-robin (one per cycle to avoid blocking) ---
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = now;
    readNextSensor();
  }

  // --- Broadcast to all WebSocket clients ---
  if (now - lastBroadcast >= BROADCAST_INTERVAL) {
    lastBroadcast = now;
    broadcastData();

    if (SERIAL_DEBUG) {
      printStatus();
    }
  }
}

// ========================== WIFI ACCESS POINT ================================

void setupWiFiAP() {
  Serial.print("[WiFi] Starting Access Point: ");
  Serial.println(AP_SSID);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  // Give the AP time to initialize
  delay(100);

  IPAddress ip = WiFi.softAPIP();
  Serial.print("[WiFi] AP IP Address: ");
  Serial.println(ip);
  Serial.print("[WiFi] Dashboard URL: http://");
  Serial.println(ip);
  Serial.print("[WiFi] WebSocket URL: ws://");
  Serial.print(ip);
  Serial.println("/ws");
}

// ========================== SENSOR INITIALIZATION ============================

void setupSensors() {
  Serial.println("[Sensors] Initializing 5 CT clamp channels...");

  for (int i = 0; i < 5; i++) {
    emon[i].current(SENSOR_PINS[i], SENSOR_CALIBRATION[i]);
    Serial.print("  S");
    Serial.print(i + 1);
    Serial.print(" -> GPIO ");
    Serial.print(SENSOR_PINS[i]);
    Serial.print(" (cal: ");
    Serial.print(SENSOR_CALIBRATION[i]);
    Serial.println(")");
  }

  Serial.println("[Sensors] All channels initialized.");
}

// ========================== RELAY INITIALIZATION =============================

void setupRelays() {
  Serial.println("[Relays] Initializing 8 relay channels...");

  for (int i = 0; i < 8; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);

    // Set all relays OFF on boot
    if (RELAY_ACTIVE_LOW) {
      digitalWrite(RELAY_PINS[i], HIGH);  // HIGH = OFF for active-low
    } else {
      digitalWrite(RELAY_PINS[i], LOW);   // LOW = OFF for active-high
    }

    // Default simulation modes:
    // Main supply (R1), Geyser (R2), Borehole (R3), Lighting (R5), and Entertainment (R6) start active
    if (i == 0 || i == 1 || i == 2 || i == 4 || i == 5) {
      relayStates[i] = true;
      if (RELAY_ACTIVE_LOW) {
        digitalWrite(RELAY_PINS[i], LOW);
      } else {
        digitalWrite(RELAY_PINS[i], HIGH);
      }
    } else {
      relayStates[i] = false;
    }

    Serial.print("  R");
    Serial.print(i + 1);
    Serial.print(" -> GPIO ");
    Serial.print(RELAY_PINS[i]);
    Serial.print(relayStates[i] ? " [ON]" : " [OFF]");
    Serial.println();
  }

  Serial.println("[Relays] Initialization complete.");
}

// ========================== WEBSOCKET SERVER =================================

void setupWebSocket() {
  Serial.println("[WebSocket] Starting server on /ws ...");

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // Serve a minimal status page at root (optional)
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    String html = "<!DOCTYPE html><html><head><title>ZEC-5</title></head><body>";
    html += "<h1>ZEC-5 Controller</h1>";
    html += "<p>WebSocket endpoint: <code>ws://" + WiFi.softAPIP().toString() + "/ws</code></p>";
    html += "<p>Status: Online</p>";
    html += "</body></html>";
    request->send(200, "text/html", html);
  });

  server.begin();
  Serial.println("[WebSocket] Server started.");
}

void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
               AwsEventType type, void* arg, uint8_t* data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.print("[WebSocket] Client #");
      Serial.print(client->id());
      Serial.print(" connected from ");
      Serial.println(client->remoteIP().toString());

      // Send current state immediately on connect
      {
        JsonDocument doc;
        JsonArray sensors = doc["sensors"].to<JsonArray>();
        for (int i = 0; i < 5; i++) {
          sensors.add(serialized(String(sensorValues[i], 2)));
        }
        JsonArray relays = doc["relays"].to<JsonArray>();
        for (int i = 0; i < 8; i++) {
          relays.add(relayStates[i]);
        }
        String json;
        serializeJson(doc, json);
        client->text(json);
      }
      break;

    case WS_EVT_DISCONNECT:
      Serial.print("[WebSocket] Client #");
      Serial.print(client->id());
      Serial.println(" disconnected.");
      break;

    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;

    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void handleWebSocketMessage(void* arg, uint8_t* data, size_t len) {
  AwsFrameInfo* info = (AwsFrameInfo*)arg;

  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;  // Null-terminate
    String message = (char*)data;

    if (SERIAL_DEBUG) {
      Serial.print("[WebSocket] Received: ");
      Serial.println(message);
    }

    // Parse incoming relay command: { "relay": 0-7, "state": true/false }
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
      Serial.print("[WebSocket] JSON parse error: ");
      Serial.println(error.c_str());
      return;
    }

    if (doc.containsKey("relay") && doc.containsKey("state")) {
      int relayIndex = doc["relay"].as<int>();
      bool relayState = doc["state"].as<bool>();

      if (relayIndex >= 0 && relayIndex < 8) {
        setRelay(relayIndex, relayState);

        // Broadcast updated state to all clients
        broadcastData();
      } else {
        Serial.println("[WebSocket] Invalid relay index.");
      }
    }
  }
}

// ========================== SENSOR READING ===================================

void readNextSensor() {
#if !SIMULATE_SENSORS
  // --- Physical Mode: Read RMS current from CT clamps ---
  float irms = emon[currentSensorIndex].calcIrms(EMON_SAMPLES);
  if (irms < NOISE_FLOOR) {
    irms = 0.0;
  }
  sensorValues[currentSensorIndex] = irms;
#else
  // --- Simulation Mode: Dynamically model load cycles in code ---
  // Main switch (Relay 1) must be ON, otherwise all loads are instantly cut to 0.0A!
  if (!relayStates[0]) {
    sensorValues[currentSensorIndex] = 0.0;
    currentSensorIndex = (currentSensorIndex + 1) % 5;
    return;
  }

  unsigned long now = millis();
  float simulatedVal = 0.0;

  switch (currentSensorIndex) {
    case 0: { // S1 — Fridge (Continuous Motor Load)
      // Cycle: On for 45s, Off for 45s to make demo cycle dynamic
      unsigned long cycleSec = (now / 1000) % 90;
      if (cycleSec < 45) {
        // Startup spike in first 3 seconds
        if (cycleSec < 3) {
          simulatedVal = 1.7 + ((float)(random(0, 20)) / 100.0);
        } else {
          // Regular draw with minor background fluctuations
          simulatedVal = 1.1 + ((float)(random(0, 10)) / 100.0);
        }
      } else {
        // Standby/Off mode (near zero draw)
        simulatedVal = 0.03 + ((float)(random(0, 3)) / 100.0);
      }
      break;
    }
    case 1: { // S2 — Geyser (Cyclic High-Power Load)
      // Must be controlled by Relay 2 (Geyser switch)
      if (relayStates[1]) {
        // Standard resistive geyser consumption (3.8A RMS)
        simulatedVal = 3.8 + ((float)(random(0, 6)) / 100.0);
      } else {
        simulatedVal = 0.0;
      }
      break;
    }
    case 2: { // S3 — Borehole Pump (Scheduled Inductive Load)
      // Must be controlled by Relay 3 (Borehole switch)
      if (relayStates[2]) {
        // Inductive start spike
        static unsigned long startMs = 0;
        static bool wasOff = true;
        if (wasOff) {
          startMs = now;
          wasOff = false;
        }
        if (now - startMs < 2000) {
          simulatedVal = 4.8 + ((float)(random(0, 30)) / 100.0); // Big start surge
        } else {
          simulatedVal = 2.1 + ((float)(random(0, 15)) / 100.0); // Running load
        }
      } else {
        simulatedVal = 0.0;
      }
      break;
    }
    case 3: { // S4 — Entertainment (Variable Household Electronics)
      // Must be controlled by Relay 6 (Entertainment switch)
      if (relayStates[5]) {
        // Fluctuates slightly over time (TV scenes, volume changes, console loads)
        float wave = sin((float)now / 10000.0) * 0.2;
        simulatedVal = 0.6 + wave + ((float)(random(0, 5)) / 100.0);
      } else {
        simulatedVal = 0.0;
      }
      break;
    }
    case 4: { // S5 — Lighting (Steady load)
      // Must be controlled by Relay 5 (Lighting switch)
      if (relayStates[4]) {
        // High efficiency LED load (very stable)
        simulatedVal = 0.35 + ((float)(random(0, 3)) / 100.0);
      } else {
        simulatedVal = 0.0;
      }
      break;
    }
  }

  // Ensure values don't fall negative
  if (simulatedVal < 0.0) simulatedVal = 0.0;

  sensorValues[currentSensorIndex] = simulatedVal;
#endif

  // Advance to next sensor round-robin
  currentSensorIndex = (currentSensorIndex + 1) % 5;
}

// ========================== RELAY CONTROL ====================================

void setRelay(int index, bool state) {
  if (index < 0 || index >= 8) return;

  relayStates[index] = state;

  if (RELAY_ACTIVE_LOW) {
    // Active-LOW: LOW = ON, HIGH = OFF
    digitalWrite(RELAY_PINS[index], state ? LOW : HIGH);
  } else {
    // Active-HIGH: HIGH = ON, LOW = OFF
    digitalWrite(RELAY_PINS[index], state ? HIGH : LOW);
  }

  Serial.print("[Relay] R");
  Serial.print(index + 1);
  Serial.print(" (GPIO ");
  Serial.print(RELAY_PINS[index]);
  Serial.print(") -> ");
  Serial.println(state ? "ON" : "OFF");
}

// ========================== BROADCAST ========================================

void broadcastData() {
  if (ws.count() == 0) return;  // No clients connected

  // Build JSON: { "sensors": [v1,v2,v3,v4,v5], "relays": [r1..r8] }
  JsonDocument doc;

  JsonArray sensors = doc["sensors"].to<JsonArray>();
  for (int i = 0; i < 5; i++) {
    // Round to 2 decimal places
    sensors.add(serialized(String(sensorValues[i], 2)));
  }

  JsonArray relays = doc["relays"].to<JsonArray>();
  for (int i = 0; i < 8; i++) {
    relays.add(relayStates[i]);
  }

  String json;
  serializeJson(doc, json);
  ws.textAll(json);
}

// ========================== SERIAL DEBUG =====================================

void printStatus() {
  Serial.print("[ZEC-5] Sensors: ");
  for (int i = 0; i < 5; i++) {
    Serial.print("S");
    Serial.print(i + 1);
    Serial.print("=");
    Serial.print(sensorValues[i], 2);
    Serial.print("A");
    if (i < 4) Serial.print(" | ");
  }
  Serial.print("  Relays: ");
  for (int i = 0; i < 8; i++) {
    Serial.print(relayStates[i] ? "1" : "0");
  }
  Serial.print("  Clients: ");
  Serial.println(ws.count());
}
