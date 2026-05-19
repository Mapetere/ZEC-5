import { useState, useMemo } from 'react';

/**
 * SetupWizard — First-Run onboarding flow.
 * Step 1: Name 5 sensors
 * Step 2: ZESA token data (kWh, Amount, Date)
 * Step 3: Duration Goal (days input OR target date picker)
 * Step 4: Notification Trigger threshold
 */
const DEFAULT_NAMES = ['Fridge', 'Geyser', 'Borehole', 'Entertainment', 'Lighting'];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [sensorNames, setSensorNames] = useState(DEFAULT_NAMES.map(n => n));
  const [tokenData, setTokenData] = useState({ kwh: '', amount: '', date: '' });
  const [goalMode, setGoalMode] = useState('days'); // 'days' | 'date'
  const [durationGoal, setDurationGoal] = useState('21');
  const [targetDate, setTargetDate] = useState('');
  const [notifyThreshold, setNotifyThreshold] = useState('50');
  const [dateConsent, setDateConsent] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { label: 'Circuits', num: '01' },
    { label: 'Token', num: '02' },
    { label: 'Goal', num: '03' },
    { label: 'Alerts', num: '04' },
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
    return d.toISOString().split('T')[0];
  }, []);

  const handleNext = () => {
    setError('');
    if (step === 0) {
      if (sensorNames.some(n => !n.trim())) {
        setError('Please name all 5 circuit loops.');
        return;
      }
    } else if (step === 1) {
      if (!tokenData.kwh || !tokenData.amount || !tokenData.date) {
        setError('Please fill in all ZESA token fields.');
        return;
      }
      if (isNaN(Number(tokenData.kwh)) || isNaN(Number(tokenData.amount))) {
        setError('kWh and Amount must be numbers.');
        return;
      }
      if (!dateConsent) {
        setError('Please acknowledge the strict date requirement to continue.');
        return;
      }
    } else if (step === 2) {
      if (goalMode === 'days') {
        if (!durationGoal || isNaN(Number(durationGoal)) || Number(durationGoal) < 1) {
          setError('Please enter a valid duration (days).');
          return;
        }
      } else {
        if (!targetDate || !computedDays) {
          setError('Please select a future target date.');
          return;
        }
      }
    } else if (step === 3) {
      if (!notifyThreshold || isNaN(Number(notifyThreshold)) || Number(notifyThreshold) < 1) {
        setError('Please enter a valid threshold (kWh).');
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
        setupDate: new Date().toISOString(),
        calibrationStart: new Date().toISOString(),
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
        <p className="login-subtitle" style={{ marginBottom: 24 }}>First-Run Configuration</p>

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

        {/* Step 1: Name Circuits */}
        {step === 0 && (
          <div className="setup-body">
            <h3 className="setup-heading">Monitored Loops</h3>
            <p className="setup-desc">Assign appliance names to each of the 5 active circuit loops.</p>
            {sensorNames.map((name, i) => (
              <div key={i} className="setup-sensor-row">
                <div className="setup-sensor-badge">C{i + 1}</div>
                <input
                  className="login-input"
                  type="text"
                  value={name}
                  onChange={e => {
                    const next = [...sensorNames];
                    next[i] = e.target.value;
                    setSensorNames(next);
                  }}
                  placeholder={`Circuit ${i + 1} name`}
                  id={`setup-sensor-${i}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 2: ZESA Token Data */}
        {step === 1 && (
          <div className="setup-body">
            <h3 className="setup-heading">ZESA Token Entry</h3>
            <p className="setup-desc">Enter your most recent electricity token purchase for depletion tracking.</p>
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
            <label className="login-label">Purchase Date</label>
            <div className="login-input-wrap">
              <input className="login-input" type="date" value={tokenData.date}
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

        {/* Step 3: Duration Goal — Days OR Target Date */}
        {step === 2 && (
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
                <label className="login-label">I want this to last until</label>
                <div className="login-input-wrap">
                  <input
                    className="login-input"
                    type="date"
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

        {/* Step 4: Notification Trigger */}
        {step === 3 && (
          <div className="setup-body">
            <h3 className="setup-heading">Notification Trigger</h3>
            <p className="setup-desc">
              Set the energy threshold at which ZET-5 should start sending recommendations.
              The system will remain silent above this level.
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
            {step === 3 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
