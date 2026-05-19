import { useState, useMemo, useEffect } from 'react';

function generateMockTokens(profiles) {
  const tokens = [];
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 120); // start 120 days ago

  for (let i = 0; i < 6; i++) {
    const kwh = [50, 100, 150, 200][Math.floor(Math.random() * 4)];
    const durationDays = Math.ceil(kwh / 8.5); // approx 8.5 kWh per day
    const dateBought = new Date(currentDate);
    const dateDepleted = new Date(currentDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    
    if (dateBought > new Date()) break; // don't create future tokens

    // Gadget overall breakdowns for this token
    const gadgets = (profiles || []).map((p, index) => {
      const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
      const weight = weights[index % weights.length] || 0.1;
      return {
        name: p.name,
        totalKwh: kwh * weight
      };
    });

    // Pick random blackout days (ZESA gone whole day) for this token session
    const blackoutIndices = new Set();
    // 60% chance this token session has 1 to 3 blackout days
    if (Math.random() < 0.6 && durationDays > 5) {
      const numBlackouts = Math.floor(Math.random() * 3) + 1;
      while (blackoutIndices.size < numBlackouts) {
        const randIndex = Math.floor(Math.random() * durationDays);
        if (randIndex > 0 && randIndex < durationDays - 1) {
          blackoutIndices.add(randIndex);
        }
      }
    }

    // Generate daily logs
    const dailyLogs = [];
    let loopDate = new Date(dateBought);
    let dayIndex = 0;
    const activeDaysCount = durationDays - blackoutIndices.size;

    while (loopDate <= dateDepleted && loopDate <= new Date()) {
       const isBlackout = blackoutIndices.has(dayIndex);
       const dailyTotal = isBlackout ? 0 : (kwh / activeDaysCount);
       dailyLogs.push({
         date: loopDate.toISOString().split('T')[0],
         total: dailyTotal,
         isBlackout,
         gadgets: gadgets.map(g => ({
           name: g.name,
           kwh: isBlackout ? 0 : (g.totalKwh / activeDaysCount)
         }))
       });
       loopDate.setDate(loopDate.getDate() + 1);
       dayIndex++;
    }

    tokens.push({
      id: `tkn-${i}-${dateBought.getTime()}`,
      kwh,
      dateBought: dateBought.toISOString(),
      dateDepleted: dateDepleted > new Date() ? null : dateDepleted.toISOString(), // Null if not depleted yet
      gadgetCount: profiles.length || 5,
      gadgets,
      dailyLogs
    });

    currentDate = new Date(dateDepleted.getTime() + (Math.random() * 2) * 24 * 60 * 60 * 1000); 
  }
  return tokens.reverse(); // newest first
}

// Helper to group daily logs into weeks or months
function groupLogs(dailyLogs, mode) {
  if (mode === 'day') return dailyLogs.map(log => ({ label: log.date, ...log }));

  const groups = {};
  dailyLogs.forEach(log => {
    let key;
    const d = new Date(log.date);
    if (mode === 'week') {
      // Rough week calculation
      const year = d.getFullYear();
      const week = Math.ceil(d.getDate() / 7);
      key = `${d.toLocaleString('default', { month: 'short' })} Wk ${week}, ${year}`;
    } else if (mode === 'month') {
      key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
    }

    if (!groups[key]) {
      groups[key] = { label: key, total: 0, gadgets: {} };
    }
    groups[key].total += log.total;
    log.gadgets.forEach(g => {
      groups[key].gadgets[g.name] = (groups[key].gadgets[g.name] || 0) + g.kwh;
    });
  });

  return Object.values(groups).map(g => ({
    label: g.label,
    total: g.total,
    gadgets: Object.entries(g.gadgets).map(([name, kwh]) => ({ name, kwh }))
  }));
}

