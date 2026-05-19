# CHAPTER 2: LITERATURE REVIEW AND RELATED WORK

## 2.0 Introduction
Intelligent residential energy management represents a critical intersection of power systems engineering, embedded computing, and machine learning. This chapter reviews the theoretical background, historical developments, and emerging technological trends that define this domain. The review is structured to analyze existing methodologies, evaluate their practical limitations within developing economies, and establish the theoretical foundation for the **ZEC-5 Software-in-the-Loop (SIL) Predictive Energy Controller**. 

---

## 2.1 Theoretical Background

### 2.1.1 Residential Load Disaggregation: Multi-Channel vs. NILM
Residential energy management requires disaggregated load data—knowing which specific appliance is drawing power. Historically, two primary paradigms have been explored:

1. **Intrusive/Multi-Channel Monitoring:** In this paradigm, dedicated current sensors (current transformers or shunt resistors) are installed on every individual circuit loop at the primary electrical distribution board (DB). This architecture provides deterministic, high-frequency measurements for each monitored circuit, eliminating electrical signal ambiguity. However, it requires direct panel wiring and multiple sensor interfaces.
2. **Non-Intrusive Load Monitoring (NILM):** First proposed by George Hart in 1992, NILM aims to disaggregate total household power consumption from a single, aggregate measurement taken at the utility meter (Hart, 1992). NILM algorithms analyze transient switching signatures, current harmonics, and voltage-current (V-I) trajectories to infer which appliances are active.

Modern research has heavily favored NILM due to its single-sensor installation profile. However, NILM presents significant computational hurdles. Deep learning models—such as Convolutional Neural Networks (CNNs), Recurrent Neural Networks (RNNs), and Long Short-Term Memory (LSTM) networks—are widely used to classify complex load overlaps (Mwale and Chipofya, 2023). These networks are computationally heavy, require large, highly labeled historical datasets (e.g., REDD, UK-DALE), and exhibit significant accuracy degradation when running on low-power edge processors. 

Furthermore, these datasets do not reflect the appliance profiles of Zimbabwean households, where brands, wattage ratings, and mains supply voltage profiles differ significantly. For a robust, low-cost edge controller, ZEC-5 rejects heavy single-sensor NILM neural network processing in favor of a **pragmatic multi-channel circuit loop design**. By monitoring up to five dedicated domestic circuits (e.g., Geyser ring, Fridge socket radial) directly at the distribution board, the system achieves **100% deterministic disaggregation accuracy** without any machine learning overhead or cloud-connected training.

### 2.1.2 Real vs. Apparent Power Metrology: The Power Factor Challenge
In Alternating Current (AC) electrical systems, power is represented in three distinct mathematical forms:

*   **Apparent Power ($S$):** The raw product of Root Mean Square (RMS) voltage and current:
    $$S = V_{RMS} \cdot I_{RMS} \quad \text{[Volt-Amperes, VA]}$$
*   **Real Power ($P$):** The actual power performing useful work in the circuit, accounting for the phase angle ($\theta$) between the voltage and current waveforms:
    $$P = V_{RMS} \cdot I_{RMS} \cdot \cos\phi \quad \text{[Watts, W]}$$
    where $\cos\phi$ represents the **Power Factor (PF)**.
*   **Reactive Power ($Q$):** The power that continuously oscillates between the source and the inductive/capacitive reactive elements of the load:
    $$Q = V_{RMS} \cdot I_{RMS} \cdot \sin\phi \quad \text{[Volt-Amperes Reactive, VAR]}$$

Utility meters (including ZESA prepaid meters) measure and bill domestic consumers strictly on **Real Power ($P$)** consumed over time, integrated as Kilowatt-hours (kWh):
$$E_{\text{billed}} = \int P(t) \, dt$$

Low-cost domestic current sensors (such as Split-Core Current Transformers) measure only current ($I$), which yields Apparent Power ($S$) if nominal mains voltage ($230\text{V}$) is assumed. If a domestic energy monitor uses Apparent Power to calculate token depletion, it will introduce massive calculation errors for reactive household appliances. 

For instance, a refrigerator compressor typically exhibits a low Power Factor ($\cos\phi \approx 0.70$) due to its inductive winding cycles. An electric geyser, being purely resistive, exhibits a Power Factor near unity ($\cos\phi \approx 0.98$). Calculating geyser consumption as Apparent Power is highly accurate, but doing so for a refrigerator results in a **30% overestimation** of utility billing. To address this, ZEC-5 integrates appliance-specific **Power Factor Correction factors** directly into its accumulation calculations, ensuring that the software models match the physical utility's billing algorithms.

