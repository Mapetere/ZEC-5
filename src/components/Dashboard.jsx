import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { calculateRealPower, calculateRunway } from '../services/energyEngine.js';
import { getVirtualTime } from '../services/predictionEngine.js';
import RelayControl from './RelayControl.jsx';

/**
 * Dashboard — Rewired from scratch for clarity.
 * 
 * LAYOUT (top → bottom):
 * ┌──────────────────────┬──────────────────────┐
 * │  UNITS REMAINING     │  SYSTEM STATUS       │
 * │  (primary metric)    │  (learning + health)  │
 * ├──────────────────────┴──────────────────────┤
 * │  POWER BREAKDOWN (per-appliance real power)  │
 * ├──────────────────────────────────────────────┤
 * │  DAILY AVERAGES TABLE                        │
 * ├──────────────────────────────────────────────┤
 * │  LIVE SENSOR FEEDS (5 gauge cards)           │
 * ├──────────────────────────────────────────────┤
 * │  ENERGY FINGERPRINTS (time-series chart)     │
 * ├──────────────────────────────────────────────┤
 * │  INFERENCE ENGINE (alerts)                   │
 * └──────────────────────────────────────────────┘
 */
export default function Dashboard({
  sensors, history, alerts, profiles,
  tokenData, durationGoal, calibrationStart,
  onOpenAdvice, onOpenEmergency, onFastForward,
  onOpenMeterSync, onSimulateHours,
  tickCount, dataCollectionMinutes, dailyAverages, vacant, notifyThreshold,
  engineState, tokenState, gridBlackout, onToggleBlackout,
  onHardwareFault, onRedirectToRecharge,
  relays, onToggleRelay, showBreakdown, setShowBreakdown, activeScheduleId
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

  // --- Per-Appliance Power Breakdown (corrected for power factor) ---
  const powerBreakdown = useMemo(() => {
    if (!sensors || !profiles) return [];
    return profiles.slice(0, 5).map((p, i) => {
      const amps = sensors[i] || 0;
      const { apparentW, realW, powerFactor } = calculateRealPower(amps, p.type);
      return {
        name: p.name,
        type: p.type,
        amps,
        apparentW,
        realW,
        powerFactor,
        index: i,
      };
    });
  }, [sensors, profiles]);

  const totalRealW = powerBreakdown.reduce((s, p) => s + p.realW, 0);
  const totalApparentW = powerBreakdown.reduce((s, p) => s + p.apparentW, 0);

  // --- Units Remaining + Runway (from engine state or fallback) ---
  const unitsRemaining = engineState
    ? Math.max(0, engineState.tokenKwh - engineState.cumulativeKwh)
    : tokenData?.kwh || 0;

  const runway = useMemo(() => {
    if (!tokenData || !tokenData.kwh) return null;
    const goal = durationGoal || 21;
    const hasStableData = (dataCollectionMinutes || 0) >= 60;

    // Use our advanced forecast model if available
    if (tokenState) {
      return {
        daysRemaining: tokenState.daysRemaining,
        kwhRemaining: tokenState.kwhRemaining,
        dailyUsage: tokenState.dailyUsage,
        goal,
        onTrack: vacant ? true : !tokenState.atRisk,
        isCalibrating: false,
        pct: Math.min(100, (tokenState.daysRemaining / goal) * 100),
        isEmergency: vacant ? false : tokenState.isEmergency,
        depletionDate: tokenState.depletionDate,
        hoursRemaining: tokenState.hoursRemaining,
      };
    }

    if (!hasStableData) {
      return {
        daysRemaining: goal,
        kwhRemaining: unitsRemaining.toFixed(1),
        dailyUsage: '--',
        goal,
        onTrack: true,
        isCalibrating: true,
        pct: 100,
        isEmergency: false,
        depletionDate: null,
      };
    }

    const proj = calculateRunway(totalRealW, unitsRemaining, goal);
    return {
      daysRemaining: proj.daysRemaining,
      kwhRemaining: unitsRemaining.toFixed(1),
      dailyUsage: proj.dailyUsageKwh,
      goal,
      onTrack: vacant ? true : proj.onTrack,
      isCalibrating: false,
      pct: proj.pct,
      isEmergency: vacant ? false : proj.isEmergency,
      depletionDate: null,
    };
  }, [tokenData, totalRealW, unitsRemaining, durationGoal, dataCollectionMinutes, vacant, tokenState]);

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

  // --- Hardware Fault Detection ---
  const faultSensors = sensorCards.filter(s => s.isNull);
  if (faultSensors.length > 0 && onHardwareFault) {
    const first = faultSensors[0];
    setTimeout(() => onHardwareFault(first.index, first.name), 0);
  }

  // --- Chart Config ---
  const chartOptions = useMemo(() => ({
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent', animations: { enabled: true, easing: 'easeinout', speed: 600 } },
    grid: { borderColor: '#233138', strokeDashArray: 4, padding: { top: 0, right: 4, bottom: 0, left: 4 } },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#5B6F78', fontSize: '11px', fontFamily: 'Inter' }, formatter: (v) => v.toFixed(1) }, min: 0 },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 100] } },
    tooltip: { theme: 'dark', y: { formatter: (v) => `${v.toFixed(2)} A` } },
    colors: ['#25D366'], dataLabels: { enabled: false }, legend: { show: false },
  }), []);

  // --- Recent daily averages for display ---
  const recentDays = (dailyAverages || []).slice(-7);

  // --- Confidence indicator ---
  const confidence = engineState?.confidencePct || 100;
  const confidenceLabel = confidence >= 80 ? 'High' : confidence >= 50 ? 'Moderate' : 'Low';
  const confidenceColor = confidence >= 80 ? 'var(--accent-green)' : confidence >= 50 ? 'var(--warning-amber)' : 'var(--alert-red)';

  const beyondSavingThreshold = useMemo(() => {
    const dailyUsage = tokenState?.dailyUsage || 8.5;
    const typicalUsagePerHour = dailyUsage / 24;
    return Math.max(0.1, typicalUsagePerHour * 0.5); // 30 minutes of typical usage, minimum 0.1 kWh
  }, [tokenState]);

  const isBlackout = unitsRemaining <= beyondSavingThreshold;

  return (
    <div className="fade-in" style={{ position: 'relative' }}>
      {/* Complete Blackout Overlay (Instantly Darkness) */}
      {isBlackout && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 8, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          textAlign: 'center',
          padding: '40px 24px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 61, 0, 0.2)',
          minHeight: '500px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 61, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            color: 'var(--alert-red)',
            marginBottom: '24px',
            border: '2px solid rgba(255, 61, 0, 0.3)',
            animation: 'pulse 2s infinite'
          }}>
            <span style={{ fontWeight: 'bold' }}>!</span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '20px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--alert-red)',
            margin: '0 0 12px 0'
          }}>
            METER CUT-OFF: BLACKOUT ENGAGED
          </h2>
          <p style={{
            maxWidth: '440px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            margin: '0 0 32px 0'
          }}>
            Prepaid ZESA balance is <strong style={{ color: '#fff' }}>{unitsRemaining.toFixed(2)} kWh</strong>, falling below the calculated saving threshold of {beyondSavingThreshold.toFixed(2)} kWh. The smart meter has tripped, cutting power completely. Emergency plan is unavailable.
          </p>
          <button
            onClick={onRedirectToRecharge}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, var(--alert-red), #FF5722)',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
            id="blackout-recharge-redirect"
          >
            Recharge Prepaid Token
          </button>
        </div>
      )}

      {/* Depletion Warning Banner */}
      {unitsRemaining <= 0 && (
        <div style={{
          background: 'rgba(255, 61, 0, 0.08)',
          border: '1px solid rgba(255, 61, 0, 0.4)',
          borderRadius: '8px',
          padding: '18px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 61, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--alert-red)',
              flexShrink: 0
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff' }}>Emergency: Prepaid Token Depleted</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Your prepaid ZESA balance is 0.0 kWh. Please recharge to resume system calculations.
              </p>
            </div>
          </div>
          <button
            onClick={onRedirectToRecharge}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '10px 20px',
              fontSize: '12px',
              background: 'linear-gradient(135deg, var(--alert-red), #FF5722)',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            id="dashboard-recharge-redirect"
          >
            Go to Recharge Section
          </button>
        </div>
      )}

      {/* ============================================================
          ROW 1: UNITS REMAINING + SYSTEM STATUS
          ============================================================ */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>

        {/* --- UNITS REMAINING (Primary Metric) --- */}
        <div className="card units-card" id="tour-runway">
          <div className="card-header">
            <span className="card-title">Meter Units Remaining</span>
            {runway && (
              <span className={`card-badge ${vacant ? 'badge-vacant' : runway.isCalibrating ? 'badge-calibrating' : runway.onTrack ? '' : 'badge-warning'}`}>
                {vacant ? 'Vacant | Achievable' : runway.isCalibrating ? 'Calibrating' : runway.onTrack ? 'On Track' : 'Off Track'}
              </span>
            )}
          </div>

          {runway ? (
            <>
              {/* Big kWh Display */}
              <div className="units-hero">
                <div className="units-kwh">
                  <span className="units-number">{runway.kwhRemaining}</span>
                  <span className="units-label">kWh</span>
                </div>
                <div className="units-confidence" style={{ borderColor: confidenceColor }}>
                  <span className="units-conf-pct" style={{ color: confidenceColor }}>{confidence}%</span>
                  <span className="units-conf-label">Confidence</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="runway-countdown">
                <div className="runway-stats">
                  <div className="runway-stat">
                    <span className="runway-stat-val" style={{ fontSize: '18px' }}>
                      {runway.hoursRemaining !== undefined ? (() => {
                        const totalH = runway.hoursRemaining;
                        const d = Math.floor(totalH / 24);
                        const h = Math.floor(totalH % 24);
                        const m = Math.floor((totalH % 1) * 60);
                        if (d > 0) return `${d}d ${h}h`;
                        if (h > 0) return `${h}h ${m}m`;
                        return `${m}m`;
                      })() : `${runway.daysRemaining}d`}
                    </span>
                    <span className="runway-stat-label">Time Left</span>
                  </div>
                  <div className="runway-stat">
                    <span className="runway-stat-val">{runway.dailyUsage}</span>
                    <span className="runway-stat-label">kWh/Day</span>
                  </div>
                  <div className="runway-stat">
                    <span className="runway-stat-val" style={{ fontSize: '18px' }}>{runway.goal}d 0h</span>
                    <span className="runway-stat-label">Target Goal</span>
                  </div>
                  <div className="runway-stat">
                    <span className="runway-stat-val">{Math.round(totalRealW)}</span>
                    <span className="runway-stat-label">Watts Now</span>
                  </div>
                </div>
              </div>

              {runway.isCalibrating && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Defaulting to goal. Stable average requires 1 hour of data collection.
                </p>
              )}

              {/* Progress Bar */}
              <div className="runway-bar-track">
                <div className={`runway-bar-fill ${runway.pct < 30 ? 'danger' : runway.pct < 60 ? 'warning' : ''}`} style={{ width: `${runway.pct}%` }} />
              </div>

              {runway.depletionDate && (
                <div style={{ marginTop: 10, marginBottom: 10, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>RHS Predictive Forecast:</span>
                  <span style={{ color: runway.onTrack ? 'var(--accent-green)' : 'var(--warning-amber)', fontWeight: 'bold' }}>
                    Depletion: {new Date(runway.depletionDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at {new Date(runway.depletionDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="units-actions">
                <button className="meter-sync-btn" onClick={onOpenMeterSync} id="open-meter-sync">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Sync Meter
                </button>
                <button 
                  className="meter-sync-btn" 
                  onClick={() => setShowBreakdown(!showBreakdown)} 
                  id="toggle-breakdown"
                  style={{
                    background: showBreakdown ? 'var(--accent-blue-dim)' : 'transparent',
                    borderColor: showBreakdown ? 'var(--accent-blue)' : 'var(--border-color)',
                    color: showBreakdown ? 'var(--accent-blue)' : 'var(--text-secondary)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  {showBreakdown ? 'Hide Breakdown' : 'Live Breakdown'}
                </button>
                {runway.isEmergency && unitsRemaining > beyondSavingThreshold && (
                  <button className="emergency-trigger-btn" onClick={onOpenEmergency} id="open-emergency">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Emergency Mode
                  </button>
                )}
              </div>

              {/* Last Sync Info */}
              {engineState?.lastSyncDate && (
                <p className="units-last-sync">
                  Last meter sync: {new Date(engineState.lastSyncDate).toLocaleDateString()} — 
                  Correction: ×{engineState.correctionFactor.toFixed(3)}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No token data configured.</p>
          )}
        </div>

        {/* --- SYSTEM STATUS & TIME MACHINE --- */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Predictive Controller Status</span>
          </div>



          {/* Time Machine Simulator Widget */}
          <div className="time-machine-widget" style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Virtual System Clock</span>
              <span className="status-dot connected" style={{ width: 6, height: 6 }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent-green)', fontFamily: 'Outfit, sans-serif', marginBottom: 10 }}>
              {getVirtualTime().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => onSimulateHours(1)} 
                className="meter-sync-btn" 
                style={{ padding: '6px 12px', fontSize: '11px', flex: 1, justifyContent: 'center' }}
              >
                +1 Hour Jump
              </button>
              <button 
                onClick={() => onSimulateHours(24)} 
                className="meter-sync-btn" 
                style={{ padding: '6px 12px', fontSize: '11px', flex: 1, justifyContent: 'center', background: 'var(--accent-green-dim)', borderColor: 'var(--accent-green)' }}
              >
                Fast-Forward 24h
              </button>
            </div>
            
            {/* BLACKOUT SIMULATION BUTTON */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button 
                onClick={onToggleBlackout} 
                className="meter-sync-btn" 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '11px', 
                  flex: 1, 
                  justifyContent: 'center', 
                  background: gridBlackout ? 'rgba(255, 107, 107, 0.12)' : 'rgba(255,255,255,0.03)', 
                  borderColor: gridBlackout ? 'var(--alert-red)' : 'var(--border-color)',
                  color: gridBlackout ? 'var(--alert-red)' : 'var(--text-primary)',
                  fontWeight: gridBlackout ? 'bold' : 'normal'
                }}
              >
                {gridBlackout ? 'RESTORE UTILITY POWER' : 'SIMULATE ZESA BLACKOUT'}
              </button>
            </div>
          </div>

          {/* Circuit Integrity Monitor */}
          <div className="hw-health" style={{ marginBottom: 14 }}>
            <div className="hw-health-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Monitored Circuit Status</div>
            <div className="hw-health-grid" style={{ display: 'flex', gap: 8 }}>
              {sensorCards.map(s => (
                <div key={s.index} className="hw-dot ok" style={{ fontSize: '10px', width: 28, height: 28, borderRadius: '6px', background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }} title={`${s.name} Monitored Loop: OK`}>
                  C{s.index + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Notification Threshold */}
          <div className="threshold-display" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 14 }}>
            <span className="threshold-label" style={{ color: 'var(--text-secondary)' }}>Low-Energy Trigger Threshold:</span>
            <span className="threshold-value" style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{notifyThreshold} kWh</span>
          </div>

          <button 
            className="advice-trigger-btn" 
            onClick={onOpenAdvice} 
            id="tour-advice-btn" 
            style={{ 
              width: '100%',
              background: activeScheduleId ? 'rgba(37, 211, 102, 0.15)' : '',
              borderColor: activeScheduleId ? 'rgba(37, 211, 102, 0.4)' : '',
              color: activeScheduleId ? 'var(--accent-green)' : ''
            }}
          >
            {activeScheduleId ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span style={{ fontWeight: 'bold' }}>Active Schedule: {activeScheduleId.toUpperCase()}</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                Smart Advice
                {(alerts || []).filter(a => a.type !== 'info').length > 0 && (
                  <span className="advice-count">{(alerts || []).filter(a => a.type !== 'info').length}</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================
          ROW 2: POWER BREAKDOWN (per-appliance real vs apparent power)
          ============================================================ */}
      {showBreakdown && (
        <>
          <div className="section-title"><span className="dot" /> Instantaneous Power Breakdown</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            These percentages represent the exact power draw of each appliance <strong>right at this very second</strong>.
          </p>
          <div className="card full-width power-breakdown-card" id="tour-breakdown" style={{ marginBottom: 28 }}>
            <div className="power-breakdown-header">
              <div className="power-breakdown-total">
                <span className="power-total-val">{Math.round(totalRealW)}</span>
                <span className="power-total-unit">W</span>
                <span className="power-total-label">Real Power</span>
              </div>
              <div className="power-breakdown-total apparent">
                <span className="power-total-val">{Math.round(totalApparentW)}</span>
                <span className="power-total-unit">W</span>
                <span className="power-total-label">Apparent Power</span>
              </div>
              <div className="power-breakdown-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>Real Power = V × I × cos(φ). ZESA meters bill real power, not apparent.</span>
              </div>
            </div>
            <div className="power-breakdown-bars">
              {powerBreakdown.map(p => {
                const pctOfTotal = totalRealW > 0 ? (p.realW / totalRealW * 100) : 0;
                return (
                  <div key={p.index} className="power-bar-row">
                    <div className="power-bar-label">
                      <span className="power-bar-name">{p.name}</span>
                      <span className="power-bar-detail">
                        {Math.round(p.realW)}W · PF {p.powerFactor.toFixed(2)} · {p.amps.toFixed(2)}A
                      </span>
                    </div>
                    <div className="power-bar-track">
                      <div
                        className="power-bar-fill"
                        style={{ width: `${pctOfTotal}%` }}
                      />
                    </div>
                    <span className="power-bar-pct">{pctOfTotal.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          ROW 4: MONITORED CIRCUIT LOOPS
          ============================================================ */}
      <div className="section-title"><span className="dot" /> Monitored Circuit Loops</div>
      <div className="dashboard-grid three-col" style={{ marginBottom: 28 }}>
        {sensorCards.map((s) => (
          <div key={s.index} className="card gauge-card">
            <div className="card-header">
              <span className="card-title">{s.name}</span>
              <span className="card-badge">Loop {s.index + 1}</span>
            </div>
            <div className="gauge-value">
              {s.val.toFixed(2)}
              <span className="unit">A</span>
            </div>
            <div className="gauge-bar-track">
              <div className={`gauge-bar-fill ${s.level}`} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================
          ROW 5: RELAY CONTROL GRID
          ============================================================ */}
      <div id="tour-relays" style={{ marginTop: 12 }}>
        <RelayControl relays={relays} onToggle={onToggleRelay} profiles={profiles} activeScheduleId={activeScheduleId} />
      </div>

    </div>
  );
}
