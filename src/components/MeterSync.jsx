import { useState } from 'react';

/**
 * MeterSync — Slide-out panel for syncing with the actual ZESA prepaid meter.
 * 
 * WHY:
 * CT clamp readings drift from the actual meter by ±8-15%.
 * Periodically entering the real meter reading lets the system
 * self-correct and improve future estimates.
 * 
 * HOW:
 * User reads the kWh display on their ZESA prepaid meter,
 * enters it here, and the engine recalibrates its correction factor.
 */
export default function MeterSync({ visible, onClose, onSync, engineState }) {
  const [meterReading, setMeterReading] = useState('');
  const [synced, setSynced] = useState(false);
  const [result, setResult] = useState(null);

  if (!visible) return null;

  const handleSync = () => {
    const reading = parseFloat(meterReading);
    if (isNaN(reading) || reading < 0) return;

    const syncResult = onSync(reading);
    setResult(syncResult);
    setSynced(true);
  };

  const handleClose = () => {
    setSynced(false);
    setResult(null);
    setMeterReading('');
    onClose();
  };

  return (
    <div className="advice-overlay" onClick={handleClose}>
      <aside className="meter-sync-panel slide-in" onClick={e => e.stopPropagation()}>
        <div className="advice-header">
          <div className="advice-title-row">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <h3>Meter Sync</h3>
          </div>
          <button className="advice-close" onClick={handleClose} id="meter-sync-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!synced ? (
          <div className="meter-sync-body">
            <div className="meter-sync-info">
              <div className="meter-sync-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <p>
                Read the <strong>kWh remaining</strong> display on your ZESA prepaid meter
                and enter it below. This corrects estimation drift and improves accuracy.
              </p>
            </div>

            {engineState && (
              <div className="meter-sync-comparison">
                <div className="meter-sync-est">
                  <span className="meter-sync-est-label">ZEC-5 Estimate</span>
                  <span className="meter-sync-est-val">
                    {(engineState.tokenKwh - engineState.cumulativeKwh).toFixed(1)} kWh
                  </span>
                </div>
                <div className="meter-sync-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div className="meter-sync-est">
                  <span className="meter-sync-est-label">Actual Meter</span>
                  <span className="meter-sync-est-val meter-sync-input-val">?</span>
                </div>
              </div>
            )}

            <label className="login-label">Meter Reading (kWh Remaining)</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="text"
                inputMode="decimal"
                value={meterReading}
                onChange={e => setMeterReading(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="e.g. 87.3"
                autoFocus
                id="meter-sync-input"
              />
            </div>

            {engineState?.lastSyncDate && (
              <p className="meter-sync-last">
                Last sync: {new Date(engineState.lastSyncDate).toLocaleDateString()} — 
                Correction factor: {engineState.correctionFactor.toFixed(3)}
              </p>
            )}

            <button
              className="btn-primary"
              onClick={handleSync}
              disabled={!meterReading || isNaN(parseFloat(meterReading))}
              id="meter-sync-submit"
            >
              Sync With Meter
            </button>
          </div>
        ) : result ? (
          <div className="meter-sync-body">
            <div className="meter-sync-result">
              <div className="meter-sync-result-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h4>Meter Synced Successfully</h4>

              <div className="meter-sync-result-grid">
                <div className="meter-sync-result-item">
                  <span className="meter-sync-result-label">Actual Remaining</span>
                  <span className="meter-sync-result-val">{parseFloat(meterReading).toFixed(1)} kWh</span>
                </div>
                <div className="meter-sync-result-item">
                  <span className="meter-sync-result-label">Drift Detected</span>
                  <span className="meter-sync-result-val">
                    {result.driftKwh?.toFixed(1) || '0.0'} kWh ({result.driftPct || 0}%)
                  </span>
                </div>
                <div className="meter-sync-result-item">
                  <span className="meter-sync-result-label">Correction Factor</span>
                  <span className="meter-sync-result-val">{result.correctionFactor?.toFixed(3) || '1.000'}</span>
                </div>
                <div className="meter-sync-result-item">
                  <span className="meter-sync-result-label">Confidence</span>
                  <span className="meter-sync-result-val confidence-high">100%</span>
                </div>
              </div>

              <p className="meter-sync-result-note">
                Future estimates will be adjusted by the correction factor.
                Sync again in 2-3 days for best accuracy.
              </p>
            </div>

            <button className="btn-primary" onClick={handleClose} style={{ marginTop: 16 }}>
              Close
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
