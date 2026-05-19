# CHAPTER 4: DESIGN AND IMPLEMENTATION

## 4.0 Introduction
This chapter presents the full software design and modular implementation of the **ZET-5 Software-in-the-Loop (SIL) Predictive Energy Controller**. Built entirely as a self-contained, offline software prototype, the ZET-5 architecture translates raw metrology data into actionable, self-learning consumption models served through an interactive, premium glassmorphic dashboard. 

The software utilizes a modular C++/JavaScript design that isolates simulated sensing inputs from the core algorithmic layers, making the codebase highly extensible and ready for direct transition to physical edge microcontroller hardware.

---

## 4.1 System Architectural Design: The Modular SIL Model
The ZET-5 software is designed around a **four-layer decoupled architecture** where processing flows sequentially from simulated circuit loops up to the presentation dashboard. This structure prevents coupling between metrology calculations and decision-making logic, ensuring independent testability and high computational performance.

```
+-------------------------------------------------------------+
|               LAYER 4: GLASSMORPHIC DASHBOARD               |
|      (React / CSS - App.jsx, Dashboard.jsx, SetupWizard.jsx)  |
| Displays real-time gauges, logs, and Clock Simulator widget |
+-------------------------------------------------------------+
                            ^  |
                 JSON State |  | User Inputs (Tokens, Sheds, Jumps)
                            |  v
+-------------------------------------------------------------+
|              LAYER 3: INFERENCE & TRIAGE ENGINE             |
|                  (App.jsx / energyEngine.js)                |
| Evaluates budget, triggers amber/red alarms, executes sheds |
+-------------------------------------------------------------+
                            ^  |
                Watts / Tiers  |  | Relay Commands
                            |  v
+-------------------------------------------------------------+
|                LAYER 2: PREDICTIVE CORE (EMA)               |
|                    (predictionEngine.js)                    |
| Houses Virtual Time offset, RHS bins, and forecasting loop  |
+-------------------------------------------------------------+
                            ^  |
                 Watts Ticks |  | Clocks / Calibration Factors
                            |  v
+-------------------------------------------------------------+
|                LAYER 1: SIMULATED METROLOGY                 |
|             (energyEngine.js / mockData.js)                 |
| Synthesizes 5 circuit current loops with PF correction      |
+-------------------------------------------------------------+
```

1. **Layer 1: Simulated Metrology Layer (`mockData.js`, `energyEngine.js`):** Models the raw electric current waveforms (amperes) for five disaggregated circuit loops. Real-time consumption is derived by applying loop-specific Power Factors, simulating standard domestic electrical behavior.
2. **Layer 2: Predictive Core & Machine Learning Layer (`predictionEngine.js`):** Manages the virtual system clock offset, accumulates hourly real-power usage into the 24-bin Rolling Hourly Signature (RHS) matrix, and runs iterative numerical integrations to forecast token depletion.
3. **Layer 3: Inference & Triage Layer (`energyEngine.js`, `App.jsx`):** Continuously monitors the remaining kWh token balance. When a budget violation is imminent or remains below the critical threshold, the engine evaluates active load tiers and coordinates graduated demand-side load-shedding commands.
4. **Layer 4: Glassmorphic Presentation Dashboard (`App.jsx`, `Dashboard.jsx`):** Serves as the user interface, rendering bento-grid metric cards, ApexCharts time-series diagrams, real-time gauges, and the interactive **Predictive Clock Simulator** panel.

---

## 4.2 Detailed Module Decomposition & File Architecture

### 4.2.1 `predictionEngine.js` — The Predictive Core
This module handles all time virtualization, machine learning, and numerical forecasting calculations. It exposes three core API helpers:

*   **`getVirtualTime()`:** Rather than calling standard system time (`Date.now()`), the system overlays a persistent offset:
    $$\text{Virtual Time} = \text{Date.now()} + \text{timeOffsetMs}$$
    This offset is saved in `localStorage` under `zet5_virtual_time_offset`. This guarantees that if the user refreshes their browser, the simulated system clock remains in its advanced time phase.
*   **`advanceVirtualTime(hours)`:** Manually increments `timeOffsetMs` by a specified number of hours. This shifts the virtual clock, triggering immediate updates across the metrology engines.
*   **`simulateIntervalProgress(hours, averagePowerW)`:** Simulates a long-term time jump step-by-step. It advances the clock hour-by-hour. For each simulated hour ($h$), it blends the active loop wattage ($C_{\text{obs}}$) into the corresponding 24-bin RHS signature array ($S$) using our Exponential Moving Average (EMA) algorithm:
    $$S_t(h) = (1 - \alpha) \cdot S_{t-1}(h) + \alpha \cdot C_{\text{obs}}(h)$$
    where $\alpha = 0.20$ is the signature learning rate. This instantly trains the behavioral profile and increments the **Behavioral Calibration Index** from $0\%$ to $100\%$ on screen.

