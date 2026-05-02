import { useMemo } from 'react';
import Chart from 'react-apexcharts';

/**
 * Dashboard v2.0 — Behavioral monitoring with:
 * - Energy Runway countdown
 * - Hardware Health Check
 * - 7-day Calibration Progress
 * - 5 sensor gauges + charts
 * - Inference alerts
 */
export default function Dashboard({
  sensors, history, alerts, profiles, onShedLoad,
  tokenData, durationGoal, calibrationStart, onOpenAdvice, onHardwareFault
}) {
  // ─── Energy Runway Calculation ───
  const runway = useMemo(() => {
    if (!tokenData || !tokenData.kwh) return null;
    const purchaseDate = new Date(tokenData.date);
    const now = new Date();
    const daysSincePurchase = Math.max(1, (now - purchaseDate) / (1000 * 60 * 60 * 24));

    // Total current draw across all sensors (Amps) → approximate power at 230V
    const totalAmps = (sensors || []).reduce((s, v) => s + (v || 0), 0);
    const avgPowerKw = (totalAmps * 230) / 1000; // kW
    const dailyUsageKwh = avgPowerKw * 8; // assume ~8 active hours/day
    const kwhRemaining = Math.max(0, tokenData.kwh - (dailyUsageKwh * daysSincePurchase));
    const daysRemaining = dailyUsageKwh > 0 ? Math.max(0, kwhRemaining / dailyUsageKwh) : tokenData.kwh;
    const goal = durationGoal || 21;
    const onTrack = daysRemaining >= (goal - daysSincePurchase);

    return {
      kwhRemaining: kwhRemaining.toFixed(1),
      daysRemaining: Math.round(daysRemaining),
      dailyUsage: dailyUsageKwh.toFixed(1),
      daysSincePurchase: Math.round(daysSincePurchase),
      goal,
      onTrack,
      pct: Math.min(100, (daysRemaining / goal) * 100),
    };
  }, [tokenData, sensors, durationGoal]);

  // ─── Calibration Progress ───
  const calibration = useMemo(() => {
    if (!calibrationStart) return { day: 0, pct: 0, complete: false };
    const start = new Date(calibrationStart);
    const now = new Date();
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    const day = Math.min(7, Math.floor(elapsed));
    return { day, pct: Math.min(100, (elapsed / 7) * 100), complete: elapsed >= 7 };
  }, [calibrationStart]);

  // ─── Sensor Cards ───
  const sensorCards = useMemo(() => {
    return (profiles || []).slice(0, 5).map((p, i) => {
      const raw = sensors?.[i];
      const isNull = raw === null || raw === undefined;
      const val = isNull ? 0 : raw;
      const pct = Math.min((val / (p.base * 3)) * 100, 100);
      const level = val > p.base * 2 ? 'danger' : val > p.base * 1.5 ? 'warning' : 'normal';
      return { ...p, val, pct, level, index: i, isNull };
    });
  }, [sensors, profiles]);

  // ─── Check for null sensors ───
  const nullSensors = sensorCards.filter(s => s.isNull);
  if (nullSensors.length > 0 && onHardwareFault) {
    // Trigger on first null sensor found
    const first = nullSensors[0];
    setTimeout(() => onHardwareFault(first.index, first.name), 0);
  }

  // ─── Chart config ───
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 600 },
    },
    grid: {
      borderColor: '#1E2738',
      strokeDashArray: 4,
      padding: { top: 0, right: 4, bottom: 0, left: 4 },
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#5A6478', fontSize: '10px', fontFamily: 'Orbitron' },
        formatter: (v) => v.toFixed(1),
      },
      min: 0,
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] },
    },
    tooltip: { theme: 'dark', y: { formatter: (v) => `${v.toFixed(2)} A` } },
    colors: ['#00E5FF'],
    dataLabels: { enabled: false },
    legend: { show: false },
  }), []);

  return (
    <div className="fade-in">
      {/* ── Top Status Row: Runway + Calibration ── */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {/* Energy Runway */}
        <div className="card runway-card">
          <div className="card-header">
            <span className="card-title">Energy Runway</span>
            {runway && (
              <span className={`card-badge ${runway.onTrack ? '' : 'badge-warning'}`}>
                {runway.onTrack ? '✓ On Track' : '⚠ Off Track'}
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
              <div className="runway-bar-track">
                <div
                  className={`runway-bar-fill ${runway.pct < 30 ? 'danger' : runway.pct < 60 ? 'warning' : ''}`}
                  style={{ width: `${runway.pct}%` }}
                />
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No token data configured.</p>
          )}
        </div>

        {/* Calibration + Hardware */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">System Status</span>
          </div>
          {/* Calibration */}
          <div className="calibration-section">
            <div className="calibration-header">
              <span className="calibration-label">
                {calibration.complete ? '✓ Calibration Complete' : `Calibration Phase — Day ${calibration.day}/7`}
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
                ? 'Learning model active. Behavioral baselines established.'
                : 'ZEC-5 is learning your usage patterns. Full inference available after 7 days.'}
            </p>
          </div>
          {/* Hardware Health */}
          <div className="hw-health">
            <div className="hw-health-label">Hardware Health</div>
            <div className="hw-health-grid">
              {sensorCards.map(s => (
                <div
                  key={s.index}
                  className={`hw-dot ${s.isNull ? 'fault' : 'ok'}`}
                  title={`${s.name}: ${s.isNull ? 'FAULT' : 'OK'}`}
                >
                  S{s.index + 1}
                </div>
              ))}
            </div>
          </div>
          {/* Smart Advice trigger */}
          <button className="advice-trigger-btn" onClick={onOpenAdvice} id="open-advice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Smart Advice
            {(alerts || []).filter(a => a.type !== 'info').length > 0 && (
              <span className="advice-count">{(alerts || []).filter(a => a.type !== 'info').length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Sensor Gauge Cards ── */}
      <div className="section-title"><span className="dot" /> Live Sensor Feeds</div>
      <div className="dashboard-grid three-col" style={{ marginBottom: 28 }}>
        {sensorCards.map((s) => (
          <div key={s.index} className={`card gauge-card ${s.isNull ? 'fault-card' : ''}`}>
            <div className="card-header">
              <span className="card-title">{s.name}</span>
              <span className={`card-badge ${s.isNull ? 'badge-fault' : ''}`}>
                {s.isNull ? '⚠ FAULT' : `CH ${s.index + 1}`}
              </span>
            </div>
            <div className="gauge-value">
              {s.isNull ? '--' : s.val.toFixed(2)}
              <span className="unit">A</span>
            </div>
            <div className="gauge-bar-track">
              <div
                className={`gauge-bar-fill ${s.level}`}
                style={{ width: s.isNull ? '0%' : `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Line Chart ── */}
      <div className="section-title"><span className="dot" /> Energy Fingerprints</div>
      <div className="card full-width" style={{ marginBottom: 28 }}>
        <Chart
          type="area"
          height={260}
          options={{
            ...chartOptions,
            colors: ['#00E5FF', '#39FF14', '#FFB300', '#FF3D00', '#9C27B0'],
            legend: {
              show: true, position: 'top', horizontalAlign: 'right',
              labels: { colors: '#8892A4' }, fontFamily: 'Inter', fontSize: '11px',
            },
          }}
          series={(profiles || []).slice(0, 5).map((p, i) => ({
            name: p.name,
            data: history?.[i] || [],
          }))}
        />
      </div>

      {/* ── Inference / Alerts ── */}
      <div className="section-title"><span className="dot" /> Inference Engine</div>
      <div className="alerts-section">
        {(alerts || []).map((a) => (
          <div key={a.id} className={`alert-item ${a.type} slide-in`}>
            <div className="alert-icon">
              {a.type === 'danger' ? '⚠' : a.type === 'warning' ? '⚡' : 'ℹ'}
            </div>
            <div className="alert-text">
              <h4>{a.title}</h4>
              <p>{a.message}</p>
            </div>
            <span className="alert-time">{a.time}</span>
            {a.actionable && (
              <button
                className="alert-action"
                onClick={() => onShedLoad && onShedLoad(a.relayIndex)}
                id={`alert-shed-${a.relayIndex}`}
              >
                Shed Load
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
