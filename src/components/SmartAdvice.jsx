import { useState, useMemo, useCallback } from 'react';
import { solveEnergyAllocation, calculateMinimumGeyserRunTime } from '../services/recipeEngine.js';
import { getVirtualTime } from '../services/predictionEngine.js';

export default function SmartAdvice({ alerts, relays, onAcceptAdvice, activeScheduleId, onApplySchedule, visible, onClose, tokenKwhRemaining, targetHours, tokenState, onViewSchedules }) {
  const [showFeasibilityDetails, setShowFeasibilityDetails] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [pendingScheduleActivation, setPendingScheduleActivation] = useState(null);
  const [recalcKey, setRecalcKey] = useState(0);

  // C1 to C5 active values
  const kwh = parseFloat(tokenKwhRemaining || 3.0);
  const hours = parseFloat(targetHours || 48.0);

  // Solve the combinatorial allocation for the current budget state
  // recalcKey forces recomputation when the user presses "Recalculate"
  const allocation = useMemo(() => {
    return solveEnergyAllocation(kwh, hours);
  }, [kwh, hours, recalcKey]);

  // Timestamp of last calculation
  const calculatedAt = useMemo(() => {
    return getVirtualTime();
  }, [kwh, hours, recalcKey]);

  const minGeyser = calculateMinimumGeyserRunTime();

  const handleRecalculate = useCallback(() => {
    setRecalcKey(k => k + 1);
  }, []);

  // Format the calculated-at time
  const calcTimeStr = calculatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const calcDateStr = calculatedAt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  // Determine next recalculation window (next 6-hour mark)
  const nextRecalcHour = Math.ceil((calculatedAt.getHours() + 1) / 6) * 6;
  const nextRecalcLabel = nextRecalcHour >= 24 ? 'Tomorrow 06:00' : `Today ${String(nextRecalcHour).padStart(2, '0')}:00`;

  if (!visible) return null;

  return (
    <div className="advice-overlay" onClick={onClose}>
      <aside className="advice-panel slide-in" onClick={e => e.stopPropagation()} style={{ width: '480px', maxWidth: '95vw', background: 'rgba(18, 25, 29, 0.96)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>

        {/* HEADER */}
        <div className="advice-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="advice-title-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Optimizer</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Adaptive edge allocation and load schedules</span>
            </div>
          </div>
          <button className="advice-close" onClick={onClose} id="advice-close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* LIST SECTION */}
        <div className="advice-list" style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 85px)' }}>

          {/* ===== CALCULATION CONTEXT BAR ===== */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Calculated Based On</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span><strong style={{ color: 'var(--accent-blue)' }}>{kwh.toFixed(1)}</strong> kWh remaining</span>
                <span><strong style={{ color: 'var(--accent-blue)' }}>{(hours / 24).toFixed(1)}</strong> day target</span>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 3 }}>
                Snapshot at {calcTimeStr}, {calcDateStr} · Auto-refreshes: {nextRecalcLabel}
              </div>
            </div>
            <button
              onClick={handleRecalculate}
              style={{
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                color: 'var(--accent-blue)',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              id="btn-recalculate-advice"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Recalculate
            </button>
          </div>

          {!allocation.feasible ? (
            <div className="advice-card danger" style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid var(--alert-red)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--alert-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <h4 style={{ margin: 0, color: 'var(--alert-red)', fontWeight: 'bold', fontSize: '13px' }}>Target Unfeasible</h4>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', lineHeight: '1.5', color: 'rgba(255,255,255,0.85)' }}>
                Your remaining token units ({kwh.toFixed(1)} kWh) cannot sustain your essential standby loads for the targeted {hours} hours.
              </p>

              {/* PROGRESSIVE DISCLOSURE LINK */}
              <button
                onClick={() => setShowFeasibilityDetails(!showFeasibilityDetails)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold' }}
              >
                <span>{showFeasibilityDetails ? 'Show Less' : 'Learn More & Read Technical Diagnostics'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showFeasibilityDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* COLLAPSIBLE DETAILS */}
              {showFeasibilityDetails && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255, 107, 107, 0.15)', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6', fontFamily: 'monospace' }}>
                  {allocation.diagnostic}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Feasible Diagnostics - Clean and Compact */}
              <div className="advice-card success" style={{ background: 'rgba(37,211,102,0.03)', border: '1px solid var(--accent-green)', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Target Runway Feasible!</span>
                </div>
              </div>

              {/* ADAPTIVE NOTICE */}
              <div style={{
                background: 'rgba(14, 165, 233, 0.04)',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '16px',
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                  Auto-adjusting 24hr schedules based on your usage.
                </p>
              </div>

              {/* RECIPES */}
              <button
                onClick={onViewSchedules}
                className="advice-accept-btn"
                style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 'bold', marginTop: '10px' }}
              >
                View 24-Hour Schedules
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
