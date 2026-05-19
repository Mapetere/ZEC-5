# CHAPTER 3: RESEARCH METHODOLOGY

## 3.0 Introduction
This chapter details the research methodology, operational frameworks, and mathematical models used to develop and validate the **ZET-5 Software-in-the-Loop (SIL) Predictive Energy Controller**. To address the complex multi-disciplinary nature of this project—spanning electrical engineering, embedded software development, and online machine learning—we adopt a structured **Design Science Research (DSR)** framework. 

This chapter is organized as follows: Section 3.1 details the DSR framework. Section 3.2 justifies the Software-in-the-Loop (SIL) research design. Section 3.3 presents the complete mathematical modeling of the ZET-5 metrology, calibration, learning, and forecasting modules. Section 3.4 details the data generation and collection methods. Section 3.5 outlines the development tools, and Section 3.6 presents the validation and testing methodology.

---

## 3.1 Design Science Research (DSR) Framework
Design Science Research (DSR) is an established socio-technical methodology for computer science and engineering disciplines. Unlike traditional empirical science which aims to *explain* or *describe* natural phenomena, DSR focus on *constructing* and *validating* novel technological artifacts to solve identified, practical problems (Hevner et al., 2004). 

The development of the ZET-5 prototype follows Hevner's six-stage DSR lifecycle:

```
+--------------------------------------------------------------------------+
| 1. PROBLEM IDENTIFICATION: Prepaid token uncertainty; passive DB s.      |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| 2. DEFINE OBJECTIVES: 1% drift, 90% confidence, graduated load triage.    |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| 3. DESIGN & DEVELOPMENT: C++/JS architecture; RHS algorithms; Dashboard.  |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| 4. DEMONSTRATION: Running simulated weeks via Time Machine Sandbox.       |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| 5. EVALUATION: Testing H1-H4; calibration accuracy, latency logs.       |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| 6. COMMUNICATION: Academic defense; publication of SIL metrology model.  |
+--------------------------------------------------------------------------+
```

1. **Problem Identification:** Traced in Chapters 1 and 2—prepaid energy budgets suffer from passive cutoff and linear forecasting failures.
2. **Define Objectives:** Establish quantitative engineering targets—cumulative drift under 1.0%, online calibration confidence over 90%, and deterministic triage execution.
3. **Design and Development:** Architecting the core C++ metrology components (`predictionEngine.js`, `energyEngine.js`), the self-correcting calibration loop, and the glassmorphic interactive web dashboard.
4. **Demonstration:** Implementing the virtual time-machine sandbox to simulate weeks of consumption and learning within seconds.
5. **Evaluation:** Conducting rigorous controlled experiments to test the four research hypotheses ($H_1$-$H_4$), recording calibration coefficients, forecasting errors, and relay response times.
6. **Communication:** Compiling the findings into this dissertation and presenting the validated model to the Chinhoyi University of Technology engineering panel.

---

## 3.2 Software-in-the-Loop (SIL) Research Design
In industrial systems engineering, physical hardware-only validation presents major developmental bottlenecks. Physical Current Transformer (CT) sensors clamp around AC lines and route tiny analog voltages to an ADC. To validate a physical self-learning machine model over multiple days or weeks requires continuous physical load changes, which is highly impractical, expensive, and unsafe in a standard academic laboratory.

To overcome this, this study implements a **High-Fidelity Software-in-the-Loop (SIL) Research Design**. 

```
+---------------------------------------------------------+
|                  VIRTUAL TIME MACHINE                   |
|  Controls simulated system clock offset (timeOffsetMs)  |
+---------------------------------------------------------+
                            |
                            v
+---------------------------------------------------------+
|             HIGH-FIDELITY LOAD GENERATOR                |
|  Synthesizes disaggregated current (Amps) & PF per loop |
+---------------------------------------------------------+
                            |
                            v
+---------------------------------------------------------+
|                  CORE ALGORITHMIC LAYER                 |
|   1. Metrology Correction      2. Online Learning (EMA) |
|   3. Drift Synchronization     4. Iterative Forecast    |
+---------------------------------------------------------+
                            |
                            v
+---------------------------------------------------------+
|               GLASSMORPHIC PRESENTATION                 |
|     Visualizes forecasting runways & logs triage events  |
+---------------------------------------------------------+
```

