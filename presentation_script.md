# ZET-5 Smart Energy Controller — Full Presentation Script

> [!TIP]
> **Presenter's Note:** This document is structured as a complete, chronological walkthrough of the ZET-5 system. It follows the exact order a user would encounter each screen for the first time. Every button, label, and design choice is explained with its rationale.

---

## SCREEN 1: Engineer Setup — Page 1 of 2 (Professional Authentication)

**[Action: Open the application for the first time. The Engineer Setup page appears.]**

"The very first screen any user sees is not for the homeowner. It is for the **Certified Engineer**. We designed this as a deliberate gatekeeper. The system will not allow any resident to access the dashboard until a professional has physically calibrated and registered the installation.

Let me walk through every element on this screen.

**The ZET5 Logo and 'ENGINEER SETUP' Title:**
At the top, we display 'ZET5 ENGINEER SETUP' with the word SETUP highlighted in blue. We chose this visual separation to immediately signal that this is a restricted, professional-only interface. It is not the consumer-facing login. The blue accent colour is used consistently throughout the system to denote interactive or informational elements.

**Section 1: Professional Authentication**
The first section is labelled 'Professional Authentication.' We require two fields here:

- **Installer Name:** This captures the name of the technician performing the installation. We store this permanently so the homeowner always knows who installed their system. It also creates an accountability trail.

- **ZET5 Badge Code:** This is a registration code formatted as 'ZET5-XXXX.' We enforce this specific format because it validates that the person entering the data is a registered, authorised ZET-5 installer. If someone types a random code without the 'ZET5-' prefix, the system will reject it. This prevents unauthorised individuals from misconfiguring the hardware profiles.

Below the Badge Code field, there is a small grey helper text: *'Only engineers with active ZET5 credentials may calibrate this dashboard.'* We placed this text to reinforce the professional boundary.

**Section 2: Client Account Linking**
The second section asks for the **Resident / Client Email Address.** This is the homeowner's email. The system stores this email and uses it later during the Login process. When the homeowner tries to log in, ZET-5 checks if the email matches the one the engineer registered. If it does not match, access is denied. This is how we bind a specific installation to a specific household. It prevents one household from accidentally logging into another household's ZET-5 unit.

Below this field, we explain: *'Creates the official resident profile. The resident will use this email to log in and set up token targets.'* We placed this helper text to ensure the engineer understands that whatever email they type here will be the homeowner's permanent login credential.

**The 'Continue to Channel Setup' Button:**
At the bottom, a single primary button reads 'Continue to Channel Setup.' We labelled it this way rather than a generic 'Next' because it tells the engineer exactly what is coming on the next screen."

---

## SCREEN 2: Engineer Setup — Page 2 of 2 (Telemetry Circuit Calibration)

**[Action: Click 'Continue to Channel Setup.' The second page appears.]**

"This is the most critical engineering screen in the entire system. This is where the software is physically married to the hardware.

**Section 3: Telemetry Circuit Calibration**
The heading says 'Telemetry Circuit Calibration.' We used the word 'Telemetry' deliberately because the system is not just reading data — it is continuously streaming sensor measurements in real time.

Below the heading, we provide a description: *'Calibrate and name active appliance sensors attached to the 5 physical channels.'* This tells the engineer that each row on this screen maps directly to one of the five physical current sensing channels on the monitoring hardware.

**The 'Readme: Load Profile Types Explained' Dropdown:**
We placed a collapsible information panel here. When the engineer clicks it, it expands to explain the four load profile types:
- **Continuous:** Appliances that are always drawing power with a steady current (e.g., a fridge compressor).
- **Cyclic:** Appliances that switch on and off based on a thermostat (e.g., a geyser heating element).
- **Scheduled:** Appliances that run for specific, predictable durations (e.g., a borehole pump running for 30 minutes).
- **Variable:** Appliances with unpredictable, human-driven usage patterns (e.g., a TV or stove).

