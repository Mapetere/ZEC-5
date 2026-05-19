/**
 * ZET-5 Predictive Forecasting Engine — Rolling Hourly Signature (RHS) Model
 * 
 * WHY THIS IS ACADEMICALLY ADVANCED:
 * Instead of assuming flat power consumption (e.g. Current kW × 24h), this engine
 * learns a 24-bin "Behavioral Profile" representing the typical household load 
 * signature for each hour of the day. 
 * 
 * It runs an ITERATIVE FORECASTING SIMULATION: it steps forward in time hour-by-hour,
 * deducting the learned load signature for that specific hour, until the remaining
 * prepaid units reach zero. This accounts for overnight standby periods and peak-load 
 * hours dynamically.
 */

const STORAGE_KEY = 'zet5_prediction_model';
const TIME_KEY = 'zet5_virtual_time_offset';
const ALPHA = 0.20; // Learning rate (EMA weight for online adaptation)

// Default "Starting Guess" for typical Zimbabwean household hourly usage in kWh
const BASELINE_HOURLY_SIGNATURE = [
  0.15, 0.15, 0.15, 0.15, 0.20, 0.35,  // 00:00 - 05:00 (Low standby, fridge cycles)
  0.85, 1.20, 0.90, 0.50, 0.40, 0.35,  // 06:00 - 11:00 (Morning peak: geyser active)
  0.30, 0.30, 0.35, 0.45, 0.50, 0.75,  // 12:00 - 17:00 (Midday baseline)
  1.10, 1.30, 0.95, 0.60, 0.30, 0.20   // 18:00 - 23:00 (Evening peak: lights, entertainment)
];

/**
 * Get the current virtual time (real time + fast-forward offset)
 */
export function getVirtualTime() {
  try {
    const raw = localStorage.getItem(TIME_KEY);
    const offset = raw ? parseInt(raw, 10) || 0 : 0;
    return new Date(Date.now() + offset);
  } catch {
    return new Date();
  }
}

/**
 * Add hours to the virtual system clock
 */
export function advanceVirtualTime(hours) {
  try {
    const raw = localStorage.getItem(TIME_KEY);
    const currentOffset = raw ? parseInt(raw, 10) || 0 : 0;
    const addedMs = hours * 60 * 60 * 1000;
    localStorage.setItem(TIME_KEY, (currentOffset + addedMs).toString());
    return new Date(Date.now() + currentOffset + addedMs);
  } catch {
    return new Date();
  }
}

/**
 * Reset virtual time offset
 */
export function resetVirtualTime() {
  localStorage.removeItem(TIME_KEY);
}

/**
 * Get or initialize the predictive model state
 */
export function getPredictionModel() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[ZET-5 Model] Failed to load prediction state:', e);
  }

  // Fallback: Initialize with baseline
  const state = {
    hourlySignature: [...BASELINE_HOURLY_SIGNATURE],
    hourlyAccumulator: Array(24).fill(0),
    sampleCount: Array(24).fill(0),
    lastModelUpdate: Date.now(),
  };
  savePredictionModel(state);
  return state;
}

/**
 * Save model state to localStorage
 */