In this architecture, the physical current sensors are replaced by **high-fidelity synthetic metrology drivers**. These drivers generate raw, disaggregated electrical current profiles (amperes) and power factors for five distinct circuit loops ( Fridge, Geyser, Borehole Pump, Entertainment, and Lights) modeling real Zimbabwean household load data. 

The core algorithms—the Metrology Engine, the Meter Sync Calibration loop, the Rolling Hourly Signature (RHS) model, and the Triage controller—run on top of these high-fidelity inputs. By virtualizing the clock offset, we can fast-forward the system time by hours or days in milliseconds. The algorithms process these steps exactly as they would in real-time, executing exponential moving average updates and token integration. 

This SIL framework provides three major scientific advantages:
*   **100% Determinism:** Eliminates analog ADC noise, grid frequency fluctuations, and thermal drift, allowing for mathematically precise verification of the core learning and forecasting algorithms.
*   **Time-Travel Simulation:** Allows for the compression of a 7-day domestic load profiling study into a 2-second simulation run, enabling comprehensive algorithm validation.
*   **Galvanic Safety:** Eliminates physical exposure to high-voltage $230\text{V}$ AC mains in the early stages of prototype validation.

---

## 3.3 System Mathematical Modeling

### 3.3.1 The Metrology and Power Factor Correction Engine
To reflect true utility billing, ZET-5 calculates the **Real Power ($P$)** of each of the five monitored circuits. For any given circuit loop ($c$), the instantaneous real power ($P_c$) is derived from the simulated current ($I_c$), a nominal supply voltage ($V = 230\text{V}$), and the loop's specific Power Factor ($PF_c$):
$$P_c(t) = V(t) \cdot I_c(t) \cdot PF_c \quad \text{[Watts]}$$

The appliance-specific Power Factors are defined as:
*   **Fridge Loop (C1):** $PF_1 = 0.72$ (inductive compressor cycle).
*   **Geyser Loop (C2):** $PF_2 = 0.98$ (purely resistive heating).
*   **Borehole Pump (C3):** $PF_3 = 0.75$ (inductive pump motor).
*   **Entertainment (C4):** $PF_4 = 0.85$ (switch-mode electronic supplies).
*   **Lighting Ring (C5):** $PF_5 = 0.90$ (LED driver circuits).

The total instantaneous household real power draw ($P_{\text{total}}$) is the sum of the disaggregated loops:
$$P_{\text{total}}(t) = \sum_{c=1}^{5} P_c(t)$$

---

### 3.3.2 The Closed-Loop Meter Sync Calibration Engine
Discrete numerical integration of simulated power values inevitably drifts from utility meters due to sags and sines. To resolve this, ZET-5 implements a **Meter Sync Calibration Engine**. 

When a user reads their physical meter and enters the exact remaining kWh token balance ($E_{\text{physical}}$), the system calculates the **metrology drift correction factor ($\kappa$)**. 

Let $\Delta E_{\text{engine}}$ be the energy consumed as integrated by our metrology engine since the last synchronization, and $\Delta E_{\text{physical}}$ be the actual consumption according to the utility meter:
$$\Delta E_{\text{engine}} = E_{\text{engine, last}} - E_{\text{engine, current}}$$
$$\Delta E_{\text{physical}} = E_{\text{physical, last}} - E_{\text{physical, current}}$$

The instantaneous calibration ratio ($\kappa_{\text{inst}}$) is calculated as:
$$\kappa_{\text{inst}} = \frac{\Delta E_{\text{physical}}}{\Delta E_{\text{engine}}}$$

To prevent anomalous single-sync errors (such as user input typos) from destabilizing the metrology engine, we apply a low-pass filter using an Exponential Moving Average to update the global calibration factor ($\kappa$):
$$\kappa_{n} = (1 - \beta) \cdot \kappa_{n-1} + \beta \cdot \kappa_{\text{inst}}$$
where $\beta = 0.30$ represents the calibration learning rate. All future power integration calculations are multiplied by this correction factor:
$$P_{\text{calibrated}}(t) = \kappa \cdot P_{\text{total}}(t)$$

