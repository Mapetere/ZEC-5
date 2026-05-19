import { useState } from 'react';

/**
 * EngineerSetupPage — Professional installation and telemetry mapping wizard.
 * Enables ZEC-55 / ZET5 authenticated calibration and client registration.
 */
export default function EngineerSetupPage({ onComplete }) {
  const [engineerName, setEngineerName] = useState('');
  const [badgeCode, setBadgeCode] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkFormed, setLinkFormed] = useState(false);

  // Default gadget profiles to be calibrated by the engineer
  const [gadgets, setGadgets] = useState([
    { name: 'Fridge', type: 'Continuous', watts: '350', baseAmps: '1.5' },
    { name: 'Geyser', type: 'Cyclic', watts: '3000', baseAmps: '13.0' },
    { name: 'Borehole', type: 'Scheduled', watts: '1500', baseAmps: '6.5' },
    { name: 'Entertainment', type: 'Variable', watts: '250', baseAmps: '1.1' },
    { name: 'Lighting', type: 'Variable', watts: '150', baseAmps: '0.6' }
  ]);

  const handleGadgetChange = (index, field, value) => {
    const updated = [...gadgets];
    updated[index][field] = value;
    
    // Automatically calculate baseAmps if watts change
    if (field === 'watts') {
      const w = parseFloat(value);
      if (!isNaN(w) && w > 0) {
        updated[index].baseAmps = (w / 230).toFixed(1);
      }
    }
    setGadgets(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!engineerName.trim()) {
      setError('Engineer Name is required.');
      return;
    }
    if (!badgeCode.trim()) {
      setError('ZET5 Registration Badge Code is required.');
      return;
    }
    if (!badgeCode.toUpperCase().startsWith('ZET5-')) {
      setError('Invalid registration. Badge code must follow ZET5 registry formatting (e.g. ZET5-4694).');
      return;
    }
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setError('Please provide a valid client email address to link.');
      return;
    }

    // Verify all gadgets are configured
    for (let i = 0; i < gadgets.length; i++) {
      const g = gadgets[i];
      if (!g.name.trim() || isNaN(Number(g.watts)) || Number(g.watts) <= 0) {
        setError(`Please enter a valid wattage for Channel C${i + 1} (${g.name}).`);
        return;
      }
    }

    setLoading(true);

    // Simulate ZEC-55 / ZET5 cloud register matching and account link creation
    setTimeout(() => {
      setLoading(false);
      setLinkFormed(true);
      
      const engineerData = {
        engineerName,
        badgeCode: badgeCode.toUpperCase(),
        clientEmail: clientEmail.toLowerCase(),
        linkedAt: new Date().toISOString()
      };

      const profiles = gadgets.map((g, i) => ({
        name: g.name,
        type: g.type,
        base: parseFloat(g.baseAmps),
        maxLoad: (parseFloat(g.watts) / 1000).toFixed(1),
        variance: i === 0 ? 0.08 : i === 1 ? 0.15 : i === 2 ? 0.10 : 0.05
      }));

      // Store in localStorage to pass linkage
      localStorage.setItem('zet5_engineer_setup', JSON.stringify(engineerData));
      localStorage.setItem('zet5_profiles', JSON.stringify(profiles));

      // After 2.5 seconds of visual linking state, complete onboarding step
      setTimeout(() => {
        onComplete(engineerData, profiles);
      }, 2500);
    }, 1800);
  };

  if (linkFormed) {
    return (
      <div className="login-wrapper">
        <div className="setup-card fade-in" style={{ textAlign: 'center', padding: '40px 30px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--accent-green-dim)',
            color: 'var(--accent-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 24px'
          }}>
            ✓
          </div>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
            ZEC-55 Link Active
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
            Hardware profiles verified. Link formed with client account:<br />
            <strong style={{ color: 'var(--accent-blue)' }}>{clientEmail.toLowerCase()}</strong>
          </p>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            padding: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            display: 'inline-block'
          }}>
            Redirecting to Client Login Console...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper" style={{ overflowY: 'auto', padding: '40px 20px' }}>
      <div className="setup-card fade-in" style={{ maxWidth: '580px', width: '100%' }}>
        <div className="login-logo" style={{ marginBottom: 4 }}>
          <div className="login-logo-icon" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>ZET5</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 400, letterSpacing: 2 }}>
            ENGINEER<span style={{ color: 'var(--accent-blue)' }}> SETUP</span>
          </h1>
        </div>
        <p className="login-subtitle" style={{ marginBottom: 24 }}>
          Zimbabwe Energy Council ZEC-55 Telemetry Installation
        </p>

        {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Authentication */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
            <h3 className="setup-heading" style={{ fontSize: '14px', color: 'var(--accent-blue)' }}>
              1. Professional Authentication
            </h3>
            
            <label className="login-label">Installer Name</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                placeholder="e.g. Eng. Mapetere"
                required
              />
            </div>

            <label className="login-label">ZET5 Badge Code (Registered ZEC-55)</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="text"
                value={badgeCode}
                onChange={(e) => setBadgeCode(e.target.value)}
                placeholder="e.g. ZET5-4694"
                required
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Only engineers with active ZET5 credentials may calibrate this dashboard.
            </span>
          </div>

          {/* Section 2: Client Link */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
            <h3 className="setup-heading" style={{ fontSize: '14px', color: 'var(--accent-blue)' }}>
              2. Client Account Linking
            </h3>
            <label className="login-label">Resident / Client Email Address</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@zet5.co.zw"
                required
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Creates the official resident profile. The resident will use this email to log in and set up token targets.
            </span>
          </div>

          {/* Section 3: Gadgets Calibration */}
          <div style={{ marginBottom: 24 }}>
            <h3 className="setup-heading" style={{ fontSize: '14px', color: 'var(--accent-blue)', marginBottom: 8 }}>
              3. Telemetry Circuit Calibration
            </h3>
            <p className="setup-desc" style={{ marginBottom: 12 }}>
              Calibrate and name active appliance sensors attached to the 5 physical CT clamps.
            </p>
            <details style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 500 }}>
                📖 Readme: Load Profile Types Explained
              </summary>
              <ul style={{ margin: '8px 0 0 20px', padding: 0, lineHeight: 1.6 }}>
                <li><strong style={{color: '#fff'}}>Continuous:</strong> Always on with a steady draw (e.g., Fridge, Server, Router).</li>
                <li><strong style={{color: '#fff'}}>Cyclic:</strong> Turns on and off at intervals, often thermostat-driven (e.g., Geyser, Heater, AC).</li>
                <li><strong style={{color: '#fff'}}>Scheduled:</strong> Runs for specific, predictable durations when triggered (e.g., Borehole Pump).</li>
                <li><strong style={{color: '#fff'}}>Variable:</strong> Unpredictable, user-driven loads with varying power draw (e.g., TV, Stove).</li>
              </ul>
            </details>

            {gadgets.map((g, i) => (
              <div key={i} style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                padding: '14px',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>CT Clamp Channel C{i + 1}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                    Base Load: {g.baseAmps} A
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2, minWidth: '150px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Appliance Name</div>
                    <input
                      className="login-input"
                      type="text"
                      value={g.name}
                      onChange={(e) => handleGadgetChange(i, 'name', e.target.value)}
                      placeholder="e.g. Fridge"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '90px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Peak Wattage</div>
                    <input
                      className="login-input"
                      type="number"
                      value={g.watts}
                      onChange={(e) => handleGadgetChange(i, 'watts', e.target.value)}
                      placeholder="Watts (W)"
                      style={{ padding: '8px 12px', fontSize: '13px', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: 1.2, minWidth: '110px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Load Profile</div>
                    <select
                      className="login-input"
                      value={g.type}
                      onChange={(e) => handleGadgetChange(i, 'type', e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="Continuous">Continuous</option>
                      <option value="Cyclic">Cyclic</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Variable">Variable</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            id="btn-authenticate-link"
            style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 'bold' }}
          >
            {loading ? 'Validating Registry & Linking...' : 'Authenticate Engineer & Form Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