We included this dropdown because the engineer needs to correctly classify each appliance. This classification directly affects how the system's prediction algorithms model future energy consumption. If the engineer labels a geyser as 'Continuous' instead of 'Cyclic,' the system's mathematical forecasts will be permanently inaccurate.

**The 5 Channel Cards (C1 through C5):**
Each card represents one physical sensor channel. Every card has three fields:
- **Appliance Name:** A human-readable label (e.g., 'Fridge,' 'Geyser'). This name appears on every screen in the system — the dashboard, the relay control grid, the optimizer schedules. We ask the engineer to name them because the engineer knows exactly which wire is clamped to which breaker.
- **Peak Wattage (W):** The maximum rated wattage of the appliance. We ask for this because the system uses it to auto-calculate the expected amperage using Ohm's Law (Amps = Watts ÷ 230V). This calculated amperage becomes the baseline for anomaly detection. If the system ever reads a current significantly higher than this baseline, it flags a potential hardware fault.
- **Load Profile:** The dropdown selector for the four types explained above. This determines which mathematical model the prediction engine uses for that channel.

We pre-populate the five channels with sensible defaults (Fridge, Geyser, Borehole, Entertainment, Lighting) because these are the most common residential loads in a typical Zimbabwean household. The engineer can rename them if the household has different appliances.

**The 'Back' and 'Authenticate Engineer & Form Link' Buttons:**
At the bottom, we have two buttons:
- **Back:** Returns to the previous page. We always provide a back button on multi-step forms because engineers may realise they entered the wrong client email.
- **Authenticate Engineer & Form Link:** This is the final submission button. We deliberately made the label long and descriptive. The word 'Authenticate' confirms the engineer's credentials are being verified. The phrase 'Form Link' confirms that this action permanently binds the software to the client's account. When clicked, the system shows a loading state: *'Validating Registry & Linking...'* to indicate that the system is processing the registration.

**The 'ZET-5 Link Active' Confirmation Screen:**
After successful submission, a green confirmation screen appears with 'ZET-5 Link Active,' the linked client email displayed in blue, and the message *'Redirecting to Client Login Console...'* This screen exists for two seconds to give the engineer visual confirmation before the system transitions to the client-facing login."

---

## SCREEN 3: Client Login — Email & OTP Verification

**[Action: The system transitions to the Login Page.]**

"Once the engineer completes their work, the system redirects to the **Client Login Page.** From this point forward, only the homeowner interacts with the system.

**The ZET-5 Logo and 'Energy Controller Interface' Subtitle:**
We display the product name and a clean subtitle. We chose 'Energy Controller Interface' rather than 'Dashboard' or 'Home' because it communicates that this is a professional-grade control system, not a casual consumer app.

**Email Address Field:**
The login requires the homeowner's email address. The system validates this against the email the engineer registered. If someone enters an unregistered email, they receive the error: *'Access Denied: This ZET-5 device is linked to client: [email]. Please log in with the registered client email.'* We designed this security measure to prevent unauthorized access.

**The 'Send Verification Code' Button:**
When the correct email is entered, the system sends a 6-digit One-Time Password (OTP). We chose OTP authentication over traditional passwords for two reasons:
1. It eliminates the risk of weak or reused passwords.
2. It confirms the homeowner actually has access to the registered email account.

**The 6-Digit OTP Input:**
On the next step, six individual input boxes appear. We designed them as separate single-digit fields rather than one long text box because it is a well-established UX pattern that reduces input errors and feels more secure. Each box automatically focuses the cursor to the next box as you type. The system also supports paste functionality — if the user copies the code from their email and pastes it, all six boxes fill instantly.

**The 'Back to email' Link:**
Below the OTP inputs, we placed a 'Back to email' text link. This allows users to correct their email if they entered the wrong one. We made it a subtle text link rather than a button because it is a secondary, corrective action — not the primary flow."

---

## SCREEN 4: Setup Wizard — Step 1: ZESA Token Entry

**[Action: After successful login, the Setup Wizard appears.]**