---

### 3.3.3 The Rolling Hourly Signature (RHS) Online Learning Algorithm
Rather than storing days of raw metrology data in a memory-intensive database, ZET-5 utilizes a **Rolling Hourly Signature (RHS)**. The signature is structured as a $24$-bin array ($S$), where each bin represents a specific hour of the day ($h \in [0, 23]$):
$$S = [S(0), S(1), S(2), \dots, S(23)]$$

Every simulated hour, the metrology engine calculates the average power consumed during that hour ($C_{\text{observed}}$). The signature bin for that specific hour is then incrementally updated using an Exponential Moving Average (EMA):
$$S_t(h) = (1 - \alpha) \cdot S_{t-1}(h) + \alpha \cdot C_{\text{observed}}(h)$$
where $\alpha = 0.20$ is the **Signature Learning Rate**. 

This $\alpha$ weight represents a mathematical trade-off: a higher $\alpha$ allows the model to adapt rapidly to new household habits, but makes it highly sensitive to transient anomalies. A lower $\alpha$ ensures long-term signature stability but slow adaptation. The 24-bin array requires a minimal SRAM footprint (24 float values = 96 bytes), proving highly compatible with resource-constrained edge microcontrollers.

---

### 3.3.4 The Iterative Numerical Integration Forecasting Model
Standard meters project token runway using linear division:
$$\text{Runway (Days)} = \frac{E_{\text{remaining}}}{P_{\text{average}} \cdot 24}$$
This linear model assumes consumption is constant. ZET-5 replaces this with **Iterative Numerical Integration**. 

To compute the exact depletion timestamp, the engine steps forward hour-by-hour into the future. Let $t_{\text{virt}}$ be the current virtual time and $h = \text{Hour}(t_{\text{virt}})$. The forecasting processor executes a simulation loop:

```
INIT: E_temp = E_remaining
INIT: Hours_runway = 0
INIT: t_sim = t_virt

LOOP:
  h = Hour(t_sim)
  E_temp = E_temp - ( S(h) * 1 hour )
  
  IF E_temp <= 0 THEN
    BREAK LOOP
  END IF
  
  Hours_runway = Hours_runway + 1
  t_sim = t_sim + 1 hour
END LOOP
```

The exact depletion timestamp ($t_{\text{depletion}}$) is:
$$t_{\text{depletion}} = t_{\text{virt}} + \text{Hours}_{\text{runway}}$$

By accounting for the cyclic load fingerprint ($S$), this iterative forecasting model provides highly accurate predictions, adjusting dynamically if the user is entering a high-load morning or a low-load nighttime phase.

---

### 3.3.5 The Thermodynamic Geyser and Knapsack Scheduling Solvers
To transition from passive threshold recommendations to actionable real-life daily schedule "recipes," ZET-5 integrates a **Thermodynamic Model** and a **Linear Knapsack Budget Allocator**.

#### 1. Thermodynamic Geyser Modeling
A standard electric geyser cannot be operated in short, arbitrary intervals (e.g. 5 or 10 minutes) because a heating element requires a minimum continuous duration to heat cold water to a usable temperature. Operating below this minimum operational threshold wastes electricity through incomplete heating cycles.

Let $m$ be the mass of the water inside the geyser tank ($150\text{ Liters} = 150,000\text{ grams}$), $C_p$ be the specific heat capacity of water ($4.184\text{ J/g}^\circ\text{C}$), $P$ be the geyser element rated power ($2000\text{ Watts}$), and $\eta$ be the electrical-to-thermal efficiency ($0.90$). The time $t_{\text{heat}}$ (seconds) required to heat the tank from an incoming temperature ($T_{\text{in}} = 15^\circ\text{C}$) to a comfortable shower temperature ($T_{\text{target}} = 55^\circ\text{C}$) is given by:

$$t_{\text{heat}} = \frac{m \cdot C_p \cdot (T_{\text{target}} - T_{\text{in}})}{P \cdot \eta} \quad \text{[Seconds]}$$

Substituting the nominal physical parameters:

