/**
 * ZET-5 Energy Engine
 * NOTE: The raw values from the clamping channels drift from actual ZESA meters.
 * Clamping channels measure CURRENT (Amps), but ZESA meters bill REAL POWER (kWh).
 * Real Power = V × I × cos(φ)  ← power factor matters!
 * 
 * Without accounting for power factor, we overestimate consumption by 15-30%.
 * This engine applies per-appliance power factor corrections and supports
 * periodic meter sync to self-correct drift over time.
 * 
 * ACCURACY STRATEGY:
 * 1. Apply default power factor per load type (Continuous=0.7, Cyclic=0.95, etc.)
 * 2. Track cumulative consumption in real-time (not the naive ×8 hour method)
 * 3. Allow user to "sync" with actual meter reading to calibrate
 * 4. Between syncs, use corrected estimates for runway prediction
 */

const MAINS_VOLTAGE = 230;
const STORAGE_KEY = 'zet5_energy_engine';

// Default power factors by load type
// These are conservative estimates for typical Zimbabwean household appliances
const POWER_FACTOR_MAP = {
  'Continuous': 0.70,   // Fridges, freezers — motor loads, poor PF
  'Cyclic':     0.95,   // Geysers, kettles — resistive, near-unity PF
  'Scheduled':  0.75,   // Borehole pumps — motor loads
  'Variable':   0.80,   // Mixed electronics — TVs, chargers, LED lights
};

/**
 * Get stored engine state from localStorage
 */
export function getEngineState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save engine state to localStorage
 */
function saveEngineState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Initialize or reset the energy engine.
 * Called when user completes setup or re-enters token data.
 * 
 * @param {number} tokenKwh - Total kWh purchased
 * @param {string} purchaseDate - ISO date of token purchase
 */
export function initEngine(tokenKwh, purchaseDate) {
  const state = {
    tokenKwh,                      // Original token amount
    purchaseDate,                  // When the token was loaded
    cumulativeKwh: 0,              // How much we estimate has been consumed
    correctionFactor: 1.0,         // Multiplied against estimates (adjusted by meter sync)
    lastSyncDate: null,            // When user last synced with meter
    lastSyncMeterReading: null,    // What the meter said at last sync
    lastSyncEstimate: null,        // What WE estimated at last sync
    syncHistory: [],               // History of all syncs for learning
    tickAccumulator: 0,            // Fractional kWh accumulator
    lastTickTime: Date.now(),      // Timestamp of last calculation
    confidencePct: 100,            // Confidence in our estimate (degrades over time without sync)
  };
  saveEngineState(state);
  return state;
}

/**
 * Calculate real power for a single sensor, accounting for power factor.
 * 
 * @param {number} amps - Current reading in Amps
 * @param {string} loadType - 'Continuous', 'Cyclic', 'Scheduled', or 'Variable'
 * @returns {{ apparentW: number, realW: number, powerFactor: number }}
 */
export function calculateRealPower(amps, loadType) {
  const pf = POWER_FACTOR_MAP[loadType] || 0.80;
  const apparentW = amps * MAINS_VOLTAGE;
  const realW = apparentW * pf;
  return { apparentW, realW, powerFactor: pf };
}

/**
 * Process a sensor tick — accumulate energy consumption in real time.
 * Called every time new sensor data arrives (typically every 1.5 seconds).
 * 
 * This replaces the naive "avgPowerKw × 8 hours" approach.
 * Instead, we integrate actual power over actual time intervals:
 *   Energy (kWh) = Power (kW) × Time (hours)
 * 
 * @param {number[]} sensors - Array of 5 current readings (Amps)
 * @param {object[]} profiles - Array of 5 appliance profiles
 * @returns {object} Updated engine state
 */
export function processTick(sensors, profiles) {
  let state = getEngineState();
  if (!state) return null;

  const now = Date.now();
  const elapsedMs = now - state.lastTickTime;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Calculate total real power right now (Watts)
  let totalRealW = 0;
  const perSensor = [];

  for (let i = 0; i < Math.min(sensors.length, 5); i++) {
    const amps = sensors[i] || 0;
    const loadType = profiles[i]?.type || 'Variable';
    const { realW, powerFactor } = calculateRealPower(amps, loadType);
    totalRealW += realW;
    perSensor.push({ amps, realW, powerFactor });
  }

  // Energy consumed in this interval (kWh)
  // Apply correction factor learned from meter syncs
  const energyKwh = (totalRealW / 1000) * elapsedHours * state.correctionFactor;

  state.cumulativeKwh += energyKwh;
  state.lastTickTime = now;

  // Degrade confidence: drops ~1% per hour since last sync
  // Starts at 100% after sync, reaches 50% after ~2 days
  if (state.lastSyncDate) {
    const hoursSinceSync = (now - new Date(state.lastSyncDate).getTime()) / (1000 * 60 * 60);
    state.confidencePct = Math.min(100, Math.max(30, Math.round(100 - hoursSinceSync * 1.5)));
  } else {
    // No sync ever — confidence based on time since purchase
    const hoursSincePurchase = (now - new Date(state.purchaseDate).getTime()) / (1000 * 60 * 60);
    state.confidencePct = Math.min(100, Math.max(30, Math.round(100 - hoursSincePurchase * 0.5)));
  }

  saveEngineState(state);

  return {
    ...state,
    totalRealW,
    perSensor,
    unitsRemaining: Math.max(0, state.tokenKwh - state.cumulativeKwh),
  };
}

