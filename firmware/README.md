# ZEC-5 Firmware — Setup Guide

## Required Hardware

| Component | Qty | Notes |
|---|---|---|
| ESP32 DevKit V1 | 1 | Any ESP32 with enough GPIOs |
| SCT-013-030 CT Clamp (30A/1V) | 5 | Split-core, connects via 3.5mm audio jack |
| 3.5mm Audio Jack Breakout | 5 | Solder Tip → sensor pin, Sleeve → GND |
| 8-Channel Relay Module (5V, active-LOW) | 1 | Must support 3.3V logic trigger OR use level shifter |
| Jumper wires | ~20 | Male-to-female for relay module connections |
| 5V Power Supply | 1 | To power the relay module (ESP32 can't source enough current) |

---

## Wiring Diagram

### CT Clamp Sensors → ESP32 ADC1 Pins

Each CT clamp outputs an analog voltage proportional to current.
Connect the **Tip** (signal) pin of each audio jack to the ESP32 ADC pin, and **Sleeve** (ground) to GND.

> **IMPORTANT:** Only use ADC1 pins (GPIOs 32-39). ADC2 pins DO NOT work when WiFi is active on ESP32.

```
Audio Jack Pinout:
  Tip    = Signal → ESP32 ADC pin
  Ring   = Not connected (leave floating)
  Sleeve = Ground → ESP32 GND
```

| Sensor | Default Name | GPIO Pin | ESP32 Label |
|---|---|---|---|
| S1 | Fridge | GPIO 36 | VP |
| S2 | Geyser | GPIO 39 | VN |
| S3 | Borehole | GPIO 34 | D34 |
| S4 | Entertainment | GPIO 35 | D35 |
| S5 | Lighting | GPIO 32 | D32 |

### 8-Channel Relay Module → ESP32 Output Pins

| Relay | Default Name | GPIO Pin | Notes |
|---|---|---|---|
| R1 | Main Supply | GPIO 4 | Safe output pin |
| R2 | Geyser | GPIO 16 | Safe output pin |
| R3 | Borehole | GPIO 17 | Safe output pin |
| R4 | Kitchen | GPIO 18 | Safe output pin |
| R5 | Lighting | GPIO 19 | Safe output pin |
| R6 | Entertainment | GPIO 21 | Safe output pin |
| R7 | Garage | GPIO 22 | Safe output pin |
| R8 | Auxiliary | GPIO 23 | Safe output pin |

```
Relay Module Wiring:
  IN1 → GPIO 4     (Relay 1)
  IN2 → GPIO 16    (Relay 2)
  ...
  IN8 → GPIO 23    (Relay 8)
  GND → ESP32 GND  (shared ground)
  VCC → 5V supply  (external, NOT from ESP32 3.3V)
```

> **Note:** If your relay module doesn't trigger reliably on 3.3V logic, add a logic level shifter (3.3V → 5V) between the ESP32 output pins and the relay inputs.

---

## Required Arduino Libraries

Install these via **Arduino IDE → Sketch → Include Library → Manage Libraries**:

1. **EmonLib** by OpenEnergyMonitor
   - Search: `EmonLib`
   - Used for RMS current calculation from CT clamp signals

2. **ESPAsyncWebServer** by lacamera (or me-no-dev)
   - Search: `ESPAsyncWebServer`
   - **If not found in Library Manager**, install manually:
     - Download from: https://github.com/lacamera/ESPAsyncWebServer
     - Or: https://github.com/me-no-dev/ESPAsyncWebServer
     - Extract into `Documents/Arduino/libraries/`

3. **AsyncTCP** by dvarrel (or me-no-dev)
   - Search: `AsyncTCP`
   - Required dependency for ESPAsyncWebServer on ESP32
   - **If not found**, install manually:
     - Download from: https://github.com/dvarrel/AsyncTCP
     - Or: https://github.com/me-no-dev/AsyncTCP

4. **ArduinoJson** by Benoit Blanchon (v7+)
   - Search: `ArduinoJson`
   - Used for JSON serialization/deserialization

---

## Arduino IDE Setup

1. **Install ESP32 Board Support:**
   - Go to **File → Preferences**
   - In "Additional Board Manager URLs", add:
     ```
     https://espressif.github.io/arduino-esp32/package_esp32_index.json
     ```
   - Go to **Tools → Board → Board Manager**
   - Search `esp32` and install **esp32 by Espressif Systems**

2. **Select Board:**
   - **Tools → Board → ESP32 Arduino → ESP32 Dev Module**

3. **Settings:**
   - Upload Speed: `921600`
   - Flash Frequency: `80MHz`
   - Flash Size: `4MB`
   - Partition Scheme: `Default 4MB with spiffs`

4. **Connect ESP32 via USB and select the correct COM port**

5. **Upload** the `ZEC5_Controller.ino` sketch

---

## Testing

### Serial Monitor
1. Open **Tools → Serial Monitor** at `115200` baud
2. You should see:
   ```
   ================================================
     ZEC-5 | Zimbabwean Energy Controller
     5-Channel Current Monitor + 8-Channel Relay
   ================================================

   [Sensors] Initializing 5 CT clamp channels...
     S1 -> GPIO 36 (cal: 30.00)
     S2 -> GPIO 39 (cal: 30.00)
     ...
   [WiFi] AP IP Address: 192.168.4.1
   [WiFi] WebSocket URL: ws://192.168.4.1/ws
   [WebSocket] Server started.
   [ZEC-5] System ready. Waiting for connections...
   ```
3. Every 1.5 seconds you'll see sensor readings like:
   ```
   [ZEC-5] Sensors: S1=1.23A | S2=3.81A | S3=0.00A | S4=0.62A | S5=0.41A  Relays: 00000000  Clients: 0
   ```

### Connect the Dashboard
1. On your phone/laptop, connect to WiFi network **`ZEC-5`** (password: `zec5admin`)
2. Open the ZEC-5 React dashboard
3. The dashboard's `websocket.js` will auto-connect to `ws://192.168.4.1/ws`
4. Real sensor data will replace the mock data stream

---

## Calibration

The CT clamp calibration value (`30.0`) assumes a **30A/1V** sensor ratio. If your readings are inaccurate:

1. Connect a known load (e.g., a 100W bulb ≈ 0.43A at 230V)
2. Check the Serial Monitor reading
3. Adjust the calibration value:
   ```
   New Calibration = Old Calibration × (Actual Amps / Displayed Amps)
   ```
4. Update `SENSOR_CALIBRATION[]` in the firmware and re-upload

---

## WiFi Configuration

By default, the ESP32 creates its own WiFi network:
- **SSID:** `ZEC-5`
- **Password:** `zec5admin`
- **IP Address:** `192.168.4.1`

To change these, edit the top of `ZEC5_Controller.ino`:
```cpp
const char* AP_SSID     = "ZEC-5";
const char* AP_PASSWORD = "zec5admin";
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| All sensors read 0.00A | CT clamps not clamped on wire, or wrong GPIO | Check wiring, ensure clamp is around a SINGLE conductor |
| Readings are noisy/jumping | No load, or clamp around both live+neutral | Clamp around the LIVE wire only, not both |
| WiFi network doesn't appear | Power issue or code not uploaded | Check Serial Monitor for boot errors |
| Dashboard doesn't connect | Wrong WiFi network, or firewall | Connect phone/laptop to `ZEC-5` WiFi first |
| Relays don't toggle | Wrong GPIO, or 3.3V not triggering 5V relay | Add level shifter, or use relay module with 3.3V logic support |
| `ADC2` error or erratic ADC | Using ADC2 pins with WiFi | Only use GPIO 32-39 (ADC1) for sensors |