$$t_{\text{heat}} = \frac{150000 \cdot 4.184 \cdot (55 - 15)}{2000 \cdot 0.90} = 13,946.6\text{ Seconds} \approx 232.4\text{ Minutes}$$

For a fully depleted tank, this represents a **3.8-hour cycle** ($7.7\text{ kWh}$). To maintain minimal daily comfort, the system models the geyser's hourly recovery loop. If the geyser has been off, a single rapid top-up cycle requires a minimum continuous duration of **44 minutes** ($1.5\text{ kWh}$) to raise a fraction of the tank's thermal profile. Any advice recommending less than 44 minutes is rejected by the system, ensuring the geyser is either scheduled for a full functional top-up or disabled entirely.

#### 2. The Knapsack Energy Allocation Optimization
To construct active "Recipes" (Survival, Balanced, Comfort), the system evaluates the remaining energy budget ($E_{\text{remaining}}$) against the target runway hours ($T_{\text{target}}$). 

Let $P_{\text{standby}}$ be the continuous standby power of Tier 1 essential appliances (refrigerator compression cycles, security lighting, and edge controller itself), modeled at a constant baseline:
$$P_{\text{standby}} = 95.0\text{ Watts}$$

The essential baseline energy required ($E_{\text{essential}}$) to survive the target runway is:
$$E_{\text{essential}} = \frac{P_{\text{standby}} \cdot T_{\text{target}}}{1000} \quad \text{[kWh]}$$

If $E_{\text{remaining}} < E_{\text{essential}}$, the system declares a **Mathematical Deficit**, triggering an immediate "Unfeasible Target Alarm" on screen and displaying the precise kWh deficit:
$$E_{\text{deficit}} = E_{\text{essential}} - E_{\text{remaining}}$$

If the budget is feasible, the surplus energy ($E_{\text{surplus}} = E_{\text{remaining}} - E_{\text{essential}}$) is allocated to convenience and comfort loads (Tier 2 and Tier 3) using a bounded fractional knapsack solver, outputting specific operational windows (e.g. Borehole Pump restricted to 20 minutes at midday, Geyser scheduled for exactly 45 minutes at 05:00) that the user can physically check off and apply.

---

### 3.3.6 Grid-State Aware Filtering and Load-Shedding Forecasting
Domestic installations in sub-Saharan African markets are routinely subjected to severe, multi-hour utility power cuts (load-shedding). If a residential energy controller is passive, a prolonged grid blackout results in a continuous $0\text{ Watt}$ draw across all monitored loops. Without active protection, the online Exponential Moving Average (EMA) signature engine would interpret this as a drop in household activity, incrementally writing zero averages into the Rolling Hourly Signature (RHS) matrix and corrupting the learned habit baseline within 48 to 72 hours.

To protect the integrity of the behavioral model and adapt its forecasting to active load-shedding regimes, ZET-5 implements a **Grid-State Aware Metrology Filter** and a **Probability-Adjusted Forecast runway**.

#### 1. Grid-State Aware Signature Filtering
The system continuously monitors the active utility grid state ($G_{\text{state}} \in \{0, 1\}$). A blackout condition ($G_{\text{state}} = 0$) is declared when raw simulated mains voltage drops to zero or when *all* disaggregated channels simultaneously drop to $0.0\text{A}$ while the backup battery/solar supply keeps the edge controller alive. 

When $G_{\text{state}} = 0$, the online learning module **freezes all parameters inside the RHS signature array**. The signature bin $S(h)$ for hour $h$ is preserved exactly at its previous learned state, preventing grid blackouts from polluting the behavioral memory profile:

$$S_t(h) = \begin{cases} (1 - \alpha) \cdot S_{t-1}(h) + \alpha \cdot C_{\text{observed}}(h) & \text{if } G_{\text{state}} = 1 \\ S_{t-1}(h) & \text{if } G_{\text{state}} = 0 \end{cases}$$

where $\alpha = 0.20$ is the signature learning rate.

#### 2. Probability-Adjusted Forecast runway Integration
Standard HEMS calculators project remaining token runway assuming continuous, 24-hour grid availability. Under severe load-shedding sags, this assumption overestimates utility billing sags, as no prepaid energy is consumed during blackouts.

