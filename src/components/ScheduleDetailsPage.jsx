import { useMemo, useState } from 'react';
import { solveEnergyAllocation, calculateMinimumGeyserRunTime } from '../services/recipeEngine.js';

export default function ScheduleDetailsPage({ 
  recipeId, 
  tokenKwhRemaining, 
  targetHours, 
  onBack, 
  onApplySchedule,
  activeScheduleId
}) {
  const [pendingScheduleActivation, setPendingScheduleActivation] = useState(false);

  const kwh = parseFloat(tokenKwhRemaining || 3.0);
  const hours = parseFloat(targetHours || 48.0);

  const allocation = useMemo(() => {
    return solveEnergyAllocation(kwh, hours);
  }, [kwh, hours]);

  const recipe = allocation.recipes.find(r => r.id === recipeId);
  const minGeyser = calculateMinimumGeyserRunTime();

  if (!recipe) {
    return (
      <div className="fade-in" style={{ padding: '20px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--alert-red)' }}>Schedule not found.</h3>
        <button onClick={onBack} className="btn-secondary" style={{ marginTop: '20px' }}>Back to Dashboard</button>
      </div>
    );
  }

  const targetDays = hours / 24;
  const runwayDays = kwh / recipe.dailyBudget;
  const meetsTarget = runwayDays >= targetDays - 0.05;
  const shortfall = targetDays - runwayDays;
  const isRecommended = recipe.id === 'balanced';

  return (
    <div className="fade-in">
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '24px' }}>
        <button 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', padding: 0, fontWeight: 'bold' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {recipe.name}
              {activeScheduleId === recipe.id && (
                <span style={{ fontSize: '11px', backgroundColor: 'var(--accent-blue)', color: '#fff', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
              )}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{recipe.description}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, display: 'inline-block' }}>
              {recipe.dailyBudget} kWh/day
            </div>
            <div style={{
              fontSize: '13px',
              color: meetsTarget ? 'var(--accent-green)' : 'var(--warning-amber)',
              background: meetsTarget ? 'var(--accent-green-dim)' : 'rgba(255, 179, 0, 0.1)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: meetsTarget ? '1px solid var(--accent-green)' : '1px solid var(--warning-amber)',
              fontWeight: 'bold',
              display: 'inline-block'
            }}>
              {runwayDays.toFixed(1)} Days Runway
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', marginBottom: 32, color: meetsTarget ? 'var(--accent-green)' : 'var(--warning-amber)' }}>
          {meetsTarget ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Meets your {targetDays.toFixed(1)}-day goal ({runwayDays.toFixed(1)} days runway)</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>Falls short of your {targetDays.toFixed(1)}-day goal by {shortfall.toFixed(1)} days</span>
            </>
          )}
        </div>

        {isRecommended && (
          <div style={{ background: 'rgba(37, 211, 102, 0.05)', borderRadius: '8px', padding: '16px', marginBottom: '32px', border: '1px solid rgba(37, 211, 102, 0.1)' }}>
            <strong style={{ fontSize: '13px', color: 'var(--accent-green)', display: 'block', marginBottom: '8px' }}>Why this is recommended:</strong>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
              <li>Best balance of comfort vs runway — hits your {targetDays.toFixed(1)}-day target without excessive sacrifice.</li>
              <li>Retains full fridge cooling and schedules convenience loads during high-efficiency periods.</li>
              <li>Prevents standby thermal losses by scheduling the geyser in a single optimal daily run.</li>
              <li>Adapts automatically — if load shedding occurs, the next recalculation will reflect the saved energy.</li>
            </ul>
          </div>
        )}

        <h3 style={{ fontSize: '15px', color: '#fff', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Appliance Breakdown</h3>
        <div className="schedules-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 40 }}>
          {recipe.schedules.map((sched, sidx) => (
            <div key={sidx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', marginBottom: 8 }}>{sched.appliance}</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: '1.6' }}>
                {sched.schedule}
              </div>
              {sched.appliance === "Geyser Loop" && kwh >= minGeyser.kwhRequired && (
                <div style={{ fontSize: '11px', color: 'var(--warning-amber)', marginTop: 12, background: 'rgba(255,179,0,0.1)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,179,0,0.2)' }}>
                  <strong>WARNING:</strong> Thermodynamic lock: runtimes below {minGeyser.minutes} mins output 100% cold water.
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '600px', margin: '0 auto' }}>
          {pendingScheduleActivation ? (
            <div>
              {activeScheduleId && activeScheduleId !== recipe.id && (
                <div style={{ color: 'var(--warning-amber)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                  ⚠️ Another schedule ({activeScheduleId.toUpperCase()}) is currently running. Do you wish to switch?
                </div>
              )}
              <h4 style={{ fontSize: '16px', color: '#fff', margin: '0 0 16px 0', textAlign: 'center' }}>Schedule Execution Mode</h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.6' }}>
                Do you want ZET-5 to actively track the time and switch the relays for you automatically, or do you prefer to apply these settings manually?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    onApplySchedule(recipe.id, true);
                    setPendingScheduleActivation(false);
                  }}
                  className="advice-accept-btn"
                  style={{ flex: 1, padding: '12px', fontSize: '13px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}
                >
                  Fully Autonomous (Recommended)
                </button>
                <button
                  onClick={() => {
                    onApplySchedule(recipe.id, false);
                    setPendingScheduleActivation(false);
                  }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', fontSize: '13px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}
                >
                  Manual Control Only
                </button>
              </div>
              <button
                onClick={() => setPendingScheduleActivation(false)}
                style={{ width: '100%', marginTop: '16px', padding: '8px', fontSize: '13px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          ) : activeScheduleId === recipe.id ? (
            <button
              onClick={() => onApplySchedule(null, false)}
              className="btn-secondary"
              style={{ width: '100%', padding: '16px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderColor: 'var(--alert-red)', color: 'var(--alert-red)', fontWeight: 'bold' }}
            >
              Deactivate Schedule
            </button>
          ) : (
            <button
              onClick={() => setPendingScheduleActivation(true)}
              className="advice-accept-btn"
              style={{ width: '100%', padding: '16px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 'bold' }}
            >
              Activate {recipe.name} Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
