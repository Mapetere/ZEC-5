import { useState, useMemo, useCallback } from 'react';
import { solveEnergyAllocation, calculateMinimumGeyserRunTime } from '../services/recipeEngine.js';
import { getVirtualTime } from '../services/predictionEngine.js';

export default function SmartAdvice({ alerts, relays, onAcceptAdvice, visible, onClose, tokenKwhRemaining, targetHours }) {
  const [showFeasibilityDetails, setShowFeasibilityDetails] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
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

              {/* ADAPTIVE NOTICE */}
              <div style={{ 
                background: 'rgba(14, 165, 233, 0.04)', 
                border: '1px solid rgba(14, 165, 233, 0.15)', 
                borderRadius: '6px', 
                padding: '10px 12px', 
                marginBottom: '16px',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                  These schedules are <strong style={{ color: 'rgba(255,255,255,0.9)' }}>adaptive snapshots for the next 24 hours</strong> based on your current remaining units and learned usage patterns. 
                  They will automatically shift as your energy state changes — after load shedding, recharges, or unusual consumption. 
                  Tap <strong style={{ color: 'var(--accent-blue)' }}>Recalculate</strong> anytime to get a fresh plan.
                </p>
              </div>

              {/* RECIPES */}
              <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 'bold' }}>
                Next 24-Hour Schedules
              </h4>
              
              {allocation.recipes.map((recipe) => {
                const isExpanded = expandedRecipe === recipe.id;
                const targetDays = hours / 24;
                const runwayDays = kwh / recipe.dailyBudget;
                const meetsTarget = runwayDays >= targetDays - 0.05;
                const shortfall = targetDays - runwayDays;
                const isRecommended = recipe.id === 'balanced';

                const cardStyle = {
                  background: isRecommended ? 'rgba(37, 211, 102, 0.04)' : 'rgba(255,255,255,0.02)',
                  border: isRecommended ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderLeft: isRecommended ? '3px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: isRecommended ? '2px 10px 10px 2px' : '10px',
                  padding: '0',
                  marginBottom: '14px',
                  transition: 'all 0.2s',
                  boxShadow: isRecommended ? '0 4px 24px rgba(37, 211, 102, 0.08), inset 0 0 20px rgba(37, 211, 102, 0.02)' : 'none',
                  overflow: 'hidden'
                };

                return (
                  <div key={recipe.id} className="recipe-card" style={cardStyle}>
                    
                    {/* RECOMMENDED TOP BANNER */}
                    {isRecommended && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.15), rgba(7, 94, 84, 0.2))',
                        borderBottom: '1px solid rgba(37, 211, 102, 0.2)',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ZET-5 Recommended Plan</span>
                      </div>
                    )}

                    <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: 0 }}>{recipe.name}</h5>
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
                          <li>Best balance of comfort vs runway — hits your {targetDays.toFixed(1)}-day target without excessive sacrifice.</li>
                          <li>Retains full fridge cooling and schedules convenience loads during high-efficiency periods.</li>
                          <li>Prevents standby thermal losses by scheduling the geyser in a single optimal daily run.</li>
                          <li>Adapts automatically — if load shedding occurs, the next recalculation will reflect the saved energy.</li>
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

                    <div style={{ marginTop: '12px', paddingBottom: '2px' }}>
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
                    </div>{/* close inner padding div */}
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
