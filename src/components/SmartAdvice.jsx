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
                return (
                  <div key={recipe.id} className="recipe-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', transition: 'all 0.2s' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: 0 }}>{recipe.name}</h5>
                      <span style={{ fontSize: '10px', color: 'var(--accent-green)', background: 'var(--accent-green-dim)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--accent-green)', fontWeight: 'bold' }}>
                        {recipe.dailyBudget} kWh/day
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>{recipe.description}</p>
                    
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
                                  ⚠️ Thermodynamic lock: runtimes below {minGeyser.minutes} mins output 100% cold water.
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