"The Setup Wizard is a 3-step onboarding flow. We split it into three steps rather than one long form because each step addresses a fundamentally different concern. We display a step indicator at the top ('01 Token → 02 Goal → 03 Alerts') so the user always knows where they are in the process.

**Step 1: ZESA Token Entry**
The heading says 'ZESA Token Entry.' The description reads: *'Enter your most recent electricity token purchase for depletion tracking.'*

**The 'Best Practice Advice' Warning Box:**
Before the input fields, we placed a prominent amber warning box. It reads: *'For absolute accuracy, complete this setup immediately after loading a fresh ZESA token. If you enter a token bought in the past, ZET-5 won't know how much you've already consumed!'*

We placed this warning here because accuracy of the initial token balance is the single most important variable in the entire system. If the user enters 150 kWh but they have already consumed 30 kWh since purchasing it, every single prediction the system makes will be 30 kWh too optimistic. The warning also mentions that the user can fix this later using the 'Meter Sync' tool.

**The Three Input Fields:**
- **Energy Purchased (kWh):** The raw kilowatt-hours printed on their ZESA receipt. This is the core budget the entire system operates on.
- **Amount Paid (ZWL / USD):** The monetary cost. We capture this for future features like cost-per-kWh analytics and budgeting reports.
- **Purchase Date & Time:** A datetime picker. We capture the exact timestamp because the system needs to know when the budget started in order to calculate the rate of depletion over time.

**The Date Accuracy Consent Checkbox:**
At the bottom, there is a mandatory checkbox with amber text: *'I acknowledge that entering an inaccurate date will permanently skew the Rolling Hourly Signature model and cause backsliding in ZET-5's predictive thermodynamic equations.'*

We made this a mandatory checkbox (the system will not proceed without it) because we want the user to physically acknowledge the importance of date accuracy. This is not a legal disclaimer — it is an engineering safeguard. If the date is wrong, the system's entire time-series learning model starts from a corrupted baseline."

---

## SCREEN 5: Setup Wizard — Step 2: Duration Goal

**[Action: Click 'Continue.' Step 2 appears.]**

"**Step 2: Duration Goal**
The heading says 'Duration Goal.' The description reads: *'Set your target. Choose between a number of days or a specific target date.'*

**The Mode Toggle (Number of Days / Target Date):**
We provide two buttons at the top: 'Number of Days' and 'Target Date.' We designed this dual-mode input because different users think differently:
- Some users think: *'I want this to last 21 days.'*
- Other users think: *'I want this to last until the 15th of next month.'*

Both inputs ultimately produce the same value (a number of days), but offering both respects how different people naturally frame their goal.

**The Days Input:**
If the user selects 'Number of Days,' a large, prominent number input appears with 'DAYS' labelled beside it. Below it, a hint reads: *'Average household: 21-30 days per token.'* We placed this hint to give users a reasonable benchmark if they have no idea what to enter.

**The Target Date Input:**
If the user selects 'Target Date,' a datetime picker appears with the label *'I want this to last until (Date & Time).'* When a date is selected, the system immediately calculates and displays the number of days from today. This instant feedback prevents the user from accidentally selecting a date in the past."

---

## SCREEN 6: Setup Wizard — Step 3: Alerts & Emergencies

**[Action: Click 'Continue.' Step 3 appears.]**

"**Step 3: Alerts & Emergencies**
This is the most important safety configuration screen.

**Notification Trigger:**
The label reads: *'Start recommendations when remaining units fall below.'* A large input field displays a pre-calculated value. We automatically suggest 50% of the user's token balance as the default. For example, if they entered 150 kWh, we suggest 75 kWh.

We chose this default because 50% gives the system enough remaining budget to generate meaningful optimisation schedules. If we set it too low (e.g., 10%), the system would only start advising when it is already too late to make impactful changes.

**Critical Emergency Threshold:**
Below the notification trigger, there is a red-labelled section: *'Critical Emergency Threshold.'* The description reads: *'At what point should ZET-5 enter Survival Mode to prevent a complete blackout?'*

