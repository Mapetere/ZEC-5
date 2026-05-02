/**
 * ZEC-5 Mock Data Generator — Final Build
 * - Moving average smoothing on all 5 sensor feeds
 * - Stable appliance signatures (no random spikes)
 * - Token depletion and phase-aware alert generation
 */

const SENSOR_PROFILES = [
  { name: 'Fridge', base: 1.2, variance: 0.08 },
  { name: 'Geyser', base: 3.8, variance: 0.15 },
  { name: 'Borehole', base: 2.1, variance: 0.10 },
  { name: 'Entertainment', base: 0.6, variance: 0.05 },
  { name: 'Lighting', base: 0.4, variance: 0.03 },
];

const MOVING_AVG_WINDOW = 8;
let intervalId = null;
let rawHistory = [[], [], [], [], []];
let smoothedHistory = [[], [], [], [], []];
const MAX_HISTORY = 60;
let tickCount = 0;

function generateRawValue(profile) {
  // Gentle sine-wave variation, no spikes
  const drift = Math.sin(tickCount * 0.1 + profile.base) * profile.variance;
  const noise = (Math.random() - 0.5) * profile.variance * 0.3;
  return Math.max(0, parseFloat((profile.base + drift + noise).toFixed(3)));
}

function movingAverage(arr, window) {
  if (arr.length === 0) return 0;
  const slice = arr.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function startMockStream(onData, intervalMs = 1500) {
  const relays = [false, false, false, false, false, false, false, false];
  tickCount = 0;

  intervalId = setInterval(() => {
    tickCount++;
    const sensors = SENSOR_PROFILES.map((p, i) => {
      const raw = generateRawValue(p);
      rawHistory[i].push(raw);
      if (rawHistory[i].length > MAX_HISTORY) rawHistory[i].shift();

      const smoothed = parseFloat(movingAverage(rawHistory[i], MOVING_AVG_WINDOW).toFixed(2));
      smoothedHistory[i].push(smoothed);
      if (smoothedHistory[i].length > MAX_HISTORY) smoothedHistory[i].shift();

      return smoothed;
    });

    onData({
      sensors,
      relays: [...relays],
      history: smoothedHistory.map(h => [...h]),
      tickCount,
    });
  }, intervalMs);

  // Initial data point
  tickCount++;
  const sensors = SENSOR_PROFILES.map((p, i) => {
    const raw = generateRawValue(p);
    rawHistory[i].push(raw);
    const smoothed = parseFloat(movingAverage(rawHistory[i], MOVING_AVG_WINDOW).toFixed(2));
    smoothedHistory[i].push(smoothed);
    return smoothed;
  });
  onData({
    sensors,
    relays: [...relays],
    history: smoothedHistory.map(h => [...h]),
    tickCount: 1,
  });

  return {
    stop: () => { clearInterval(intervalId); rawHistory = [[], [], [], [], []]; smoothedHistory = [[], [], [], [], []]; tickCount = 0; },
    toggleRelay: (index, state) => { relays[index] = state; },
  };
}

export function getSensorProfiles() {
  return SENSOR_PROFILES;
}

/**
 * Generate alerts — Phase 2 only (post Day 7).
 * Condition A: Only when remaining tokens < threshold (50%)
 * Condition B: Only when projected depletion is before target date
 */
export function generateAlerts(sensors, profiles, tokenState) {
  const alerts = [];

  if (!tokenState || !tokenState.isPhase2) {
    return [{
      id: `learning-${Date.now()}`,
      type: 'info',
      title: 'Learning Phase Active',
      message: 'Collecting behavioral data. Intelligent recommendations will activate after the learning period.',
      time: 'Now',
      actionable: false,
    }];
  }

  // Only generate alerts if below threshold (Condition A)
  if (!tokenState.belowThreshold && !tokenState.atRisk) {
    return [{
      id: `nominal-${Date.now()}`,
      type: 'info',
      title: 'System Nominal',
      message: 'Consumption is within target parameters. No intervention required.',
      time: 'Now',
      actionable: false,
    }];
  }

  sensors.forEach((val, i) => {
    const p = profiles[i] || SENSOR_PROFILES[i];
    const name = p.name || `Sensor ${i + 1}`;

    if (val > p.base * 1.3 && tokenState.atRisk) {
      alerts.push({
        id: `advice-${i}-${Date.now()}`,
        type: 'warning',
        title: `${name} | Above Baseline`,
        message: `${name} is drawing ${val.toFixed(2)}A (baseline: ${p.base}A). Reducing this load would extend your token runway by approximately ${Math.round((val - p.base) * 230 * 8 / tokenState.dailyUsage * tokenState.daysRemaining * 0.1)} hours.`,
        time: 'Now',
        actionable: true,
        relayIndex: i < 8 ? i : null,
        sensorName: name,
        currentDraw: val,
        baseline: p.base,
      });
    }
  });

  if (tokenState.isEmergency) {
    alerts.unshift({
      id: `emergency-${Date.now()}`,
      type: 'danger',
      title: 'Critical Token Level',
      message: `Remaining energy: ${tokenState.kwhRemaining} kWh. Enter Emergency Mode to activate power budgeting strategies.`,
      time: 'Now',
      actionable: false,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `nominal-${Date.now()}`,
      type: 'info',
      title: 'System Nominal',
      message: 'All loads within expected range.',
      time: 'Now',
      actionable: false,
    });
  }

  return alerts;
}
