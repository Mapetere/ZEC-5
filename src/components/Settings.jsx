import { useState } from 'react';

/**
 * Settings — General system configurations, Engineer linkage,
 * WhatsApp assistance, and Diagnostics.
 */
export default function Settings({
  setupData,
  notifyThreshold,
  onThresholdUpdate,
  onResetSetup,
  engineerSetup,
  onGoalUpdate
}) {
  const [thresholdInput, setThresholdInput] = useState(notifyThreshold || 50);
  const [goalInput, setGoalInput] = useState(setupData?.durationGoal || 21);

  const handleThresholdSave = (e) => {
    e.preventDefault();
    onThresholdUpdate(Number(thresholdInput));
  };

  const handleGoalSave = (e) => {
    e.preventDefault();
    onGoalUpdate(Number(goalInput));
  };

  // Construct WhatsApp assistance link
  const engineerPhone = '263774694160';
  const prefilledMessage = encodeURIComponent(
    `Hello Engineer, I need assistance with my ZET-5 Smart Energy Controller. (System Status: Online, Client Email: ${setupData?.tokenData ? 'Configured' : 'Pending'})`
  );
  const whatsappUrl = `https://wa.me/${engineerPhone}?text=${prefilledMessage}`;

  return (
    <div className="fade-in">
      {/* ===== ENGINEER LINK DETAILS ===== */}
      <div className="card full-width" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">ZET-5 Certified Link</span>
          <span className="card-badge" style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}>
            Verified
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', margin: '14px 0' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--accent-blue-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            ZET
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>
              {engineerSetup?.engineerName || 'ZET Certified Engineer'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Registration Code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{engineerSetup?.badgeCode || 'ZET-5-4694'}</span>
            </p>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          This hardware installation was calibrated and verified by a registered professional engineer under the ZET-5 telemetry guidelines.
        </p>
      </div>

      {/* ===== CALL FOR ASSISTANCE (WhatsApp) ===== */}
      <div className="card full-width" style={{ marginBottom: 28, border: '1px solid rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.03)' }}>
        <div className="card-header">
          <span className="card-title" style={{ color: 'var(--accent-green)' }}>Need Support?</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: '1.6' }}>
          Having trouble with the controller mapping or threshold configurations? Direct-dial the certified installer on WhatsApp for remote assistance.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="meter-sync-btn"
          style={{
            display: 'inline-flex',
            width: 'auto',
            padding: '12px 28px',
            background: 'linear-gradient(135deg, var(--accent-green), #128C7E)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            textDecoration: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          id="btn-whatsapp-assist"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.426.002 9.843-4.411 9.846-9.843.002-2.632-1.02-5.107-2.877-6.967-1.857-1.859-4.336-2.88-6.97-2.88-5.433 0-9.851 4.417-9.854 9.849-.001 1.716.452 3.39 1.308 4.869l-.993 3.626 3.747-.981zm11.587-6.812c-.319-.16-1.89-.933-2.185-1.04-.295-.108-.51-.16-.724.162-.213.32-.828 1.04-.1.16-.107 1.23.05.213-.082.32-.426.724-.162 1.157.067.432.228.706.326.983.108.277.054.484-.027.644-.08.16-.724 1.76-.724 2.41 0 .611.23.855.432.983.201.127.43.162.61.162.18 0 .375-.027.563-.027.671 0 1.258-.27 1.528-1.04.27-.77.27-1.428.19-1.562-.08-.135-.295-.213-.611-.373z"/>
          </svg>
          Call for Assistance
        </a>
      </div>

      {/* ===== TARGET GOAL & THRESHOLD CARD ===== */}
      <div className="card full-width" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">Target Goal & Alert Threshold</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: '1.6' }}>
          Configure your target duration goal and the low-energy warning threshold for ZET-5 calculations.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Form 1: Duration Goal */}
          <form onSubmit={handleGoalSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>Target Duration Goal</label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Specify the number of days you want your ZESA prepaid tokens to last.</span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: 'auto' }}>
              <div className="login-input-wrap" style={{ margin: 0, width: '100px' }}>
                <input
                  type="number"
                  className="login-input"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  style={{ textAlign: 'center' }}
                  min="1"
                  max="365"
                  id="settings-goal-input"
                />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Days</span>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }} id="btn-save-goal">
                Save Goal
              </button>
            </div>
          </form>

          {/* Form 2: Recommendation Threshold */}
          <form onSubmit={handleThresholdSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>Low-Energy Alert Threshold</label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Threshold in kWh below which ZET-5 warns you of potential budget depletion.</span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: 'auto' }}>
              <div className="login-input-wrap" style={{ margin: 0, width: '100px' }}>
                <input
                  type="number"
                  className="login-input"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  style={{ textAlign: 'center' }}
                  min="1"
                  id="settings-threshold-input"
                />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kWh</span>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }} id="btn-save-threshold">
                Save Alert
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ===== DIAGNOSTICS & RESET ===== */}
      <div className="card full-width">
        <div className="card-header">
          <span className="card-title" style={{ color: 'var(--alert-red)' }}>Diagnostics & Unlink</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: '1.6' }}>
          Unlinking the client account will clear all locally cached telemetry history, reset appliance calibrations, and return the console to the initial Engineer Authentication setup.
        </p>
        <button
          onClick={onResetSetup}
          className="btn-secondary"
          style={{ width: 'auto', padding: '10px 20px', borderColor: 'var(--alert-red)', color: 'var(--alert-red)' }}
          id="btn-unlink-reset"
        >
          Unlink System (Factory Reset)
        </button>
      </div>
    </div>
  );
}