### 4.2.2 `energyEngine.js` — Metrology & Calibration
This module governs real-power calculations, power factor scaling, token depletion, and closed-loop feedback calibration. It maintains:

*   **Disaggregated Real-Power Derivation:**
    $$P_c = V_{\text{mains}} \cdot I_{\text{RMS}, c} \cdot PF_c$$
*   **Token Depletion Integration:** Every 2 seconds, it deducts the real power consumed from the remaining prepaid balance:
    $$E_{\text{remaining}} = E_{\text{remaining}} - \left( \frac{\kappa \cdot P_{\text{total}} \cdot 2 \text{ seconds}}{3600 \text{ seconds/hour} \cdot 1000 \text{ W/kW}} \right)$$
*   **Meter Sync Correction Factor ($\kappa$):** Adjusts the metrology scaling coefficient dynamically when the user inputs their physical prepaid balance. It computes the discrepancy ratio between the software integration and the physical meter:
    $$\kappa_{\text{inst}} = \frac{\Delta E_{\text{physical}}}{\Delta E_{\text{engine}}}$$
    Updating the active multiplier using a low-pass filter:
    $$\kappa_{n} = (1 - \beta) \cdot \kappa_{n-1} + \beta \cdot \kappa_{\text{inst}}$$

### 4.2.3 `App.jsx` — State Orchestrator & Inference Engine
`App.jsx` serves as the central state orchestrator, managing React state hook updates and coordinating the inference logic:

*   **Inference Alarm State:** Checks the projected depletion date ($t_{\text{depletion}}$) against the user's budget target ($t_{\text{target}}$). 
    *   If $t_{\text{depletion}} > t_{\text{target}}$, the status is set to **`On Track`** (Green).
    *   If $t_{\text{depletion}} \le t_{\text{target}}$, the status triggers **`At Risk`** (Amber) or **`Critical`** (Red) alarms.
*   **Triage Commands:** Dispatches active shed commands to the dashboard. It checks for active loads on the Geyser (Tier 3) or Borehole Pump (Tier 3) first. If shedding them is insufficient to restore the budget target, it recommends shedding Comfort loads (Tier 2).
*   **Hardware Decoupling:** Replaced the raw ESP32 WebSocket socket callbacks with synchronous virtual handlers, ensuring deterministic execution of the simulation model.

### 4.2.4 `Dashboard.jsx` & `SetupWizard.jsx` — Presentation Layers
*   **Dashboard Bento-Grid:** Houses high-signal visualization modules including:
    *   **The Predictive Clock Simulator Widget:** Features a real-time virtual clock display and two interactive buttons: **`[ +1 Hour Jump ]`** and **`[ Fast-Forward 24h ]`**. This allows panel examiners to fast-forward time live to witness machine learning calibration and token depletion.
    *   **Monitored Circuit Loops Panel (Row 4):** Displays five green loop badges (**`Loop 1`** to **`Loop 5`**) showing disaggregated currents, replacing noisy sensor fault indicators.
*   **SetupWizard Onboarding:** Provides a clean first-run configuration interface, guiding users to name their five circuit rings (C1-C5), enter their starting token kWh, and select their target budget runway.

---

## 4.3 Input, Output, and Security Design

*   **Input Range Validations:** All inputs entered via the configuration panel are strictly parsed in `SetupWizard.jsx` and `App.jsx`. Token sizes are capped between $1$ and $999\text{ kWh}$, and critical thresholds are bounded between $5\%$ and $50\%$.
*   **The Hardcoded Tier 1 Software Lock:** To prevent accidental blackouts of essential equipment, the triage logic in `App.jsx` contains a hardcoded, non-overridable block:
    ```javascript
    // Hardcoded Tier 1 Safety Lock
    if (tierAssign[ch] === 1) {
      continue; // Never evaluate or dispatch relay open commands to Tier 1
    }
    ```
    This guarantees that the Refrigerator (C1) and lights/router remain powered under all simulated budget depletion runs, ensuring system reliability.

---

## 4.4 Chapter Summary
This chapter detailed the software architecture and modular implementation files of the ZET-5 prototype. We explained how the decoupled four-layer architecture separates simulated metrology inputs from the core algorithmic layers. The APIs of `predictionEngine.js` (time machine virtualization, online learning EMA) and `energyEngine.js` (power factor scaling, closed-loop drift calibration) were detailed. 

Finally, we presented the glassmorphic presentation dashboard and onboarding wizard, highlighting the **Predictive Clock Simulator** and the **Tier 1 Safety Lock**. The next chapter presents the experimental testing, evaluation results, and analysis of the ZET-5 system.
