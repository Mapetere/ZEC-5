# ZEC-5 — Zimbabwean Energy Controller (5-Channel)

## Project Summary for AI Handoff

> **Author:** Engineer Nyasha Praise Mapetere
> **Project Type:** School research project — IoT smart energy management system
> **Status:** Functional prototype with mock data; hardware integration pending
> **Location:** `c:\Development\ZEC-5`

---

## What This Project Is

ZEC-5 is a **smart home energy management system** built for the **Zimbabwean electricity context** (ZESA prepaid tokens). It combines:

1. **Hardware layer:** An ESP32 microcontroller reading 5 current sensors (CT clamps via audio jacks) that measure amperage on 5 household circuits (e.g., Fridge, Geyser, Borehole, Entertainment, Lighting).
2. **Software layer:** A React web dashboard that visualizes real-time energy consumption, tracks prepaid electricity token depletion, and provides intelligent load-shedding recommendations to help users make their purchased kWh last a target number of days.

The core problem it solves: **Zimbabwean households buy prepaid electricity (ZESA tokens) in kWh units and have no visibility into how fast they're consuming them.** ZEC-5 monitors per-appliance current draw in real time, projects when the tokens will run out, and recommends which appliances to shed to meet a user-defined duration goal.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19.1 (JSX, no TypeScript) |
| **Build Tool** | Vite 6.3 |
| **Charting** | ApexCharts + react-apexcharts |
| **Styling** | Vanilla CSS (single `index.css`, ~40KB, dark theme with glassmorphism aesthetic) |
| **Fonts** | Inter (Google Fonts, weights 300/400/500) |
| **State** | React `useState` + `useCallback` + `useRef` (no external state library) |
| **Persistence** | `localStorage` for auth, setup data, appliance profiles, daily averages |
| **Hardware Comms** | WebSocket to ESP32 at `ws://192.168.4.1/ws` (currently unused; mock data active) |
| **Firmware** | Arduino/ESP32 C++ using EmonLib for RMS current calculation on GPIO 34 |

---

## File Structure

```
ZEC-5/
├── ESP32_code                    # Arduino firmware (EmonLib, 30A/1V CT clamp on GPIO 34)
├── index.html                    # Vite entry point
├── package.json                  # "zec-5" v1.0.0
├── vite.config.js                # Dev server on port 5173
├── src/
│   ├── main.jsx                  # React root mount
│   ├── App.jsx                   # Root component — auth gate, routing, all state
│   ├── index.css                 # Full design system (~40KB, dark theme)
│   ├── components/
│   │   ├── LoginPage.jsx         # Email + 6-digit OTP auth (simulated)
│   │   ├── SetupWizard.jsx       # 4-step onboarding (sensors, token, goal, threshold)
│   │   ├── Sidebar.jsx           # Fixed left nav (Dashboard, Management, Logout)
│   │   ├── Header.jsx            # Top bar with title + connection status
│   │   ├── Dashboard.jsx         # Main view: runway, calibration, gauges, charts, alerts
│   │   ├── Management.jsx        # Appliance profiling, threshold config, setup reset
│   │   ├── SmartAdvice.jsx       # Slide-out recommendation panel with relay controls
│   │   ├── EmergencyMode.jsx     # Critical token level — power budgeting + shedding strategies
│   │   ├── RelayControl.jsx      # 8-channel relay toggle grid (currently not routed to a page)
│   │   └── HardwareModal.jsx     # Null-sensor fault alert with tech support contact
│   └── services/
│       ├── mockData.js           # Synthetic sensor stream, daily averages DB, alert generation
│       └── websocket.js          # WebSocket client for ESP32 (not currently connected)
```

---

## Application Flow

### 1. Authentication (`LoginPage.jsx`)
- Email → simulated OTP (6-digit code printed to console)
- Auth stored in `localStorage` as `zec5_auth`
- No real backend; purely client-side simulation

### 2. First-Run Setup (`SetupWizard.jsx`)
A 4-step wizard that configures the system:

| Step | What it collects |
|---|---|
| **1. Sensors** | User names 5 sensor channels (default: Fridge, Geyser, Borehole, Entertainment, Lighting) |
| **2. Token** | ZESA token purchase: kWh purchased, amount paid (ZWL/USD), purchase date |
| **3. Goal** | Duration goal — either X days or a specific target date. Default: 21 days |
| **4. Alerts** | Notification threshold — kWh level below which recommendations activate. Default: 50 kWh |

Setup data persisted to `localStorage` as `zec5_setup`. Includes `calibrationStart` timestamp.

