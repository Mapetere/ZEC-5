/**
 * ZEC-5 Mock Data Generator
 * Simulates ESP32 sensor stream and relay states for development / demo.
 */

const SENSOR_PROFILES = [
  { name: 'Fridge', base: 1.2, variance: 0.3, spikeProbability: 0.02, spikeMultiplier: 3 },
  { name: 'Geyser', base: 3.8, variance: 0.8, spikeProbability: 0.05, spikeMultiplier: 2 },
  { name: 'Borehole', base: 2.1, variance: 0.5, spikeProbability: 0.03, spikeMultiplier: 2.5 },
  { name: 'Entertainment', base: 0.6, variance: 0.2, spikeProbability: 0.01, spikeMultiplier: 4 },
  { name: 'Lighting', base: 0.4, variance: 0.15, spikeProbability: 0.01, spikeMultiplier: 2 },
];

let intervalId = null;
let sensorHistory = [[], [], [], [], []];
const MAX_HISTORY = 60;

function generateSensorValue(profile) {
  let value = profile.base + (Math.random() - 0.5) * 2 * profile.variance;
  if (Math.random() < profile.spikeProbability) {
    value *= profile.spikeMultiplier;
  }
  return Math.max(0, parseFloat(value.toFixed(2)));
}

export function startMockStream(onData, intervalMs = 1500) {
  const relays = [false, false, false, false, false, false, false, false];

  intervalId = setInterval(() => {
    const sensors = SENSOR_PROFILES.map((p, i) => {
      const val = generateSensorValue(p);
      sensorHistory[i].push(val);
      if (sensorHistory[i].length > MAX_HISTORY) sensorHistory[i].shift();
      return val;
    });

    onData({ sensors, relays: [...relays], history: sensorHistory.map(h => [...h]) });
  }, intervalMs);

  // Initial burst
  const sensors = SENSOR_PROFILES.map((p, i) => {
    const val = generateSensorValue(p);
    sensorHistory[i].push(val);
    return val;
  });
  onData({ sensors, relays: [...relays], history: sensorHistory.map(h => [...h]) });

  return {
    stop: () => clearInterval(intervalId),
    toggleRelay: (index, state) => { relays[index] = state; },
  };
}

export function getSensorProfiles() {
  return SENSOR_PROFILES;
}

/** Generate inference alerts from current readings */
export function generateAlerts(sensors, profiles) {
  const alerts = [];
  sensors.forEach((val, i) => {
    const p = profiles[i] || SENSOR_PROFILES[i];
    const threshold = p.base * 1.5;
    const name = p.name || `Sensor ${i + 1}`;

    if (val > p.base * 2) {
      alerts.push({
        id: `danger-${i}-${Date.now()}`,
        type: 'danger',
        title: `${name} — Critical Load`,
        message: `Current draw is ${((val / p.base) * 100 - 100).toFixed(0)}% above baseline (${val}A vs ${p.base}A). Immediate shedding recommended.`,
        time: 'Just now',
        actionable: true,
        relayIndex: i < 8 ? i : null,
      });
    } else if (val > threshold) {
      alerts.push({
        id: `warn-${i}-${Date.now()}`,
        type: 'warning',
        title: `${name} — Elevated Activity`,
        message: `Pattern detected: ${name} activity is ${((val / p.base) * 100 - 100).toFixed(0)}% higher than baseline. Recommend manual shedding?`,
        time: 'Just now',
        actionable: true,
        relayIndex: i < 8 ? i : null,
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      id: `info-${Date.now()}`,
      type: 'info',
      title: 'System Nominal',
      message: 'All appliance loads are within expected operational parameters.',
      time: 'Just now',
      actionable: false,
    });
  }

  return alerts;
}