### 2.1.3 The Numerical Integration Drift Problem
Calculating total energy consumption ($E$) from real-time power readings requires continuous mathematical integration:
$$E = \sum_{t=0}^{N} P(t) \cdot \Delta t$$
where $\Delta t$ is the measurement sampling interval. In any digital metrology processor, this discrete integration accumulates **systemic measurement drift** over time. This drift is driven by three variables:
1. Mains voltage variations (physical supply voltage in developing grids routinely sags to $190\text{V}$ or surges to $250\text{V}$).
2. Sensor metrology tolerances and thermal resistance drift.
3. High-frequency analog-to-digital converter (ADC) quantisation noise and offset errors.

Over days or weeks, these micro-errors accumulate into significant discrepancies. A smart home energy controller that drifts by just 5% will miscalculate a prepaid token's remaining runway by up to 24 hours, leading to premature blackout failures. In order to construct a robust system, the literature suggests closed-loop feedback controllers. ZEC-5 utilizes a **Meter Sync Calibration Engine** to dynamically calculate a correction factor ($\kappa$) based on manual synchronization inputs, ensuring that the integration engine actively recalibrates itself to match the physical meter's state.

### 2.1.4 Edge Computing: Why LSTMs Fail on Microcontrollers
Deep learning models, specifically Long Short-Term Memory (LSTM) recurrent neural networks, represent the state-of-the-art for time-series forecasting and sequence modeling. LSTMs process sequential data by maintaining a hidden cell state ($c_t$), which selectively retains historical context over multiple time steps. 

While highly effective for complex, multi-variable offline forecasting, LSTMs present three major architectural barriers for edge-level residential energy controllers:
1. **Computational Complexity:** LSTM units contain multiple fully connected dense layers with active activation functions (sigmoid, tanh). Running real-time inference on a typical edge processor requires millions of floating-point operations per second (FLOPS), creating severe CPU bottlenecks.
2. **Volatile Memory Footprint:** The weight matrices and intermediate activation variables of a standard LSTM model require several megabytes of RAM. Common low-power edge microcontrollers possess under 512 kilobytes of Static Random Access Memory (SRAM), creating severe memory out-of-bounds crashes during execution.
3. **Inability to Adapt in Real-Time (Static Training):** LSTMs are trained offline using static datasets. Once compiled and deployed to an edge device, the model's weights are static. If a household changes its physical habits (e.g., changing from night-shift to day-shift work, or buying a new appliance), the LSTM cannot adapt its model in real-time. It requires a complete offline database compile, retraining in Python, and reflashing of the firmware.

To overcome these barriers, ZEC-5 implements a **Rolling Hourly Signature (RHS) online learning model based on double exponential moving averages**. This mathematically elegant algorithm requires a minimal memory footprint (under 2 kilobytes of SRAM), updates its parameters incrementally with every incoming data tick ($O(1)$ complexity), and actively learns and adapts to household behavioral shifts in real-time directly on the edge.

---

## 2.2 Review of Existing Approaches

### 2.2.1 Traditional Demand-Side Interventions
Early domestic load management in Southern Africa was passive and manual. Miniature circuit breakers (MCBs) protect the structural wiring, while programmable analog timers are commonly wired to geysers to restrict heating to off-peak slots. 

Chipfunde and Mutsvangwa (2023) conducted a comprehensive survey of 120 urban households in Harare and confirmed that timer-based geyser scheduling is highly inflexible. A geyser timer will turn on the heating element at its scheduled hour even if the home's backup solar battery is depleted to 10% or if the prepaid ZESA balance is about to expire. Timers operate blind, possessing zero awareness of real-time supply capacities or token runways.

ZESA prepaid token meters represent the primary budget interface, showing remaining units on a small indoor liquid crystal display (LCD). However, as noted by Makonese et al. (2022) in their study of smart energy usage in Southern African households, manual monitoring is highly inefficient. Users rarely check the meter display until a sudden, complete blackout occurs. Traditional meters offer no predictive warnings, no disaggregated metrics, and no automated triage.

### 2.2.2 Intelligent and Edge-based Controllers
Recent academic research has explored microcontroller-based load shedding and smart billing. 

Diarra et al. (2023) developed an off-grid solar controller using an Arduino Mega microcontroller for rural West African communities. The system monitored battery voltage and triggered relay load shedding when voltage dropped below a static threshold. While the system achieved a 23% extension in battery longevity, it relied on battery voltage as a direct proxy for State of Charge (SoC). This introduces severe errors due to the non-linear discharge curve of lead-acid cells and transient voltage sags under heavy loads, which causes premature, unnecessary shedding of comfort loads.

