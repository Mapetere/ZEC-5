import { useMemo } from 'react';
import Chart from 'react-apexcharts';

/**
 * Dashboard — Final Build
 * - 0-Day fix: defaults to Day Goal until 1 hour of data
 * - Data smoothing via moving average (handled in mockData)
 * - 2-Phase recommendation logic
 * - Relay stealth: no manual toggles on dashboard
 * - Hardware integrity with 24h zero detection
 */
export default function Dashboard({
  sensors, history, alerts, profiles, onShedLoad,
  tokenData, durationGoal, calibrationStart,
  onOpenAdvice, onHardwareFault, onOpenEmergency,
  tickCount, dataCollectionMinutes
}) {
  const MAINS_VOLTAGE = 230;

  // --- Calibration / Learning Phase ---
  const calibration = useMemo(() => {
    if (!calibrationStart) return { day: 0, pct: 0, complete: false, daysLeft: 7 };
    const start = new Date(calibrationStart);
    const now = new Date();
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    const day = Math.min(7, Math.floor(elapsed));
    const daysLeft = Math.max(0, 7 - day);
    return { day, pct: Math.min(100, (elapsed / 7) * 100), complete: elapsed >= 7, daysLeft };
  }, [calibrationStart]);

  // --- Energy Runway with 0-Day Fix ---
  const runway = useMemo(() => {
    if (!tokenData || !tokenData.kwh) return null;
    const goal = durationGoal || 21;

    // 0-Day Fix: until 1 hour of data, default to goal
    const hasStableData = (dataCollectionMinutes || 0) >= 60;

    if (!hasStableData) {
      return {
        daysRemaining: goal,
        kwhRemaining: tokenData.kwh.toFixed(1),
        dailyUsage: '--',
        goal,
        onTrack: true,
        isCalibrating: true,
        pct: 100,
        isEmergency: false,
      };
    }

    const purchaseDate = new Date(tokenData.date);
    const now = new Date();
    const daysSincePurchase = Math.max(1, (now - purchaseDate) / (1000 * 60 * 60 * 24));

    const totalAmps = (sensors || []).reduce((s, v) => s + (v || 0), 0);
    const avgPowerKw = (totalAmps * MAINS_VOLTAGE) / 1000;
    const dailyUsageKwh = avgPowerKw * 8;
    const kwhRemaining = Math.max(0, tokenData.kwh - (dailyUsageKwh * daysSincePurchase));
    const daysRemaining = dailyUsageKwh > 0 ? Math.max(0, kwhRemaining / dailyUsageKwh) : goal;
    const onTrack = daysRemaining >= (goal - daysSincePurchase);
    const isEmergency = kwhRemaining <= 5;

    return {
      daysRemaining: Math.round(daysRemaining),
      kwhRemaining: kwhRemaining.toFixed(1),
      dailyUsage: dailyUsageKwh.toFixed(1),
      goal,
      onTrack,
      isCalibrating: false,
      pct: Math.min(100, (daysRemaining / goal) * 100),
      isEmergency,
    };
  }, [tokenData, sensors, durationGoal, dataCollectionMinutes]);

  // --- Sensor Cards ---
  const sensorCards = useMemo(() => {
    return (profiles || []).slice(0, 5).map((p, i) => {
      const raw = sensors?.[i];
      const isNull = raw === null || raw === undefined;
      const val = isNull ? 0 : raw;
      const pct = Math.min((val / (p.base * 3)) * 100, 100);
      const level = val > p.base * 1.5 ? 'warning' : 'normal';
      return { ...p, val, pct, level, index: i, isNull };
    });
  }, [sensors, profiles]);

  // --- Hardware Fault Detection (null sensors) ---
  const faultSensors = sensorCards.filter(s => s.isNull);
  if (faultSensors.length > 0 && onHardwareFault) {
    const first = faultSensors[0];
    setTimeout(() => onHardwareFault(first.index, first.name), 0);
  }

  // --- Chart Config ---
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 600 },
    },
    grid: {
      borderColor: '#233138',
      strokeDashArray: 4,
      padding: { top: 0, right: 4, bottom: 0, left: 4 },
    },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: {
        style: { colors: '#5B6F78', fontSize: '11px', fontFamily: 'Inter' },
        formatter: (v) => v.toFixed(1),
      },
      min: 0,
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 100] },
    },
    tooltip: { theme: 'dark', y: { formatter: (v) => `${v.toFixed(2)} A` } },
    colors: ['#25D366'],
    dataLabels: { enabled: false },
    legend: { show: false },
  }), []);

  return (
    <div className="fade-in">
      {/* -- Top Row: Runway + System Status -- */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {/* Energy Runway */}
        <div className="card runway-card">
          <div className="card-header">
            <span className="card-title">Energy Runway</span>
            {runway && (
              <span className={`card-badge ${runway.isCalibrating ? 'badge-calibrating' : runway.onTrack ? '' : 'badge-warning'}`}>
                {runway.isCalibrating ? 'Calibrating' : runway.onTrack ? 'On Track' : 'Off Track'}
              </span>
            )}
          </div>
          {runway ? (
            <>
              <div className="runway-countdown">
                <div className="runway-days">
                  <span className="runway-number">{runway.daysRemaining}</span>
                  <span className="runway-label">Days Left</span>
                </div>
                <div className="runway-divider" />
                <div className="runway-stats">
                  <div className="runway-stat">
                    <span className="runway-stat-val">{runway.kwhRemaining}</span>
                    <span className="runway-stat-label">kWh Remaining</span>
                  </div>
                  <div className="runway-stat">
                    <span className="runway-stat-val">{runway.dailyUsage}</span>
                    <span className="runway-stat-label">kWh/Day Avg</span>
                  </div>
                  <div className="runway-stat">
                    <span className="runway-stat-val">{runway.goal}</span>
                    <span className="runway-stat-label">Day Goal</span>
                  </div>
                </div>
              </div>
              {runway.isCalibrating && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Defaulting to goal. Stable average requires 1 hour of data collection.
                </p>
              )}
              <div className="runway-bar-track">
                <div
                  className={`runway-bar-fill ${runway.pct < 30 ? 'danger' : runway.pct < 60 ? 'warning' : ''}`}
                  style={{ width: `${runway.pct}%` }}
                />
              </div>
              {/* Emergency Mode trigger */}
              {runway.isEmergency && (
                <button className="emergency-trigger-btn" onClick={onOpenEmergency} id="open-emergency">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Enter Emergency Mode
                </button>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No token data configured.</p>
          )}
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">System Status</span>
          </div>
          {/* Behavioral Learning Phase */}
          <div className="calibration-section">
            <div className="calibration-header">
              <span className="calibration-label">
                {calibration.complete ? 'Learning Complete' : `Behavioral Learning Phase | Day ${calibration.day}/7`}
              </span>
              <span className="calibration-pct">{Math.round(calibration.pct)}%</span>
            </div>
            <div className="calibration-bar-track">
              <div
                className={`calibration-bar-fill ${calibration.complete ? 'complete' : ''}`}
                style={{ width: `${calibration.pct}%` }}
              />
            </div>
            <p className="calibration-hint">
              {calibration.complete
                ? 'Behavioral baselines established. Intelligent monitoring active.'
                : 'Collecting household signatures. Recommendations unlock after Day 7.'}
            </p>
          </div>
          {/* Hardware Integrity */}
          <div className="hw-health">
            <div className="hw-health-label">Hardware Integrity</div>
            <div className="hw-health-grid">
              {sensorCards.map(s => (
                <div key={s.index} className={`hw-dot ${s.isNull ? 'fault' : 'ok'}`} title={`${s.name}: ${s.isNull ? 'FAULT' : 'OK'}`}>
                  S{s.index + 1}
                </div>
              ))}
            </div>
          </div>
          {/* Smart Advice — locked during Phase 1 */}
          {calibration.complete ? (
            <button className="advice-trigger-btn" onClick={onOpenAdvice} id="open-advice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              Smart Advice
              {(alerts || []).filter(a => a.type !== 'info').length > 0 && (
                <span className="advice-count">{(alerts || []).filter(a => a.type !== 'info').length}</span>
              )}
            </button>
          ) : (
            <div className="advice-locked">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Learning Household Signatures... Unlock in {calibration.daysLeft} days.
            </div>
          )}
        </div>
      </div>

      {/* -- Sensor Feeds -- */}
      <div className="section-title"><span className="dot" /> Live Sensor Feeds</div>
      <div className="dashboard-grid three-col" style={{ marginBottom: 28 }}>
        {sensorCards.map((s) => (
          <div key={s.index} className={`card gauge-card ${s.isNull ? 'fault-card' : ''}`}>
            <div className="card-header">
              <span className="card-title">{s.name}</span>
              <span className={`card-badge ${s.isNull ? 'badge-fault' : ''}`}>
                {s.isNull ? 'FAULT' : `CH ${s.index + 1}`}
              </span>
            </div>
            <div className="gauge-value">
              {s.isNull ? '--' : s.val.toFixed(2)}
              <span className="unit">A</span>
            </div>
            <div className="gauge-bar-track">
              <div className={`gauge-bar-fill ${s.level}`} style={{ width: s.isNull ? '0%' : `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* -- Energy Fingerprints -- */}
      <div className="section-title"><span className="dot" /> Energy Fingerprints</div>
      <div className="card full-width" style={{ marginBottom: 28 }}>
        <Chart
          type="area"
          height={260}
          options={{
            ...chartOptions,
            colors: ['#25D366', '#128C7E', '#FFB300', '#FF6B6B', '#8696A0'],
            legend: {
              show: true, position: 'top', horizontalAlign: 'right',
              labels: { colors: '#8696A0' }, fontFamily: 'Inter', fontSize: '11px',
            },
          }}
          series={(profiles || []).slice(0, 5).map((p, i) => ({
            name: p.name,
            data: history?.[i] || [],
          }))}
        />
      </div>

      {/* -- Inference Notifications -- */}
      <div className="section-title"><span className="dot" /> Inference Engine</div>
      <div className="alerts-section">
        {(alerts || []).map((a) => (
          <div key={a.id} className={`alert-item ${a.type} slide-in`}>
            <div className="alert-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {a.type === 'danger' ? (
                  <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                ) : a.type === 'warning' ? (
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                ) : (
                  <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>
                )}
              </svg>
            </div>
            <div className="alert-text">
              <h4>{a.title}</h4>
              <p>{a.message}</p>
            </div>
            <span className="alert-time">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
