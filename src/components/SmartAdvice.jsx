import { useState, useMemo } from 'react';
import { solveEnergyAllocation, calculateMinimumGeyserRunTime } from '../services/recipeEngine.js';

export default function SmartAdvice({ alerts, relays, onAcceptAdvice, visible, onClose, tokenKwhRemaining, targetHours }) {
  const [showFeasibilityDetails, setShowFeasibilityDetails] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  // C1 to C5 active values
  const kwh = parseFloat(tokenKwhRemaining || 3.0);
  const hours = parseFloat(targetHours || 48.0);

  // Solve the combinatorial allocation for the current budget state
  const allocation = useMemo(() => {
    return solveEnergyAllocation(kwh, hours);
  }, [kwh, hours]);

  const minGeyser = calculateMinimumGeyserRunTime();

  if (!visible) return null;

  return (
    <div className="advice-overlay" onClick={onClose}>
      <aside className="advice-panel slide-in" onClick={e => e.stopPropagation()} style={{ width: '480px', maxWidth: '95vw', background: 'rgba(18, 25, 29, 0.96)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
        
        {/* HEADER */}
        <div className="advice-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="advice-title-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* CLEAN ENERGY BOLT ICON (Replaced the Dollar Sign) */}
            <div style={{ padding: 8, borderRadius: 8, background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Combinatorial Optimizer</h3>
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
          
          {/* ============================================================
              CASE A: UNFEASIBLE TARGET DIAGNOSTIC WARNING (With 'Learn More')
              ============================================================ */}
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

              {/* RECIPES */}
              <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 'bold' }}>Actionable Daily Schedules</h4>
              
              {allocation.recipes.map((recipe) => {
                const isExpanded = expandedRecipe === recipe.id;
                const targetDays = hours / 24;
                const runwayDays = kwh / recipe.dailyBudget;
                const meetsTarget = runwayDays >= targetDays - 0.05;
                const shortfall = targetDays - runwayDays;
                const isRecommended = recipe.id === 'balanced';

                const cardStyle = {
                  background: isRecommended ? 'rgba(37, 211, 102, 0.03)' : 'rgba(255,255,255,0.02)',
                  border: isRecommended ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '14px',
                  transition: 'all 0.2s',
                  boxShadow: isRecommended ? '0 4px 20px rgba(37, 211, 102, 0.05)' : 'none'
                };

                return (
                  <div key={recipe.id} className="recipe-card" style={cardStyle}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: 0 }}>{recipe.name}</h5>
                        {isRecommended && (
                          <span style={{ fontSize: '8px', color: 'var(--accent-green)', background: 'var(--accent-green-dim)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--accent-green)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⭐ Recommended
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {recipe.dailyBudget} kWh/day
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          color: meetsTarget ? 'var(--accent-green)' : 'var(--warning-amber)', 
                          background: meetsTarget ? 'var(--accent-green-dim)' : 'rgba(255, 179, 0, 0.1)', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          border: meetsTarget ? '1px solid var(--accent-green)' : '1px solid var(--warning-amber)', 
                          fontWeight: 'bold' 
                        }}>
                          {runwayDays.toFixed(1)} Days Runway
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{recipe.description}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10.5px', marginBottom: 12, color: meetsTarget ? 'var(--accent-green)' : 'var(--warning-amber)' }}>
                      {meetsTarget ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Meets your {targetDays.toFixed(1)}-day goal ({runwayDays.toFixed(1)} days runway)</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                          <span>Falls short of your {targetDays.toFixed(1)}-day goal by {shortfall.toFixed(1)} days</span>
                        </>
                      )}
                    </div>

                    {isRecommended && (
                      <div style={{ background: 'rgba(37, 211, 102, 0.05)', borderRadius: '6px', padding: '10px', marginBottom: '12px', border: '1px solid rgba(37, 211, 102, 0.1)' }}>
                        <strong style={{ fontSize: '11px', color: 'var(--accent-green)', display: 'block', marginBottom: '4px' }}>Why this is recommended:</strong>
                        <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '10px', color: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.4' }}>
                          <li>Perfectly hits your {targetDays.toFixed(1)}-day runway target while keeping essential comfort online.</li>
                          <li>Retains full fridge cooling and schedules convenience loads during high-efficiency periods.</li>
                          <li>Prevents standby thermal losses by scheduling the geyser in a single optimal daily run.</li>
                        </ul>
                      </div>
                    )}

                    {/* SCHEDULE COLLAPSIBLE PANEL */}
                    <button 
                      onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold', marginBottom: isExpanded ? 12 : 0 }}
                    >
                      <span>{isExpanded ? 'Hide Schedule' : 'View Daily Allocation'}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="schedules-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        {recipe.schedules.map((sched, sidx) => (
                          <div key={sidx} style={{ display: 'flex', gap: 8, fontSize: '11px', lineHeight: '1.4' }}>
                            <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold', width: '90px', flexShrink: 0 }}>{sched.appliance}:</span>
                            <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                              {sched.schedule}
                              {sched.appliance === "Geyser Loop" && kwh >= minGeyser.kwhRequired && (
                                <span style={{ display: 'block', fontSize: '9px', color: 'var(--warning-amber)', marginTop: 2 }}>
                                  WARNING: Thermodynamic lock: runtimes below {minGeyser.minutes} mins output 100% cold water.
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                      <button 
                        onClick={() => {
                          if (recipe.id === 'survival') {
                            onAcceptAdvice(1); // Shed Geyser
                            onAcceptAdvice(2); // Shed Borehole
                            onAcceptAdvice(3); // Shed Entertainment
                          } else if (recipe.id === 'balanced') {
                            onAcceptAdvice(1); // Shed Geyser
                            onAcceptAdvice(3); // Shed Entertainment
                          }
                        }}
                        className="advice-accept-btn" 
                        style={{ width: '100%', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        Apply Schedule & Shed Non-Essentials
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