### 3. Main Dashboard (`Dashboard.jsx`)
Two pages accessible via sidebar:

#### Dashboard Page
- **Energy Runway card:** Days remaining, kWh remaining, daily usage, goal, on-track/off-track status
- **System Status card:** Learning phase progress (7-day calibration), notification threshold, hardware integrity dots, Smart Advice button
- **Daily Averages table:** Historical per-sensor averages (localStorage DB)
- **Live Sensor Feeds:** 5 gauge cards showing real-time amperage per channel
- **Energy Fingerprints:** ApexCharts area chart with smoothed history for all 5 sensors
- **Inference Engine:** Alert cards (info/warning/danger) from the recommendation system

#### Management Page
- Edit appliance profiles (name, load type, max expected load)
- Update notification threshold
- Re-run setup wizard

---

## Core Business Logic

### 2-Phase Recommendation Engine

This is the most important architectural concept:

#### Phase 1 — Learning (Days 0-7)
- System collects "behavioral signatures" — baseline current readings per appliance
- **No recommendations are generated.** Dashboard shows "Learning Phase Active" info alert
- Smart Advice button is locked with a countdown
- A "Fast Forward" button injects 7 synthetic days of history for demo/testing purposes

#### Phase 2 — Active Monitoring (Day 7+)
Recommendations only fire when **BOTH** conditions are true:
- **Condition A:** Remaining kWh is below the user-configured `notifyThreshold`
- **Condition B:** Projected depletion date is before the target end date (the token will run out early)

When both conditions are met, the system compares each sensor's current draw against its baseline. Sensors drawing >110% of baseline get flagged with a "Depletion Trend Risk" warning that includes:
- Current wattage vs baseline wattage
- Estimated hours of runway that could be recovered by shedding this load
- An actionable "Accept Advice | Shed Load" button that toggles the corresponding relay

### Token Depletion Calculation
```
totalAmps = sum of all 5 sensor readings
avgPowerKw = (totalAmps × 230V) / 1000
dailyUsageKwh = avgPowerKw × 8  (assumes 8-hour active usage per day)
kwhRemaining = tokenData.kwh - (dailyUsageKwh × daysSincePurchase)
daysRemaining = kwhRemaining / dailyUsageKwh
```
- Mains voltage is hardcoded at **230V** (Zimbabwe standard)
- The `× 8` factor assumes 8 hours of significant draw per day

### Emergency Mode (`EmergencyMode.jsx`)
Triggered when `kwhRemaining <= 5 kWh`. The user enters a "personal request" (e.g., "I need this to last 48 hours"), and the system calculates:

- **Hourly power budget** = (remaining kWh × 1000) / requested hours
- **Strategy A — Sacrificial:** Permanently cut highest-draw relays until total consumption fits budget
- **Strategy B — Alternating:** Time-share power between appliance groups in rotating slots (e.g., 20-minute cycles)

### Vacancy Detection
If all daily averages for the last 3 days have near-zero total current (<0.1A), the house is flagged as "Vacant" and the duration goal is automatically marked "Achievable" (no alerts fire).

### 0-Day Fix
If less than 60 minutes of data have been collected, the dashboard defaults to showing the full goal duration as "days remaining" rather than computing a potentially wild projection from insufficient data.

---

## Data Flow

```
Mock Data Generator (mockData.js)
    │
    │  Every 1.5 seconds, generates 5 smoothed sensor values
    │  (moving average window = 8 samples, max history = 60 points)
    │
    ▼
App.jsx (root state)
    │
    │  setSensors([...])       — current readings
    │  setHistory([[...], ...]) — time-series per sensor
    │  setTickCount(n)         — sample counter
    │
    │  Every ~40 ticks: storeDailyAverage() → localStorage
    │  Every tick: generateAlerts() → based on Phase 1/2 logic
    │
    ▼
Dashboard.jsx — renders gauges, charts, runway, alerts
SmartAdvice.jsx — side panel with actionable recommendations
EmergencyMode.jsx — modal with load shedding strategies
```

### Mock Data Profiles (defaults)
| Sensor | Base Current (A) | Variance |
|---|---|---|
| Fridge | 1.2 | 0.08 |
| Geyser | 3.8 | 0.15 |
| Borehole | 2.1 | 0.10 |
| Entertainment | 0.6 | 0.05 |
| Lighting | 0.4 | 0.03 |

Each value includes sinusoidal drift + random noise, then smoothed via moving average.

---

