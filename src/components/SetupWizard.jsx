import { useState, useMemo, useEffect } from 'react';

/**
 * SetupWizard — Client-side onboarding flow.
 * Skips the circuit naming step (done by the engineer) and gathers:
 * Step 1: ZESA token data (kWh, Amount, Date)
 * Step 2: Duration Goal (days input OR target date picker)
 * Step 3: Notification Trigger threshold
 */
export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [tokenData, setTokenData] = useState({ kwh: '', amount: '', date: '' });
  const [goalMode, setGoalMode] = useState('days'); // 'days' | 'date'
  const [durationGoal, setDurationGoal] = useState('21');
  const [targetDate, setTargetDate] = useState('');
  const [notifyThreshold, setNotifyThreshold] = useState('50');
  const [emergencyThreshold, setEmergencyThreshold] = useState('5');
  const [autoShedEmergency, setAutoShedEmergency] = useState(true);
  const [dateConsent, setDateConsent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const wrapper = document.querySelector('.login-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
  }, [step]);

  // Retrieve sensor names configured by the engineer
  const sensorNames = useMemo(() => {
    try {
      const engProfs = JSON.parse(localStorage.getItem('zet5_profiles'));
      if (engProfs) return engProfs.map(p => p.name);
    } catch {}
    return ['Fridge', 'Geyser', 'Borehole', 'Entertainment', 'Lighting'];
  }, []);

  const steps = [
    { label: 'Token', num: '01' },
    { label: 'Goal', num: '02' },
    { label: 'Alerts', num: '03' },
  ];

  // Compute days from target date
  const computedDays = useMemo(() => {
    if (goalMode !== 'date' || !targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }, [goalMode, targetDate]);

  // Default min date for date picker (tomorrow)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    return `${dateStr}T00:00`;
  }, []);

  const handleNext = () => {
    setError('');
    if (step === 0) {
      const kwhNum = Number(tokenData.kwh);
      const amountNum = Number(tokenData.amount);
      if (!tokenData.kwh || !tokenData.amount || !tokenData.date) {
        setError('Please fill in all ZESA token fields.');
        return;
      }
      if (isNaN(kwhNum) || isNaN(amountNum) || kwhNum <= 0 || amountNum <= 0) {
        setError('kWh and Amount must be valid positive numbers greater than 0.');
        return;
      }
      if (!dateConsent) {
        setError('Please acknowledge the strict date requirement to continue.');
        return;
      }
      const halfKwh = Math.round(kwhNum * 0.5);
      setNotifyThreshold(halfKwh.toString());
    } else if (step === 1) {
      if (goalMode === 'days') {
        if (!durationGoal || isNaN(Number(durationGoal)) || Number(durationGoal) < 1) {
          setError('Please enter a valid duration of at least 1 day.');
          return;
        }
      } else {
        if (!targetDate || !computedDays) {
          setError('Please select a valid future target date.');
          return;
        }
      }
    } else if (step === 2) {
      const threshold = Number(notifyThreshold);
      const emergThresh = Number(emergencyThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        setError('Please enter a valid positive threshold (kWh).');
        return;
      }
      if (isNaN(emergThresh) || emergThresh <= 0) {
        setError('Please enter a valid emergency threshold (kWh).');
        return;
      }
      if (threshold >= Number(tokenData.kwh)) {
        setError(`Notification threshold (${threshold} kWh) cannot exceed or equal your available units (${tokenData.kwh} kWh).`);
        return;
      }
      if (emergThresh >= threshold) {
        setError(`Emergency threshold (${emergThresh} kWh) must be strictly lower than the notification threshold (${threshold} kWh).`);
        return;
      }
      const finalDays = goalMode === 'date' ? computedDays : parseInt(durationGoal);
      const setupData = {
        sensorNames,
        tokenData: {
          kwh: parseFloat(tokenData.kwh),
          amount: parseFloat(tokenData.amount),
          date: tokenData.date,
        },
        durationGoal: finalDays,
        targetDate: goalMode === 'date' ? targetDate : null,
        notifyThreshold: parseFloat(notifyThreshold),
        emergencyThreshold: parseFloat(emergencyThreshold),
        autoShedEmergency: autoShedEmergency,
        setupDate: new Date().toISOString(),
      };
      localStorage.setItem('zet5_setup', JSON.stringify(setupData));
      onComplete(setupData);
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="login-wrapper">
      <div className="setup-card fade-in">
        <div className="login-logo" style={{ marginBottom: 4 }}>
          <div className="login-logo-icon">ZET</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 400, letterSpacing: 2 }}>
            ZET<span style={{ color: 'var(--accent-blue)' }}>-5</span>
          </h1>
        </div>
        <p className="login-subtitle" style={{ marginBottom: 24 }}>Client Configuration</p>

        <div className="setup-steps">
          {steps.map((s, i) => (
            <div key={i} className={`setup-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="setup-step-dot">
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        {/* Step 1: ZESA Token Data */}
        {step === 0 && (
          <div className="setup-body">
            <h3 className="setup-heading">ZESA Token Entry</h3>
            <p className="setup-desc">Enter your most recent electricity token purchase for depletion tracking.</p>

            <div style={{ background: 'rgba(255,179,0,0.1)', border: '1px solid rgba(255, 179, 0, 0.4)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning-amber)', fontWeight: 'bold', fontSize: '12px', marginBottom: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                Best Practice Advice
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, display: 'block' }}>
                For absolute accuracy, complete this setup immediately after loading a fresh ZESA token. If you enter a token bought in the past, ZET-5 won't know how much you've already consumed! (You can fix this discrepancy later using the Meter Sync tool on the dashboard).
              </span>
            </div>

            <label className="login-label">Energy Purchased (kWh)</label>
            <div className="login-input-wrap">
              <input className="login-input" type="text" inputMode="decimal" value={tokenData.kwh}
                onChange={e => setTokenData(d => ({ ...d, kwh: e.target.value }))} placeholder="e.g. 150" id="setup-kwh" />
            </div>
            <label className="login-label">Amount Paid (ZWL / USD)</label>
            <div className="login-input-wrap">
              <input className="login-input" type="text" inputMode="decimal" value={tokenData.amount}
                onChange={e => setTokenData(d => ({ ...d, amount: e.target.value }))} placeholder="e.g. 25.00" id="setup-amount" />
            </div>
            <label className="login-label">Purchase Date & Time</label>
            <div className="login-input-wrap">
              <input className="login-input" type="datetime-local" value={tokenData.date}
                onChange={e => setTokenData(d => ({ ...d, date: e.target.value }))} id="setup-date" />
            </div>
            
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '16px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={dateConsent} 
                onChange={(e) => setDateConsent(e.target.checked)} 
                style={{ marginTop: '4px', accentColor: 'var(--accent-blue)', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--warning-amber)', lineHeight: '1.4' }}>
                I acknowledge that entering an inaccurate date will permanently skew the Rolling Hourly Signature model and cause backsliding in ZET-5's predictive thermodynamic equations.
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Duration Goal — Days OR Target Date */}
        {step === 1 && (
          <div className="setup-body">
            <h3 className="setup-heading">Duration Goal</h3>
            <p className="setup-desc">
              Set your target. Choose between a number of days or a specific target date.
            </p>
            {/* Mode Toggle */}
            <div className="goal-mode-toggle">
              <button
                className={`goal-mode-btn ${goalMode === 'days' ? 'active' : ''}`}
                onClick={() => setGoalMode('days')}
                type="button"
                id="goal-mode-days"
              >
                Number of Days
              </button>
              <button
                className={`goal-mode-btn ${goalMode === 'date' ? 'active' : ''}`}
                onClick={() => setGoalMode('date')}
                type="button"
                id="goal-mode-date"
              >
                Target Date
              </button>
            </div>

            {goalMode === 'days' ? (
              <div className="setup-goal-display">
                <div className="setup-goal-value">
                  <input
                    className="setup-goal-input"
                    type="text"
                    inputMode="numeric"
                    value={durationGoal}
                    onChange={e => setDurationGoal(e.target.value.replace(/\D/g, ''))}
                    id="setup-duration"
                  />
                  <span className="setup-goal-unit">DAYS</span>
                </div>
                <p className="setup-goal-hint">Average household: 21-30 days per token</p>
              </div>
            ) : (
              <div className="setup-goal-display">
                <label className="login-label">I want this to last until (Date & Time)</label>
                <div className="login-input-wrap">
                  <input
                    className="login-input"
                    type="datetime-local"
                    value={targetDate}
                    min={minDate}
                    onChange={e => setTargetDate(e.target.value)}
                    id="setup-target-date"
                  />
                </div>
                {computedDays && (
                  <div className="goal-date-result">
                    <span className="goal-date-days">{computedDays}</span>
                    <span className="goal-date-label">days from today</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Notification Trigger & Emergency */}
        {step === 2 && (
          <div className="setup-body">
            <h3 className="setup-heading">Alerts & Emergencies</h3>
            <p className="setup-desc">
              Set the energy threshold at which ZET-5 should start sending recommendations.
            </p>
            <label className="login-label">Start recommendations when remaining units fall below</label>
            <div className="setup-goal-display">
              <div className="setup-goal-value">
                <input
                  className="setup-goal-input"
                  type="text"
                  inputMode="numeric"
                  value={notifyThreshold}
                  onChange={e => setNotifyThreshold(e.target.value.replace(/\D/g, ''))}
                  id="setup-threshold"
                />
                <span className="setup-goal-unit">kWh</span>
              </div>
              <p className="setup-goal-hint">
                Your token: {tokenData.kwh || '---'} kWh | Suggested: {tokenData.kwh ? Math.round(parseFloat(tokenData.kwh) * 0.5) : '---'} kWh (50%)
              </p>
            </div>

            <label className="login-label" style={{ marginTop: '24px', color: 'var(--alert-red)' }}>Critical Emergency Threshold</label>
            <p className="setup-desc" style={{ marginBottom: '8px' }}>At what point should ZET-5 enter Survival Mode to prevent a complete blackout?</p>
            <div className="setup-goal-display" style={{ padding: '12px' }}>
              <div className="setup-goal-value">
                <input
                  className="setup-goal-input"
                  type="text"
                  inputMode="numeric"
                  value={emergencyThreshold}
                  onChange={e => setEmergencyThreshold(e.target.value.replace(/\D/g, ''))}
                  id="setup-emergency-threshold"
                />
                <span className="setup-goal-unit">kWh</span>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '16px', cursor: 'pointer', background: 'rgba(255,107,107,0.06)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.2)' }}>
              <input 
                type="checkbox" 
                checked={autoShedEmergency} 
                onChange={(e) => setAutoShedEmergency(e.target.checked)} 
                style={{ marginTop: '2px', accentColor: 'var(--alert-red)', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>
                <strong style={{ color: 'var(--alert-red)', display: 'block', marginBottom: '4px' }}>Autonomous Emergency Overrides</strong>
                If enabled, ZET-5 will automatically shed high-load appliances (e.g. Geyser) without asking when the emergency threshold is breached. If disabled, you will only receive a notification.
              </span>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="setup-nav">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => { setStep(s => s - 1); setError(''); }}>
              Back
            </button>
          )}
          <button className="btn-primary" onClick={handleNext} style={{ marginLeft: 'auto' }} id="setup-next">
            {step === 2 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