To resolve this, ZET-5 models an **Hourly Grid Probability Matrix ($\gamma$)**, consisting of 24 bins representing the likelihood of grid power being active during each specific hour ($h \in [0, 23]$):
$$\gamma = [\gamma_0, \gamma_1, \gamma_2, \dots, \gamma_{23}]$$

These probability weights ($\gamma_h \in [0, 1]$) are updated dynamically using real-time observations of grid status or pre-loaded with local ZETDC schedule patterns. When the iterative forecasting engine steps forward hour-by-hour into the future, it incorporates these blackout sags, multiplying the predicted hourly wattage signature by the grid probability factor:

$$E_{\text{temp}} = E_{\text{temp}} - \left( S(h) \cdot \gamma_h \cdot \Delta t \right)$$

This probability masking ensures that if the grid is shed for 10 hours a day ($\gamma_h \approx 0$ for those slots), the engine correctly projects that the physical prepaid token will last **longer** chronologically, providing the user with highly realistic, multi-day planning runways.

---

## 3.4 Data Generation and Collection Methods
As a Software-in-the-Loop prototype, data collection focuses on two environments:

*   **Load Profile Synthesis:** High-fidelity household profiles were mathematically modeled using active consumption patterns from the **Pecan Street domestic dataset**. The simulated environment generates hourly current ticks (amperes) representing:
    *   *Fridge:* Cyclic compressor load of $150\text{W}$ cycling on/off every 45 minutes.
    *   *Geyser:* Steady resistive draw of $2000\text{W}$ occurring between 05:00-07:00 and 17:00-19:00.
    *   *Borehole Pump:* Inductive load of $1200\text{W}$ operating for 1 hour at midday.
    *   *Entertainment:* Electronic loads of $300\text{W}$ active during evening hours (18:00-22:00).
    *   *Lighting:* Step-load of $150\text{W}$ active between 18:00-06:00.
*   **System-Generated Log Data:** The prototype's console output registers every metrology integration interval (2 seconds), hourly learning updates, drift sync events, and automated triage sheds. These log traces are saved as CSV files directly in the workspace to facilitate Python evaluation and chart generation.

---

## 3.5 Development Tools and Technologies
*   **Core Systems Programming:** Written in clean, modular JavaScript and React inside standard VS Code, compiling the metrology engine (`energyEngine.js`) and the learning engine (`predictionEngine.js`).
*   **Data Analysis and Visualisation:** Python 3.11 with NumPy and Matplotlib was used to process serial calibration and simulation CSV logs to output numerical validation graphs.
*   **Styling & UI:** Pure Vanilla CSS utilizing sleek dark-theme Glassmorphism HSL variables to design a premium bento-grid dashboard structure.

---

## 3.6 System Validation and Testing Methodology
The validation framework evaluates the ZET-5 prototype against four experimental test scenarios:

1. **Drift Engine Verification:** Introduce a simulated $5\%$ metrology scaling drift. Execute manual synchronization updates and track the correction factor ($\kappa$) stability to validate $H_1$.
2. **Online learning Calibration Test:** Run the Virtual Time Machine Sandbox for 7 simulated days (fast-forwarding 24 hours at a time). Monitor the **Behavioral Calibration Index** to validate $H_2$.
3. **Forecasting Variance Analysis:** Run the iterative forecasting model against the static linear division model. Compare their prediction variances against the actual token depletion time to validate $H_3$.
4. **Graduated Triage Determinism:** Trigger low-budget states under heavy active loads. Confirm that the triage engine systematically sheds Tier 3, then Tier 2, while preserving Tier 1 to validate $H_4$.

---

## 3.7 Chapter Summary
This chapter detailed the research methodology of the ZET-5 prototype. We justified the choice of Design Science Research (DSR) and the Software-in-the-Loop (SIL) validation architecture. We presented the core mathematical models governing power factor correction, the closed-loop meter synchronization loop, the Rolling Hourly Signature (RHS) online learning algorithm, and the iterative numerical forecasting model. 

Finally, we established a systematic validation framework consisting of four quantitative test scenarios designed to validate our core hypotheses. The next chapter details the software implementation and architectural components of the ZET-5 prototype.
