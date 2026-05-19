import { useState, useEffect } from 'react';

/**
 * Management — Appliance Profiling + System Configuration.
 * Includes notification threshold setting and setup reset.
 */
const DEFAULTS = [
  { name: 'Fridge', type: 'Continuous', maxLoad: '1.8' },
  { name: 'Geyser', type: 'Cyclic', maxLoad: '9.0' },
  { name: 'Borehole', type: 'Scheduled', maxLoad: '5.0' },
  { name: 'Entertainment', type: 'Variable', maxLoad: '2.0' },
  { name: 'Lighting', type: 'Variable', maxLoad: '1.2' },
];

export default function Management({ profiles, onSave, onResetSetup, notifyThreshold, onThresholdUpdate, onRecharge, onSyncMeter, engineState }) {
  const [formData, setFormData] = useState(profiles || DEFAULTS);
  const [savedIndex, setSavedIndex] = useState(-1);
  const [threshold, setThreshold] = useState(String(notifyThreshold || 50));
  const [thresholdSaved, setThresholdSaved] = useState(false);
  const [showRechargeDetails, setShowRechargeDetails] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  useEffect(() => {
    if (profiles) setFormData(profiles);
  }, [profiles]);

  useEffect(() => {
    setThreshold(String(notifyThreshold || 50));
  }, [notifyThreshold]);

  const handleChange = (index, field, value) => {
    const next = [...formData];
    next[index] = { ...next[index], [field]: value };
    setFormData(next);
  };

  const handleSave = (index) => {
    onSave(formData);
    setSavedIndex(index);
    setTimeout(() => setSavedIndex(-1), 2000);
  };

  const handleThresholdSave = () => {
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid positive threshold greater than 0.');
      return;
    }
    
    // Check if threshold exceeds available units
    const unitsRemaining = engineState ? (engineState.tokenKwh - engineState.cumulativeKwh) : 0;
    if (unitsRemaining > 0 && val >= unitsRemaining) {
      alert(`Notification threshold (${val} kWh) cannot exceed or equal your available units (${unitsRemaining.toFixed(1)} kWh).`);
      return;
    }
    
    if (onThresholdUpdate) {
      onThresholdUpdate(val);
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 2000);
    }
  };

  return (
    <div className="fade-in">
      <div className="section-title"><span className="dot" /> Appliance Profiling</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, inlineHeight: 1.6 }}>
        Domestic appliance sensor mappings linked to physical clamping channels.
      </p>

      {/* Locked configuration banner */}
      <div className="card full-width" style={{ border: '1px solid rgba(255, 179, 0, 0.3)', background: 'rgba(255, 179, 0, 0.03)', marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--warning-amber)', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Locked Configuration
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
          This metrology and circuit mapping configuration was calibrated and locked during installation by your ZET-5 Certified Engineer. Residents cannot modify these channels. Please contact your certified installer to adjust physical clamping sensors or rename circuits.
        </p>
      </div>

      <div className="mgmt-grid" style={{ marginBottom: 28 }}>
        {formData.map((item, i) => (
          <div key={i} className="mgmt-card" style={{ opacity: 0.95, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Locked
            </div>
            <div className="mgmt-card-header">
              <div className="mgmt-channel-badge">S{i + 1}</div>
              <div className="mgmt-card-title">Sensor Channel {i + 1}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>Appliance Name</span>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>{item.name}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>Load Profile Type</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.type}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>Max Expected Load</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.maxLoad || item.base || '0.0'} A</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification Threshold */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
        <div className="section-title"><span className="dot" /> Notification Trigger</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Set the energy level at which ZET-5 starts sending recommendations.
          Alerts will only fire if the depletion trend also predicts running out before your target date.
        </p>
        <div className="threshold-config">
          <label className="threshold-config-label">Start recommendations when remaining units fall below</label>
          <div className="threshold-config-row">
            <input
              className="mgmt-input threshold-input"
              type="text"
              inputMode="numeric"
              value={threshold}
              onChange={e => setThreshold(e.target.value.replace(/[^\d.]/g, ''))}
              id="mgmt-threshold"
            />
            <span className="threshold-config-unit">kWh</span>
            <button className="mgmt-save" onClick={handleThresholdSave} id="mgmt-threshold-save">
              Update
            </button>
            <span className={`mgmt-saved ${thresholdSaved ? 'visible' : ''}`}>Saved</span>
          </div>
        </div>
      </div>

      {/* Prepaid ZESA Token Recharge & Sync Card */}
      <div id="recharge-section" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
        <div className="section-title"><span className="dot" /> Prepaid Meter Recharge & Sync</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Manage your prepaid ZESA units. Perform active token recharges or sync actual physical meter readings to auto-calibrate metrology drift.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 12 }}>
          
          {/* Card A: Recharge */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>Option A: Load ZESA Recharge</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Bought new electricity tokens? Enter the units (kWh) here to add them straight to your active balance.
              </p>
              
              {/* Progressive Disclosure Toggle */}
              <button 
                onClick={() => setShowRechargeDetails(!showRechargeDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {showRechargeDetails ? 'Hide technical explanation' : 'Read more about engine impact'}
              </button>

              {showRechargeDetails && (
                <div style={{
                  background: 'rgba(52, 152, 219, 0.05)',
                  borderLeft: '2px solid var(--accent-blue)',
                  padding: '10px 12px',
                  borderRadius: '0 6px 6px 0',
                  marginBottom: '16px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>How Recharge Affects the Engine:</strong>
                  Loading a token performs a direct step-up linear addition of prepaid kWh units (E_balance = E_balance + Units). It resets the continuous integration accumulators (integral of P dt = 0) and extends the knapsack model's target budget, triggering an instant recalculation of all dynamic appliance recipes without modifying the learned drift correction factor.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="number" 
                placeholder="kWh to load (e.g. 100)" 
                id="mgmt-recharge-input"
                className="mgmt-input"
                style={{ flex: 1 }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('mgmt-recharge-input');
                  const val = parseFloat(input?.value);
                  if (isNaN(val) || val <= 0) {
                    alert("Please enter a valid positive token amount greater than 0.");
                    return;
                  }
                  if (onRecharge) {
                    onRecharge(val);
                    if (input) input.value = '';
                    alert(`Successfully loaded ${val} kWh token onto ZET-5!`);
                  }
                }}
                className="mgmt-save"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Load Token
              </button>
            </div>
          </div>

          {/* Card B: Drift Sync */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>Option B: Calibrate Metrology (Sync)</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Notice a slight drift? Type in the exact reading from your physical prepaid meter to recalibrate accuracy.
              </p>

              {/* Progressive Disclosure Toggle */}
              <button 
                onClick={() => setShowSyncDetails(!showSyncDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {showSyncDetails ? 'Hide technical explanation' : 'Read more about engine impact'}
              </button>

              {showSyncDetails && (
                <div style={{
                  background: 'rgba(52, 152, 219, 0.05)',
                  borderLeft: '2px solid var(--accent-blue)',
                  padding: '10px 12px',
                  borderRadius: '0 6px 6px 0',
                  marginBottom: '16px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>How Syncing Affects the Engine:</strong>
                  Syncing applies a closed-loop feedback correction. It calculates metrology scaling drift between estimates and reality, updating the scaling multiplier ($\kappa$) via a rolling exponential filter. This recalibrates the active metrology layer so all subsequent real-time power estimations are far more accurate!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="number" 
                placeholder="Actual kWh (e.g. 87.3)" 
                id="mgmt-sync-input"
                className="mgmt-input"
                style={{ flex: 1 }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('mgmt-sync-input');
                  const val = parseFloat(input?.value);
                  if (isNaN(val) || val <= 0) {
                    alert("Please enter a valid positive meter reading greater than 0.");
                    return;
                  }
                  if (onSyncMeter) {
                    const res = onSyncMeter(val);
                    if (res && input) {
                      input.value = '';
                      alert(`Metrology calibrated! New drift scaling factor: ×${res.correctionFactor.toFixed(3)}`);
                    }
                  }
                }}
                className="mgmt-save"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Sync Drift
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Reset Setup */}
      {onResetSetup && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
          <div className="section-title"><span className="dot" /> System Configuration</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Re-run the first-time setup to update ZESA token data, duration goals, or sensor names.
          </p>
          <button className="btn-secondary" onClick={onResetSetup} id="mgmt-reset-setup">
            Re-run Setup Wizard
          </button>
        </div>
      )}
    </div>
  );
}