## State Management (App.jsx)

All state lives in `App.jsx` and is passed down via props. Key state variables:

| State | Type | Purpose |
|---|---|---|
| `user` | `string \| null` | Authenticated email |
| `setupComplete` | `boolean` | Whether setup wizard has been completed |
| `setupData` | `object` | Token data, duration goal, sensor names, calibration start |
| `page` | `'dashboard' \| 'management'` | Current page |
| `sensors` | `number[5]` | Current amperage readings |
| `history` | `number[5][]` | Time-series per sensor (last 60 samples) |
| `relays` | `boolean[8]` | Relay on/off states |
| `alerts` | `Alert[]` | Generated recommendations |
| `connected` | `boolean` | WebSocket/mock connection status |
| `showAdvice` | `boolean` | SmartAdvice panel visibility |
| `showEmergency` | `boolean` | EmergencyMode modal visibility |
| `hwFault` | `{index, name} \| null` | Active hardware fault |
| `tickCount` | `number` | Sample counter |
| `dailyAverages` | `DayEntry[]` | Historical daily averages from localStorage |
| `vacant` | `boolean` | House vacancy flag |
| `profiles` | `Profile[5]` | Appliance profiles (name, base, variance, type, maxLoad) |

---

## localStorage Keys

| Key | Content |
|---|---|
| `zec5_auth` | `{ email, ts }` |
| `zec5_setup` | Setup wizard output (tokenData, durationGoal, sensorNames, calibrationStart, notifyThreshold) |
| `zec5_profiles` | Array of 5 appliance profiles |
| `zec5_daily_averages` | Array of `{ date, sensors[5], count }` entries (last 90 days) |

---

## Hardware Layer (ESP32)

The ESP32 firmware (`ESP32_code`) is minimal:
- Uses **EmonLib** for RMS current calculation
- Reads a **30A/1V split-core CT clamp** on **GPIO 34** (ADC, 12-bit)
- Samples 1480 points per reading (captures full 50Hz AC wave)
- Filters noise below 0.1A
- Outputs current readings via Serial at 115200 baud every 1 second
- **Note:** The firmware currently only handles 1 sensor. The WebSocket server and multi-sensor support are not yet implemented in firmware.

---

## WebSocket Protocol (Planned)

The `websocket.js` service is fully built but not connected:
- Connects to `ws://192.168.4.1/ws` (ESP32 default AP address)
- **Receives:** `{ sensors: [v1,v2,v3,v4,v5], relays: [b1..b8] }`
- **Sends:** `{ relay: index(0-7), state: true/false }` to toggle relays
- Auto-reconnects with exponential backoff (3s → 30s max)

---

## Design System

- **Theme:** Dark mode (near-black backgrounds `#0a0e12`, dark card surfaces `#111920`)
- **Accent Colors:** Green (`#25D366` — WhatsApp green), Blue (`#0ea5e9`), Amber (`#FFB300`), Red (`#FF6B6B`)
- **Font:** Inter (300/400/500)
- **Visual Style:** Glassmorphism cards, subtle borders, smooth gradients, fade-in/slide-in animations
- **Layout:** Sidebar + main content area with scrollable page container

---

## Key Design Decisions

1. **Relays are "stealthy"** — They are NOT exposed as a standalone page. The only way to toggle a relay is through SmartAdvice ("Accept Advice | Shed Load") or EmergencyMode. This prevents users from accidentally cutting power to critical appliances.
2. **2-phase gate** prevents premature/noisy recommendations during the learning period.
3. **Dual-condition triggering** (threshold AND trend) prevents alert fatigue — the system stays silent unless the user is actually at risk of running out early.
4. **Vacancy detection** suppresses false alarms when the house is empty.
5. **0-day fix** prevents wild projections from insufficient data in the first hour.
6. **Fast-forward button** exists purely for demo/testing — injects 7 days of synthetic history and backdates `calibrationStart` by 8 days to immediately unlock Phase 2.

---

## What's Not Yet Implemented

- **Real ESP32 WebSocket integration** — firmware only reads 1 sensor and doesn't serve a WebSocket
- **Multi-sensor firmware** — needs 5 CT clamp inputs (currently only 1 on GPIO 34)
- **Relay hardware** — 8-channel relay module control from ESP32
- **Real authentication** — currently simulated with console-logged OTP
- **Backend/API** — everything is client-side with localStorage
- **Mobile responsiveness** — CSS exists but not fully tested on mobile
- **RelayControl component** — built but not routed to any page (by design — relays are stealthy)