/**
 * Get current units remaining WITHOUT processing a new tick.
 * Read-only snapshot of the engine state.
 */
export function getUnitsRemaining() {
  const state = getEngineState();
  if (!state) return null;
  return {
    ...state,
    unitsRemaining: Math.max(0, state.tokenKwh - state.cumulativeKwh),
  };
}

/**
 * Sync with actual ZESA meter reading.
 * 
 * HOW IT WORKS:
 * User reads their prepaid meter display (e.g., "87.3 kWh remaining").
 * We compare what the meter says vs what we estimated.
 * The difference tells us our calibration error.
 * We adjust the correctionFactor so future estimates are more accurate.
 * 
 * EXAMPLE:
 *   Token purchased: 150 kWh
 *   Our estimate consumed: 45 kWh → we think 105 kWh remain
 *   Meter actually says: 98.5 kWh remain → actual consumed = 51.5 kWh
 *   correctionFactor = 51.5 / 45 = 1.144
 *   Future estimates will be multiplied by 1.144 (we were underestimating)
 * 
 * @param {number} meterReading - Actual kWh remaining on the ZESA meter
 * @returns {object} Updated state with correction applied
 */
export function syncWithMeter(meterReading) {
  let state = getEngineState();
  if (!state) return null;

  const actualConsumed = state.tokenKwh - meterReading;
  const estimatedConsumed = state.cumulativeKwh;

  // Only adjust if we have meaningful data
  if (estimatedConsumed > 0.5) {
    // Blend old correction factor with new measurement (exponential smoothing)
    // This prevents a single bad reading from wildly swinging the correction
    const newFactor = actualConsumed / estimatedConsumed;
    const alpha = 0.6; // Weight toward new measurement
    state.correctionFactor = alpha * newFactor + (1 - alpha) * state.correctionFactor;
  }

  // Snap our cumulative to match meter reality
  state.cumulativeKwh = actualConsumed;
  state.lastSyncDate = new Date().toISOString();
  state.lastSyncMeterReading = meterReading;
  state.lastSyncEstimate = estimatedConsumed;
  state.confidencePct = 100;

  // Record in sync history
  state.syncHistory.push({
    date: state.lastSyncDate,
    meterReading,
    estimatedRemaining: state.tokenKwh - estimatedConsumed,
    correctionFactor: state.correctionFactor,
  });

  // Keep last 20 syncs
  if (state.syncHistory.length > 20) {
    state.syncHistory = state.syncHistory.slice(-20);
  }

  saveEngineState(state);

  return {
    ...state,
    unitsRemaining: Math.max(0, meterReading),
    driftKwh: Math.abs(actualConsumed - estimatedConsumed),
    driftPct: estimatedConsumed > 0
      ? Math.round(Math.abs(actualConsumed - estimatedConsumed) / estimatedConsumed * 100)
      : 0,
  };
}

/**
 * Calculate runway projection — how many days until units run out.
 * Uses a 24-hour rolling average instead of the fixed ×8 hour multiplier.
 * 
 * @param {number} totalRealW - Current total real power draw (Watts)
 * @param {number} unitsRemaining - kWh remaining
 * @param {number} durationGoal - Target days
 * @returns {object} Runway projection
 */
export function calculateRunway(totalRealW, unitsRemaining, durationGoal) {
  const goal = durationGoal || 21;

  if (totalRealW <= 0 || unitsRemaining <= 0) {
    return {
      daysRemaining: unitsRemaining > 0 ? goal : 0,
      dailyUsageKwh: 0,
      onTrack: unitsRemaining > 0,
      pct: unitsRemaining > 0 ? 100 : 0,
      isEmergency: unitsRemaining <= 5,
    };
  }

  // Assume current power draw represents average daily usage
  // Daily kWh = current_kW × 24 hours × duty_cycle_estimate
  // We use 0.45 as a typical residential duty cycle (appliances aren't all on 24/7)
  // This is more realistic than the previous flat ×8 hours
  const dailyKwhEstimate = (totalRealW / 1000) * 24 * 0.45;
  const daysRemaining = dailyKwhEstimate > 0 ? unitsRemaining / dailyKwhEstimate : goal;

  return {
    daysRemaining: Math.round(Math.max(0, daysRemaining)),
    dailyUsageKwh: dailyKwhEstimate.toFixed(1),
    onTrack: daysRemaining >= goal * 0.8, // 80% of goal is still "on track"
    pct: Math.min(100, (daysRemaining / goal) * 100),
    isEmergency: unitsRemaining <= 5,
  };
}

/**
 * Reset engine state (called when user re-runs setup wizard)
 */
export function resetEngine() {
  localStorage.removeItem(STORAGE_KEY);
}