This is the absolute last line of defence. When the token balance drops below this value, the system takes autonomous action. We default it to 5 kWh because, at typical household consumption rates, 5 kWh represents approximately 6-12 hours of essential-only power (fridge and lights). This gives the homeowner enough time to purchase a new token.

**The Autonomous Emergency Overrides Checkbox:**
A red-bordered checkbox reads: *'If enabled, ZET-5 will automatically shed high-load appliances (e.g. Geyser) without asking when the emergency threshold is breached. If disabled, you will only receive a notification.'*

We designed this as an opt-in checkbox because autonomous control of household appliances is a significant decision. The user must explicitly authorise the system to act on their behalf. This is a core principle of our design: the system never takes control without consent.

**The 'Complete Setup' Button:**
The final button reads 'Complete Setup' rather than 'Submit' or 'Finish.' This specific wording signals that the configuration is locked in and the system is about to go live."

---

## SCREEN 7: The Main Dashboard

**[Action: Setup completes. The full Dashboard loads.]**

"This is the primary operational interface. Every element on this screen was placed with deliberate intent.

**The Sidebar Navigation (Left Edge):**
On the far left, a narrow sidebar contains icon-only navigation buttons. We designed it as icon-only (no text labels) to maximise horizontal screen space for the dashboard data. The icons are:
1. **Dashboard** (grid icon) — The primary monitoring view.
2. **Management** (sun icon) — Appliance profiling and token recharge.
3. **Daily Averages** (document icon) — Historical consumption data.
4. **Audit Trail** (calendar icon) — Forensic event logs.
5. **Inference Insights** (layers icon) — Deep-dive analytical view.
6. **Settings** (gear icon) — System configuration.

At the bottom of the sidebar, two additional buttons:
- **Tour Guide** (question mark icon, highlighted in blue) — Launches an interactive tutorial. We coloured it blue to make it discoverable for first-time users.
- **Logout** (exit icon) — Ends the session.

**The Header Bar:**
At the top, a header displays the current page title and a connection status indicator. The green dot labelled 'Connected' confirms the real-time data stream is active. We placed this indicator here because in a monitoring system, the user must always know if they are looking at live data or stale data.

**The Runway Countdown Timer (Top-Left Card):**
The largest, most prominent card displays:
- **The remaining kWh** in large, bold white text.
- **The time remaining** in days and hours.
- **The daily usage rate** calculated from the system's learned patterns.
- **The 'On Track' / 'Off Track' badge** — A coloured badge indicating whether the user will meet their duration goal.

We made this the largest element on the entire screen because it answers the single most important question: *'When will my power run out?'* The confidence percentage beside it builds trust in the prediction.

**The System Status Card (Top-Right Card):**
Adjacent to the runway timer, a card displays:
- **Calibration progress** (e.g., 'Day 3/7 — 42%').
- **Data collection duration** in minutes.
- **The Low-Energy Trigger Threshold** value.
- **The Smart Advice / Active Schedule button** — This is the gateway to the optimisation engine.

We placed the Smart Advice button inside the System Status card because it is contextually relevant. The user sees their system health and can immediately act on it.

**The Smart Advice Button:**
When no schedule is active, this button reads 'Smart Advice' with an info icon. When an autonomous schedule is active, the button transforms: it turns green, displays a checkmark icon, and reads 'Active Schedule: SURVIVAL' (or whichever schedule is running). We designed this transformation so the user can always see, at a glance, whether the system is currently operating autonomously.

**Monitored Circuit Loops (Sensor Cards):**
Below the primary cards, five gauge cards display the live amperage reading for each channel. Each card shows:
- The appliance name (set by the engineer).
- The current amperage value.
- A coloured progress bar indicating load level (green for normal, amber for moderate, red for high).
- A 'Loop' badge (e.g., 'Loop 1').

We designed these as individual cards rather than a single table because cards are easier to scan visually and each appliance deserves its own visual space.