export default function AuditTrail({ profiles }) {
  const [tokens, setTokens] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'

  useEffect(() => {
    // Check if we have mock token history in storage, otherwise generate
    const stored = localStorage.getItem('zet5_token_audit_v2');
    if (stored) {
      try {
        setTokens(JSON.parse(stored));
      } catch {
        const mock = generateMockTokens(profiles);
        setTokens(mock);
        localStorage.setItem('zet5_token_audit_v2', JSON.stringify(mock));
      }
    } else {
      const mock = generateMockTokens(profiles);
      setTokens(mock);
      localStorage.setItem('zet5_token_audit_v2', JSON.stringify(mock));
    }
  }, [profiles]);

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const token = tokens.find(t => t.id === id);
      if (token && token.dailyLogs) {
        const days = token.dailyLogs.length;
        if (days >= 28) {
          setViewMode('month');
        } else if (days >= 7) {
          setViewMode('week');
        } else {
          setViewMode('day');
        }
      } else {
        setViewMode('day');
      }
    }
  };

  return (
    <div className="fade-in">
      <div className="section-title"><span className="dot" /> Prepaid Token Audit Trail</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
        Immutable ledger of all ZESA tokens purchased, tracking exact depletion dates and the per-gadget energy consumption breakdown during each period.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tokens.map(token => {
          const isExpanded = expandedId === token.id;
          const groupedData = isExpanded ? groupLogs(token.dailyLogs, viewMode) : [];
          const durationDays = token.dailyLogs.length;

          return (
            <div key={token.id} className="card" style={{ padding: '0', overflow: 'hidden', border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)', transition: 'all 0.3s ease' }}>
              {/* Header / Summary Row */}
              <div 
                onClick={() => toggleExpand(token.id)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? 'rgba(52, 152, 219, 0.05)' : 'transparent' }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {token.kwh} kWh
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Bought: {new Date(token.dateBought).toLocaleDateString()} at {new Date(token.dateBought).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: token.dateDepleted ? 'var(--alert-red)' : 'var(--accent-green)', fontWeight: 'bold', marginBottom: '4px' }}>
                    {token.dateDepleted ? 'Depleted' : 'Active'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {token.dateDepleted 
                      ? `${new Date(token.dateDepleted).toLocaleDateString()} (${durationDays} days)` 
                      : `${durationDays} days so far`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{token.gadgetCount}</span>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>Gadgets</span>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded Breakdown Section */}
              {isExpanded && (
                <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  
                  {/* Aggregation Toggles */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                      Consumption Breakdown
                    </div>
                    <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      {['day', 'week', 'month'].map(mode => (
                        <button
                          key={mode}
                          onClick={(e) => { e.stopPropagation(); setViewMode(mode); }}
                          style={{
                            padding: '6px 16px',
                            fontSize: '12px',
                            textTransform: 'capitalize',
                            background: viewMode === mode ? 'var(--accent-blue)' : 'transparent',
                            color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: viewMode === mode ? 'bold' : 'normal'
                          }}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>Period ({viewMode})</th>
                          {token.gadgets.map(g => (
                            <th key={g.name} style={{ padding: '8px 12px', fontWeight: 'normal' }}>{g.name}</th>
                          ))}
                          <th style={{ padding: '8px 12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedData.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {row.label}
                              {row.isBlackout && (
                                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,107,107,0.12)', color: 'var(--alert-red)', fontWeight: 'bold' }}>
                                  ZESA GONE
                                </span>
                              )}
                            </td>
                            {token.gadgets.map(g => {
                              const match = row.gadgets.find(rg => rg.name === g.name);
                              return (
                                <td key={g.name} style={{ padding: '10px 12px', color: '#fff' }}>
                                  {match ? match.kwh.toFixed(1) : '0.0'}
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: row.isBlackout ? 'var(--alert-red)' : 'var(--accent-green)' }}>
                              {row.total.toFixed(1)} kWh
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          );
        })}
        {tokens.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No tokens purchased yet.</p>
        )}
      </div>
    </div>
  );
}