Osei-Owusu et al. (2024) implemented a single-relay load shedding controller using an ESP8266 processor in Ghana. The system calculated total household current and opened a single relay if consumption crossed a safe limit, demonstrating an average response latency of 380 milliseconds. While demonstrating low cost and high speed, the ESP8266 controller operated on binary threshold rules. It lacked multi-channel disaggregation, possessed no tier-based priority mapping, and offered no predictive forecasting. A geyser and a lighting circuit were treated identically, making graduate triage impossible.

---

## 2.3 Comparative Analysis of Existing Systems

Table 2.1 presents a structured comparative analysis of these existing approaches against the design objectives of the ZEC-5 prototype.

### Table 2.1: Comparison of Existing Residential Energy Management Systems
| Study / System | Metrology Core | Forecasting Approach | Triage Method | Primary Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **Wanjiru et al. (2017)** | Passive MCB Protection | None | None (Binary Trip) | No budget awareness; purely reactive to physical faults. |
| **Diarra et al. (2023)** | Arduino Mega analog inputs | Static Schedule | Voltage-Threshold shedding | Voltage proxy for SoC is inaccurate; load shedding is static. |
| **Osei-Owusu et al. (2024)** | ESP8266 Current Sensor | None | Single-relay threshold trip | Single-channel only; cannot prioritize loads. |
| **Mwale & Chipofya (2023)** | Raspberry Pi 4 Neural Net | LSTM | None (Monitoring only) | Requires 4GB RAM; accuracy degrades on edge microcontrollers. |
| **Makonese et al. (2022)** | Commercial cloud monitor | Cloud Analytics | Manual human action | Cloud dependent; high cost ($120+); fails during internet blackouts. |
| **ZEC-5 (This Work)** | **SIL Simulated Metrology with PF correction** | **Rolling Hourly Signature (RHS) via EMA** | **Multi-circuit graduated triage (T1-T3)** | **Extrapolated mains voltage (mitigated by calibration loop)** |

---

## 2.4 Research Gap Synthesis
A critical synthesis of the literature reveals a major research gap: **the lack of a self-contained, low-cost, edge-only predictive controller that dynamically builds a household behavioral model and executes graduated load triage to stretch a prepaid energy token.**

1. **Failure of Edge-Only Forecasting:** Existing systems that achieve high load forecasting accuracy rely on heavy cloud-connected deep learning architectures, creating high vulnerability to internet dropouts. Systems that operate fully offline at the edge are restricted to basic static timers or binary threshold switches.
2. **Absence of Real Power Calibration:** Standard low-cost edge controllers calculate apparent power ($VA$) rather than real power ($W$), ignoring reactive load power factors and accumulating significant metrology drift.
3. **Absence of a "Time Machine" Validation Tool:** No academic paper or commercial prototype has incorporated a standardized time-virtualization model (Time Machine) to let researchers and panel examiners validate multi-day machine learning adaptations and depletion calculations in real-time.

ZEC-5 addresses this gap directly by implementing a highly optimized C++/JavaScript software-in-the-loop prototype that executes power factor correction, closed-loop drift calibration, online learning EMA modeling, and iterative numerical forecasting on a fully offline edge platform.

---

## 2.5 Proposed Conceptual Solution: ZEC-5 Software-in-the-Loop Prototype
To address this gap, this dissertation details the architecture and validation of the **ZEC-5 Software-in-the-Loop (SIL) Prototype**. The system is conceptualized as a highly optimized, dual-core software system served via a glassmorphic dashboard:

```
[Simulated Monitored Loops (C1-C5)] 
        |  High-fidelity synthetic current profiles with PF
        v
[Metrology & Calibration Engine] <--- Closed-loop drift correction (Sync)
        |  Real Power (Watts) calculations
        v
[Rolling Hourly Signature (RHS)] <--- Online incremental learning (EMA)
        |  24-bin behavioral habit matrix
        v
[Iterative Numerical Integration] ---> Projects exact depletion timestamp
        |
        +---> [Inference & Triage Engine] ---> Graduated relay shedding (T3 -> T2)
```

The detailed system design, mathematical models, and implementation files are detailed in Chapter 3 and Chapter 4.

---

## 2.6 Chapter Summary
This chapter reviewed the theoretical and empirical literature surrounding residential energy management. The theoretical analysis contrasted multi-channel loop disaggregation with computationally intensive single-channel NILM neural network processing. We formulated the mathematics of Real Power billing, Power Factor correction, and cumulative integration drift. The chapter detailed the computational and memory limitations of using LSTM neural networks on low-power edge microcontrollers and introduced the Rolling Hourly Signature (RHS) model as a resource-efficient alternative. 

Through a structured comparative analysis, we identified the critical research gap: the absence of an offline, edge-only, self-learning predictive triage controller. The proposed conceptual architecture for the ZEC-5 prototype was presented. The next chapter details the research methodology, design science frameworks, and the mathematical modeling of the ZEC-5 system.