**The Relay Control Grid (Bottom):**
At the very bottom, five relay toggle cards allow manual power control. Each card displays:
- The relay number (e.g., 'Relay 01').
- The appliance name.
- The status ('ACTIVE' in green or 'IDLE' in grey).
- A physical toggle switch.

We placed the relay controls at the bottom deliberately. In normal operation, users should be monitoring (top of page), not toggling (bottom of page). The spatial hierarchy guides behaviour: look first, act last."

---

## SCREEN 8: The Optimizer Panel (Smart Advice)

**[Action: Click the 'Smart Advice' button. The side panel slides in from the right.]**

"The Optimizer opens as a side panel that slides in from the right edge of the screen. We designed it as a slide-over rather than a separate page because the user should still be able to see the dashboard behind it. This maintains spatial context — they can see their relay states while choosing a schedule.

**The Header:**
The panel title is 'Optimizer' with a subtitle: *'Adaptive edge allocation and load schedules.'* We chose the name 'Optimizer' over 'Smart Advice' because this panel is not just giving advice — it is running a mathematical optimisation algorithm.

**The Calculation Context Bar:**
At the top, a subtle bar displays:
- The remaining kWh and day target the calculations are based on.
- The exact timestamp of the last calculation.
- The next auto-refresh window (e.g., 'Today 18:00').
- A 'Recalculate' button.

We placed this context bar here because the optimisation results are time-sensitive. If the user opened this panel and the data was 6 hours old, the schedules might be inaccurate. The Recalculate button allows an instant refresh.

**The Three Recipe Cards:**
The engine generates three operational schedules:
1. **Survival** — Disables all non-essential loads. Only the fridge remains powered.
2. **Budget** — Allows limited geyser usage and cycles appliances efficiently.
3. **Comfort** — Permits near-normal usage but warns of the projected depletion date.

Each card displays:
- A daily energy budget (e.g., '6.2 kWh/day').
- A feasibility badge ('WILL MEET TARGET' in green or 'TARGET NOT ACHIEVABLE' in red).
- A 'View Daily Allocation Details' button.
- An 'Activate Schedule' button.

We designed three tiers rather than just one recommendation because energy management is personal. Some users will sacrifice hot water to make their token last. Others will not. By offering three choices, we respect the user's autonomy.

**The Daily Allocation Details View:**
When the user clicks 'View Daily Allocation Details,' the panel transitions to a detailed breakdown showing exactly how each appliance is scheduled. For example:
- *Fridge Loop: Continuous operation (24h/day)*
- *Geyser Loop: Restricted to 05:00–05:45 only (45 min/day)*

We included this level of detail because users need to understand exactly what the system will do before they authorise it.

**The Geyser Thermodynamic Warning:**
If the geyser allocation is present, a special amber warning appears: *'Thermodynamic lock: runtimes below 45 mins output 100% cold water.'* This is based on the physics equation Q = mcΔT. The system calculates the exact minutes required to heat 150 litres of water from 15°C to 55°C at 3000W with 90% efficiency. If the budget cannot afford this minimum runtime, the system warns the user that the geyser will produce cold water.

**The Activation Confirmation (Autonomous vs Manual):**
When the user clicks 'Activate Schedule,' a confirmation prompt appears. It asks: *'Do you want ZET-5 to actively track the time and switch the relays for you automatically, or do you prefer to apply these settings manually?'*

Two options are presented:
- **Fully Autonomous (Recommended):** The system takes full control.
- **Manual Control Only:** The system shows the schedule but the user must toggle relays themselves.

We require this explicit choice because automation of household appliances must always be consensual."

---

## SCREEN 9: Management Page

**[Action: Navigate to the Management page via the sidebar.]**

"The Management page handles appliance profiling and token management.

**Appliance Profiling Section:**
At the top, five locked cards display the sensor channel configurations set by the engineer. Each card shows the appliance name, load profile type, and maximum expected load. A prominent 'Locked Configuration' amber banner explains: *'This metrology and circuit mapping configuration was calibrated and locked during installation by your ZET-5 Certified Engineer.'*

