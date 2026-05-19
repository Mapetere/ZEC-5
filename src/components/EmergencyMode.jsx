import { useState, useMemo } from 'react';

/**
 * EmergencyMode — Activated when tokens fall below critical level (5 kWh).
 * User enters a personal request ("I need this to last X hours").
 * System calculates a Power Budget and offers two Load Shedding Strategies:
 *   A) Sacrificial: Permanently cut high-load relays
 *   B) Alternating: Time-share power between appliances
 */
export default function EmergencyMode({ kwhRemaining, sensors, profiles, relays, onToggleRelay, onClose }) {
  const [requestHours, setRequestHours] = useState('48');
  const [submitted, setSubmitted] = useState(false);
  const MAINS_VOLTAGE = 230;

  const budget = useMemo(() => {
    if (!submitted || !requestHours) return null;
    const hours = parseInt(requestHours);
    if (isNaN(hours) || hours < 1) return null;

    const kwh = parseFloat(kwhRemaining) || 5;
    const totalBudgetWh = kwh * 1000;
    const hourlyBudgetW = totalBudgetWh / hours;

    // Rank sensors by power draw (highest first)
    const ranked = (profiles || []).slice(0, 5).map((p, i) => {
      const amps = sensors?.[i] || 0;
      const watts = amps * MAINS_VOLTAGE;
      return { index: i, name: p.name, amps, watts };
    }).sort((a, b) => b.watts - a.watts);

    const totalCurrentW = ranked.reduce((s, r) => s + r.watts, 0);

    // Strategy A: Sacrificial — cut highest loads until under budget
    let sacrificialCuts = [];
    let remainingW = totalCurrentW;
    for (const item of ranked) {
      if (remainingW <= hourlyBudgetW) break;
      sacrificialCuts.push(item);
      remainingW -= item.watts;
    }

    // Strategy B: Alternating — time-share all loads
    const cycleMinutes = 60;
    const slotCount = Math.max(1, Math.ceil(totalCurrentW / hourlyBudgetW));
    const slotMinutes = Math.floor(cycleMinutes / slotCount);
    const groups = [];
    for (let g = 0; g < slotCount; g++) {
      groups.push(ranked.filter((_, i) => i % slotCount === g));
    }

    return {
      hours,
      kwh,
      hourlyBudgetW: Math.round(hourlyBudgetW),
      totalCurrentW: Math.round(totalCurrentW),
      overBudget: totalCurrentW > hourlyBudgetW,
      sacrificialCuts,
      remainingAfterCuts: Math.round(remainingW),
      alternatingGroups: groups,
      slotMinutes,
      ranked,
    };
  }, [submitted, requestHours, kwhRemaining, sensors, profiles]);

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="emergency-panel fade-in" onClick={e => e.stopPropagation()}>
        <div className="emergency-header">
          <h3 className="emergency-title">Emergency Power Mode</h3>
          <button className="advice-close" onClick={onClose} id="emergency-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="emergency-alert-bar">
          Remaining Energy: {parseFloat(kwhRemaining).toFixed(1)} kWh | Critical Level
        </div>

        {!submitted ? (
          <div className="emergency-request">
            <p className="emergency-desc">
              Enter your survival target. ZET-5 will calculate a power budget and offer
              load shedding strategies to meet your goal.
            </p>
            <label className="login-label">Personal Request</label>
            <div className="emergency-input-row">
              <span className="emergency-input-pre">I need this to last</span>
              <input
                className="emergency-hours-input"
                type="text"
                inputMode="numeric"
                value={requestHours}
                onChange={e => setRequestHours(e.target.value.replace(/\D/g, ''))}
                id="emergency-hours"
              />
              <span className="emergency-input-post">hours</span>
            </div>
            <button
              className="btn-primary"
              onClick={() => { if (requestHours && parseInt(requestHours) > 0) setSubmitted(true); }}
              style={{ marginTop: 16 }}
              id="emergency-submit"
            >
              Calculate Power Budget
            </button>
          </div>
        ) : budget ? (
          <div className="emergency-results">
            <div className="emergency-budget-row">
              <div className="emergency-budget-item">
                <span className="emergency-budget-label">Hourly Budget</span>
                <span className="emergency-budget-val">{budget.hourlyBudgetW}W</span>
              </div>
              <div className="emergency-budget-item">
                <span className="emergency-budget-label">Current Draw</span>
                <span className="emergency-budget-val">{budget.totalCurrentW}W</span>
              </div>
              <div className="emergency-budget-item">
                <span className="emergency-budget-label">Target</span>
                <span className="emergency-budget-val">{budget.hours}h</span>
              </div>
            </div>

            {budget.overBudget && (
              <>
                {/* Strategy A: Sacrificial */}
                <div className="emergency-strategy">
                  <div className="emergency-strategy-header">
                    <span className="emergency-strategy-label">Strategy A</span>
                    <span className="emergency-strategy-name">Sacrificial</span>
                  </div>
                  <p className="emergency-strategy-desc">
                    Permanently cut high-load relays to bring consumption within budget.
                    Priority appliances remain powered continuously.
                  </p>
                  <div className="emergency-relay-list">
                    {budget.sacrificialCuts.map(item => (
                      <div key={item.index} className="emergency-relay-item cut">
                        <div className="emergency-relay-info">
                          <span className="emergency-relay-name">{item.name}</span>
                          <span className="emergency-relay-draw">{item.watts}W ({item.amps.toFixed(2)}A)</span>
                        </div>
                        <button
                          className="emergency-cut-btn"
                          onClick={() => onToggleRelay(item.index, false)}
                          id={`emergency-cut-${item.index}`}
                        >
                          Cut Relay {item.index + 1}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="emergency-after">
                    After cuts: {budget.remainingAfterCuts}W (budget: {budget.hourlyBudgetW}W)
                  </p>
                </div>

                {/* Strategy B: Alternating */}
                <div className="emergency-strategy">
                  <div className="emergency-strategy-header">
                    <span className="emergency-strategy-label">Strategy B</span>
                    <span className="emergency-strategy-name">Alternating</span>
                  </div>
                  <p className="emergency-strategy-desc">
                    Rotate power between appliance groups in {budget.slotMinutes}-minute intervals.
                    All appliances receive power, but not simultaneously.
                  </p>
                  <div className="emergency-relay-list">
                    {budget.alternatingGroups.map((group, gi) => (
                      <div key={gi} className="emergency-group">
                        <span className="emergency-group-label">
                          Slot {gi + 1} ({budget.slotMinutes} min)
                        </span>
                        <div className="emergency-group-items">
                          {group.map(item => (
                            <span key={item.index} className="emergency-group-tag">
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!budget.overBudget && (
              <div className="emergency-ok">
                <p>Current consumption ({budget.totalCurrentW}W) is within the {budget.hourlyBudgetW}W hourly budget. No load shedding required to meet your {budget.hours}-hour target.</p>
              </div>
            )}

            <button className="btn-secondary" onClick={() => setSubmitted(false)} style={{ marginTop: 16 }}>
              Recalculate
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
