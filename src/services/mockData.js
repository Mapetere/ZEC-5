/**
 * ZET-5 Mock Data Generator — Final Build
 * - Moving average smoothing on all 5 sensor feeds
 * - Daily averages database (localStorage)
 * - Inject 7-day history for fast-forward testing
 * - Phase-aware + threshold-aware alert generation
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

// ===== Daily Averages Database (localStorage) =====

const DAILY_AVG_KEY = 'zet5_daily_averages';

export function getDailyAverages() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_AVG_KEY)) || [];
  } catch { return []; }
}

export function storeDailyAverage(sensors) {
  const today = new Date().toISOString().split('T')[0];
  const existing = getDailyAverages();
  const todayEntry = existing.find(e => e.date === today);

  if (todayEntry) {
    // Update running average for today
    todayEntry.count = (todayEntry.count || 1) + 1;
    todayEntry.sensors = todayEntry.sensors.map((avg, i) => {
      const prev = avg * (todayEntry.count - 1);
      return parseFloat(((prev + (sensors[i] || 0)) / todayEntry.count).toFixed(3));
    });
  } else {
    existing.push({
      date: today,
      sensors: sensors.map(s => parseFloat((s || 0).toFixed(3))),
      count: 1,
    });
  }

  // Keep last 90 days
  const trimmed = existing.slice(-90);
  localStorage.setItem(DAILY_AVG_KEY, JSON.stringify(trimmed));
  return trimmed;
}

/**
 * Inject 7 days of synthetic history for fast-forward testing.
 * Sets calibrationStart to 8 days ago in setup data.
 */
export function inject7DayHistory() {
  const days = [];
  for (let d = 7; d >= 1; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    days.push({
      date: date.toISOString().split('T')[0],
      sensors: SENSOR_PROFILES.map(p => {
        const variance = (Math.random() - 0.5) * p.variance * 2;
        return parseFloat((p.base + variance).toFixed(3));
      }),
      count: 960, // ~1 reading per 1.5s for 24h
    });
  }
  localStorage.setItem(DAILY_AVG_KEY, JSON.stringify(days));

  // Update calibration start to 8 days ago
  try {
    const setup = JSON.parse(localStorage.getItem('zet5_setup'));
    if (setup) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 8);
      setup.calibrationStart = pastDate.toISOString();
      localStorage.setItem('zet5_setup', JSON.stringify(setup));
    }
  } catch { /* ignore */ }

  return days;
}

/**
 * Check if house is vacant (near-zero current across all sensors).
 * If all daily averages for the last 3 days are below 0.1A total,
 * the house is considered vacant and any duration goal is "Achievable".
 */
export function isHouseVacant() {
  const avgs = getDailyAverages();
  if (avgs.length < 1) return false;
  const recent = avgs.slice(-3);
  return recent.every(day => {
    const total = day.sensors.reduce((s, v) => s + v, 0);
    return total < 0.1;
  });
}

// ===== Alert Generation =====

export function generateAlerts(sensors, profiles, tokenState) {
  const alerts = [];

  if (!tokenState || !tokenState.isPhase2) {
    return [{
      id: 'learning',
      type: 'info',
      title: 'Learning Phase Active',
      message: 'Collecting behavioral data. Intelligent recommendations will activate after the learning period.',
      time: 'Now',
      actionable: false,
    }];
  }

  // Only generate if below user-configured threshold (Condition A)
  // AND depletion trend shows risk (Condition B)
  if (!tokenState.belowThreshold && !tokenState.atRisk) {
    return [{
      id: 'nominal',
      type: 'info',
      title: 'System Nominal',
      message: 'Consumption within target parameters. No intervention required.',
      time: 'Now',
      actionable: false,
    }];
  }

  // Only recommend if depletion trend predicts running out before target date
  if (tokenState.atRisk) {
    const MAINS_V = 230;
    sensors.forEach((val, i) => {
      const p = profiles[i] || SENSOR_PROFILES[i];
      const name = p.name || `Sensor ${i + 1}`;
      const watts = val * MAINS_V;
      const baselineWatts = p.base * MAINS_V;

      if (watts > baselineWatts * 1.1) {
        const excessKwh = ((watts - baselineWatts) * 8) / 1000;
        const hoursSaved = tokenState.dailyUsage > 0
          ? Math.round(excessKwh / (tokenState.dailyUsage / 24) * 10) / 10
          : 0;

        alerts.push({
          id: `trend-${i}`,
          type: 'warning',
          title: `${name} | Depletion Trend Risk`,
          message: `${name} drawing ${watts.toFixed(0)}W (baseline ${baselineWatts.toFixed(0)}W). At current rate, tokens will deplete before target date. Shedding this load could extend runway by ~${hoursSaved} hours.`,
          time: 'Now',
          actionable: true,
          relayIndex: i < 8 ? i : null,
          sensorName: name,
          currentDraw: val,
          baseline: p.base,
        });
      }
    });
  }

  if (tokenState.isEmergency) {
    alerts.unshift({
      id: 'emergency',
      type: 'danger',
      title: 'Critical Token Level',
      message: `Remaining: ${tokenState.kwhRemaining} kWh. Enter Emergency Mode to activate survival strategies.`,
      time: 'Now',
      actionable: false,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'nominal',
      type: 'info',
      title: 'System Nominal',
      message: 'All loads within expected range. Depletion trend is stable.',
      time: 'Now',
      actionable: false,
    });
  }

  return alerts;
}