We locked these fields because if a resident accidentally renames 'Geyser' to 'Stove,' the system's power factor calculations and thermodynamic models would become corrupted. Only the engineer should modify these.

**Notification Trigger:**
Below the profiles, the user can adjust their notification threshold. The label reads: *'Start recommendations when remaining units fall below.'* An input field and 'Update' button allow changes.

**Prepaid Meter Recharge & Sync Section:**
This section provides two side-by-side cards:
- **Option A: Load ZESA Recharge** — For when the user purchases new tokens. A 'Read more about engine impact' expandable section explains the mathematics: *'Loading a token performs a direct step-up linear addition of prepaid kWh units.'*
- **Option B: Calibrate Metrology (Sync)** — For when the user notices the system's estimate drifting from their physical meter reading. The expandable explanation describes: *'Syncing applies a closed-loop feedback correction.'*

We designed these as two separate, visually distinct options because recharging and syncing are fundamentally different operations. A recharge adds energy. A sync corrects accuracy. Combining them into one form would confuse users."

---

## SCREEN 10: Settings Page

**[Action: Navigate to the Settings page via the sidebar.]**

"The Settings page contains system-wide configuration and support tools.

**ZET-5 Certified Link Card:**
At the top, a verified badge displays the engineer's name, registration code, and linked email. This gives the homeowner permanent visibility into who installed their system.

**WhatsApp Assistance:**
Below the engineer card, a green WhatsApp button provides instant contact with the certified installer. We pre-fill the message with the system status so the engineer immediately has context when receiving the inquiry.

**System Diagnostics:**
A diagnostics section displays real-time memory usage, render cycle counts, and data stream health. We included this for troubleshooting purposes during technical support calls.

**Danger Zone:**
At the very bottom, clearly separated by red borders, are destructive actions:
- **Clear Historical Data** — Erases learned consumption patterns.
- **Reset Complete Setup** — Factory resets the entire system.

We placed these at the bottom inside a red 'Danger Zone' container because they are irreversible. The spatial placement (far from normal UI) and the red colour both serve as visual warnings."

---

## FEATURE: Emergency Intercept Modal

**[Action: Describe or trigger the Emergency Mode.]**

"When the user's token balance drops below the critical emergency threshold, the system does not silently take action. Instead, a full-screen modal appears with a red warning icon and the text: *'Critical Emergency Threshold.'*

The modal presents three explicit options:
1. **ZET-5 Autonomous Protection** — The user authorises the system to immediately shed heavy loads (e.g., the geyser).
2. **Keep Existing Configuration** — The user declines intervention and accepts the risk.
3. **View Strategic Survival Schedules** — Opens the Optimizer for the user to manually choose a survival plan.

We designed this as a modal that blocks interaction (rather than a passive notification) because the situation is urgent. The user must make a conscious decision. The system will not proceed until they do."

---

## FEATURE: The Loading Overlay

**[Action: Demonstrate by fast-forwarding time or activating a schedule.]**

"Throughout the system, heavy operations trigger a full-screen loading overlay. A spinning green circle appears with contextual text:
- *'SIMULATING 24 HOURS OF USAGE...'*
- *'ACTIVATING SCHEDULE: SURVIVAL...'*
- *'CLEARING HISTORICAL DATA...'*
- *'LOGGING OUT...'*

We added this loading indicator to every significant process because it provides critical feedback. Without it, users would click buttons and see nothing happen for a moment, leading them to believe the system is broken. The green spinning circle and uppercase status text reinforce the industrial, professional aesthetic of the platform."

---

## Closing Statement

"In summary, every element of the ZET-5 interface — from the engineer's badge code validation to the amber thermodynamic warnings — was designed with a specific engineering or user-experience rationale. The system transforms raw sensor telemetry into human-readable predictions, and converts mathematical optimisation into simple three-option schedules that any homeowner can understand and authorise.

Thank you."
