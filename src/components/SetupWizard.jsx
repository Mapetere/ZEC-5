import { useState } from 'react';

/**
 * SetupWizard — First-Run onboarding flow.
 * Step 1: Name 5 sensors
 * Step 2: ZESA token data (kWh, Amount, Date)
 * Step 3: Duration Goal
 * Strictly professional — no emojis.
 */
const DEFAULT_NAMES = ['Fridge', 'Geyser', 'Borehole', 'Entertainment', 'Lighting'];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [sensorNames, setSensorNames] = useState(DEFAULT_NAMES.map(n => n));
  const [tokenData, setTokenData] = useState({ kwh: '', amount: '', date: '' });
  const [durationGoal, setDurationGoal] = useState('21');
  const [error, setError] = useState('');

  const steps = [
    { label: 'Sensors', num: '01' },
    { label: 'Token', num: '02' },
    { label: 'Goal', num: '03' },
  ];

  const handleNext = () => {
    setError('');
    if (step === 0) {
      if (sensorNames.some(n => !n.trim())) {
        setError('Please name all 5 sensor channels.');
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
    } else if (step === 2) {
      if (!durationGoal || isNaN(Number(durationGoal)) || Number(durationGoal) < 1) {
        setError('Please enter a valid duration (days).');
        return;
      }
      const setupData = {
        sensorNames,
        tokenData: {
          kwh: parseFloat(tokenData.kwh),
          amount: parseFloat(tokenData.amount),
          date: tokenData.date,
        },
        durationGoal: parseInt(durationGoal),
        setupDate: new Date().toISOString(),
        calibrationStart: new Date().toISOString(),
      };
      localStorage.setItem('zec5_setup', JSON.stringify(setupData));
      onComplete(setupData);
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="login-wrapper">
      <div className="setup-card fade-in">
        {/* Header */}
        <div className="login-logo" style={{ marginBottom: 4 }}>
          <div className="login-logo-icon">ZEC</div>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>
            ZEC<span style={{ color: 'var(--accent-blue)' }}>-5</span>
          </h1>
        </div>
        <p className="login-subtitle" style={{ marginBottom: 24 }}>First-Run Configuration</p>

        {/* Progress Steps */}
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

        {/* Step 1: Name Sensors */}
        {step === 0 && (
          <div className="setup-body">
            <h3 className="setup-heading">Sensor Mapping</h3>
            <p className="setup-desc">Assign appliance names to each of the 5 current sensor inputs.</p>
            {sensorNames.map((name, i) => (
              <div key={i} className="setup-sensor-row">
                <div className="setup-sensor-badge">S{i + 1}</div>
                <input
                  className="login-input"
                  type="text"
                  value={name}
                  onChange={e => {
                    const next = [...sensorNames];
                    next[i] = e.target.value;
                    setSensorNames(next);
                  }}
                  placeholder={`Sensor ${i + 1} name`}
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
              <input
                className="login-input"
                type="text"
                inputMode="decimal"
                value={tokenData.kwh}
                onChange={e => setTokenData(d => ({ ...d, kwh: e.target.value }))}
                placeholder="e.g. 150"
                id="setup-kwh"
              />
            </div>
            <label className="login-label">Amount Paid (ZWL / USD)</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="text"
                inputMode="decimal"
                value={tokenData.amount}
                onChange={e => setTokenData(d => ({ ...d, amount: e.target.value }))}
                placeholder="e.g. 25.00"
                id="setup-amount"
              />
            </div>
            <label className="login-label">Purchase Date</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="date"
                value={tokenData.date}
                onChange={e => setTokenData(d => ({ ...d, date: e.target.value }))}
                id="setup-date"
              />
            </div>
          </div>
        )}

        {/* Step 3: Duration Goal */}
        {step === 2 && (
          <div className="setup-body">
            <h3 className="setup-heading">Duration Goal</h3>
            <p className="setup-desc">How many days should this token last? ZEC-5 will optimize consumption to meet this target.</p>
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
              <p className="setup-goal-hint">
                Average household: 21-30 days per token
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
            {step === 2 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
