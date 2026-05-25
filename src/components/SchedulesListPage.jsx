import { useMemo, useState } from 'react';
import { solveEnergyAllocation } from '../services/recipeEngine.js';

export default function SchedulesListPage({ 
  tokenKwhRemaining, 
  targetHours, 
  tokenState,
  activeScheduleId,
  onApplySchedule,
  onViewDetails,
  onBack
}) {
  const [pendingScheduleActivation, setPendingScheduleActivation] = useState(null);

  const kwh = parseFloat(tokenKwhRemaining || 3.0);
  const hours = parseFloat(targetHours || 48.0);

  const allocation = useMemo(() => {
    return solveEnergyAllocation(kwh, hours);
  }, [kwh, hours]);

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
          Back to Dashboard
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '0 0 8px 0' }}>24-Hour Schedules</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Select an adaptive power plan based on your remaining units and runway goals.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {allocation.recipes.filter(recipe => {
          if (tokenState?.isEmergency) {
            return recipe.id === 'survival';
          } else if (tokenState?.belowThreshold || tokenState?.atRisk) {
            return recipe.id !== 'comfort';
          }
          return true;
        }).map((recipe) => {
          const targetDays = hours / 24;
          const runwayDays = kwh / recipe.dailyBudget;
          const meetsTarget = runwayDays >= targetDays - 0.05;
          const shortfall = targetDays - runwayDays;
          const isRecommended = recipe.id === 'balanced';

          const cardStyle = {
            background: isRecommended ? 'rgba(37, 211, 102, 0.04)' : 'rgba(255,255,255,0.02)',
            border: isRecommended ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid rgba(255,255,255,0.06)',
            borderLeft: isRecommended ? '4px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '0',
            transition: 'all 0.2s',
            boxShadow: isRecommended ? '0 4px 24px rgba(37, 211, 102, 0.08)' : 'none',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          };

          return (
            <div key={recipe.id} className="recipe-card" style={cardStyle}>
              {isRecommended && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.15), rgba(7, 94, 84, 0.2))',
                  borderBottom: '1px solid rgba(37, 211, 102, 0.2)',
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ZET-5 Recommended Plan</span>
                </div>
              )}

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h5 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {recipe.name}
                    {activeScheduleId === recipe.id && (
                      <span style={{ fontSize: '10px', backgroundColor: 'var(--accent-blue)', color: '#fff', padding: '3px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
                    )}
                  </h5>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', minHeight: '40px' }}>{recipe.description}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {recipe.dailyBudget} kWh/day
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: meetsTarget ? 'var(--accent-green)' : 'var(--warning-amber)',
                    background: meetsTarget ? 'var(--accent-green-dim)' : 'rgba(255, 179, 0, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: meetsTarget ? '1px solid var(--accent-green)' : '1px solid var(--warning-amber)',
                    fontWeight: 'bold'
                  }}>
                    {runwayDays.toFixed(1)} Days Runway
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', marginBottom: 'auto', color: meetsTarget ? 'var(--accent-green)' : 'var(--warning-amber)' }}>
                  {meetsTarget ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Meets your {targetDays.toFixed(1)}-day goal</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span>Falls short by {shortfall.toFixed(1)} days</span>
                    </>
                  )}
                </div>

                {/* SCHEDULE DETAILS BUTTON (Navigates to sub-view) */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => onViewDetails(recipe.id)}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    View Daily Allocation Details
                  </button>
                </div>

                <div style={{ marginTop: '10px', paddingBottom: '2px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  {pendingScheduleActivation === recipe.id ? (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--accent-blue)' }}>
                      {activeScheduleId && activeScheduleId !== recipe.id && (
                        <div style={{ color: 'var(--warning-amber)', fontSize: '12px', marginBottom: '12px', fontWeight: 'bold' }}>
                          ⚠️ Another schedule ({activeScheduleId.toUpperCase()}) is currently running. Do you wish to switch?
                        </div>
                      )}
                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#fff', textAlign: 'center' }}>Execution Mode?</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            onApplySchedule(recipe.id, true);
                            setPendingScheduleActivation(null);
                          }}
                          className="advice-accept-btn"
                          style={{ flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}
                        >
                          Auto
                        </button>
                        <button
                          onClick={() => {
                            onApplySchedule(recipe.id, false);
                            setPendingScheduleActivation(null);
                          }}
                          className="btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}
                        >
                          Manual
                        </button>
                      </div>
                      <button
                        onClick={() => setPendingScheduleActivation(null)}
                        style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '12px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : activeScheduleId === recipe.id ? (
                    <button
                      onClick={() => onApplySchedule(null, false)}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: 'var(--alert-red)', color: 'var(--alert-red)' }}
                    >
                      Deactivate Schedule
                    </button>
                  ) : (
                    <button
                      onClick={() => setPendingScheduleActivation(recipe.id)}
                      className="advice-accept-btn"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      Activate Schedule
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
