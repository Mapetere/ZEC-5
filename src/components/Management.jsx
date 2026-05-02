import { useState, useEffect } from 'react';

/**
 * Management — Appliance Profiling page.
 * Users assign names and metadata to the 5 ADC sensor channels.
 */
const DEFAULTS = [
  { name: 'Fridge', type: 'Continuous', maxLoad: '1.8' },
  { name: 'Geyser', type: 'Cyclic', maxLoad: '9.0' },
  { name: 'Borehole', type: 'Scheduled', maxLoad: '5.0' },
  { name: 'Entertainment', type: 'Variable', maxLoad: '2.0' },
  { name: 'Lighting', type: 'Variable', maxLoad: '1.2' },
];

export default function Management({ profiles, onSave, onResetSetup }) {
  const [formData, setFormData] = useState(profiles || DEFAULTS);
  const [savedIndex, setSavedIndex] = useState(-1);

  useEffect(() => {
    if (profiles) setFormData(profiles);
  }, [profiles]);

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

  return (
    <div className="fade-in">
      <div className="section-title"><span className="dot" /> Appliance Profiling</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        Map sensor channels to domestic appliances. Names assigned here propagate to the dashboard gauges and inference alerts.
      </p>
      <div className="mgmt-grid">
        {formData.map((item, i) => (
          <div key={i} className="mgmt-card">
            <div className="mgmt-card-header">
              <div className="mgmt-channel-badge">S{i + 1}</div>
              <div className="mgmt-card-title">Sensor Channel {i + 1}</div>
            </div>
            <div className="mgmt-input-group">
              <label htmlFor={`mgmt-name-${i}`}>Appliance Name</label>
              <input
                id={`mgmt-name-${i}`}
                className="mgmt-input"
                type="text"
                value={item.name}
                onChange={(e) => handleChange(i, 'name', e.target.value)}
                placeholder="e.g. Fridge"
              />
            </div>
            <div className="mgmt-input-group">
              <label htmlFor={`mgmt-type-${i}`}>Load Type</label>
              <input
                id={`mgmt-type-${i}`}
                className="mgmt-input"
                type="text"
                value={item.type}
                onChange={(e) => handleChange(i, 'type', e.target.value)}
                placeholder="e.g. Continuous, Cyclic"
              />
            </div>
            <div className="mgmt-input-group">
              <label htmlFor={`mgmt-load-${i}`}>Max Expected Load (A)</label>
              <input
                id={`mgmt-load-${i}`}
                className="mgmt-input"
                type="text"
                value={item.maxLoad}
                onChange={(e) => handleChange(i, 'maxLoad', e.target.value)}
                placeholder="e.g. 5.0"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="mgmt-save" onClick={() => handleSave(i)} id={`mgmt-save-${i}`}>
                Save Profile
              </button>
              <span className={`mgmt-saved ${savedIndex === i ? 'visible' : ''}`}>
                Saved
              </span>
            </div>
          </div>
        ))}
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