function savePredictionModel(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Record a real-time observation (called on every ticker update, e.g. 1.5s)
 * Aggregates power readings into the current hour's bin.
 * 
 * @param {number} totalRealW - Real power right now in Watts
 */
export function recordObservation(totalRealW) {
  const model = getPredictionModel();
  const now = getVirtualTime();
  const currentHour = now.getHours();

  // Convert Watts to kW
  const kw = totalRealW / 1000;
  
  // Calculate exact delta:
  const elapsedMs = Date.now() - model.lastModelUpdate;
  const elapsedHours = Math.max(0.0001, elapsedMs / (1000 * 60 * 60));

  const kwhObserved = kw * elapsedHours;

  model.hourlyAccumulator[currentHour] += kwhObserved;
  model.sampleCount[currentHour] += 1;
  model.lastModelUpdate = Date.now();

  // If we cross into a new hour, we complete the online learning update for the previous hour
  const checkHour = getVirtualTime().getHours();
  if (checkHour !== currentHour) {
    const prevHour = currentHour;
    if (model.sampleCount[prevHour] > 0) {
      // Hourly consumption = average rate * 1 hour
      const observedKwh = model.hourlyAccumulator[prevHour];
      
      // Apply Exponential Moving Average (online learning)
      model.hourlySignature[prevHour] = 
        (1 - ALPHA) * model.hourlySignature[prevHour] + ALPHA * observedKwh;

      // Reset accumulators for the hour we just learned
      model.hourlyAccumulator[prevHour] = 0;
      model.sampleCount[prevHour] = 0;
    }
  }

  savePredictionModel(model);
}

/**
 * Force-simulate hourly progress to execute an instant learning tick.
 * This is used for fast-forwarding time in front of the panel!
 * 
 * @param {number} hoursToAdvance - number of hours to jump (e.g. 1, 24)
 * @param {number} averagePowerW - average wattage during that period (e.g. 1500W)
 */
export function simulateIntervalProgress(hoursToAdvance, averagePowerW) {
  const model = getPredictionModel();
  let timeCursor = getVirtualTime();
  
  const kw = averagePowerW / 1000;
  const kwhPerHour = kw * 1.0; // 1 hour elapsed

  // Step through each hour artificially to trigger online updates
  for (let i = 0; i < hoursToAdvance; i++) {
    const hour = timeCursor.getHours();
    
    // Simulate active appliance consumption for that hour
    // Add variance to simulate dynamic real-world fluctuations
    const variance = (Math.random() - 0.5) * 0.15; // +/- 7.5%
    const simulatedKwh = Math.max(0.05, kwhPerHour + variance);

    // Apply online exponential moving average update
    model.hourlySignature[hour] = (1 - ALPHA) * model.hourlySignature[hour] + ALPHA * simulatedKwh;
    
    // Advance virtual clock cursor by 1 hour
    timeCursor = new Date(timeCursor.getTime() + 60 * 60 * 1000);
  }

  // Advance global system clock offset
  advanceVirtualTime(hoursToAdvance);

  model.lastModelUpdate = Date.now();
  // Clear real-time accumulators
  model.hourlyAccumulator = Array(24).fill(0);
  model.sampleCount = Array(24).fill(0);

  savePredictionModel(model);
}

/**
 * Iterative Forecasting Engine
 * Steps forward hour-by-hour to calculate exactly when the prepaid tokens will run out.
 * 
 * @param {number} kwhRemaining - Current remaining token units (kWh)
 * @param {number} targetDaysGoal - Duration goal from setup (e.g. 21 days)
 * @returns {object} Forecast metrics:
 */
export function calculateForecast(kwhRemaining, targetDaysGoal) {
  const model = getPredictionModel();
  
  let tempKwh = kwhRemaining;
  let hoursCount = 0;
  
  const now = getVirtualTime();
  let currentHour = now.getHours();
  
  // Safeguard against dividing by zero or negative tokens
  if (tempKwh <= 0) {
    return {
      hoursRemaining: 0,
      daysRemaining: 0,
      depletionDate: now.toISOString(),
      atRisk: true,
      projectedDailyKwh: 0,
    };
  }

  // Iteratively deduct hourly signature loads until units run out
  while (tempKwh > 0 && hoursCount < 8760) {
    const hourToDeduct = (currentHour + hoursCount) % 24;
    const loadSignature = model.hourlySignature[hourToDeduct] || 0.35; // Fallback to 0.35 kWh if zeroed
    
    tempKwh -= loadSignature;
    hoursCount++;
  }

  const daysRemaining = hoursCount / 24;
  const depletionDate = new Date(now.getTime() + hoursCount * 60 * 60 * 1000);
  
  // Calculate Target Goal Date
  const goalDate = new Date(now.getTime() + targetDaysGoal * 24 * 60 * 60 * 1000);
  const atRisk = depletionDate < goalDate;

  // Calculate Average Daily Consumption based on entire 24h signature
  const signatureDailySum = model.hourlySignature.reduce((sum, val) => sum + val, 0);

  return {
    hoursRemaining: Math.round(hoursCount),
    daysRemaining: Math.max(0, parseFloat(daysRemaining.toFixed(1))),
    depletionDate: depletionDate.toISOString(),
    atRisk,
    projectedDailyKwh: signatureDailySum.toFixed(2),
  };
}

/**
 * Reset prediction engine baseline (e.g., when resetting system)
 */
export function resetPredictionModel() {
  localStorage.removeItem(STORAGE_KEY);
  resetVirtualTime();
}
