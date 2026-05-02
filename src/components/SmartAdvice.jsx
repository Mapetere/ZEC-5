/**
 * SmartAdvice — Phase 2 only (post Day 7).
 * Recommendations include embedded relay controls.
 * "Accept Advice" triggers a relay cut — the ONLY place relays are exposed.
 */
export default function SmartAdvice({ alerts, relays, onAcceptAdvice, visible, onClose }) {
  if (!visible) return null;

  const actionableAlerts = (alerts || []).filter(a => a.type !== 'info');

  return (
    <div className="advice-overlay" onClick={onClose}>
      <aside className="advice-panel slide-in" onClick={e => e.stopPropagation()}>
        <div className="advice-header">
          <div className="advice-title-row">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <h3>Smart Advice</h3>
          </div>
          <button className="advice-close" onClick={onClose} id="advice-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="advice-list">
          {actionableAlerts.length === 0 && (
            <div className="advice-empty">
              <div className="advice-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p>All systems operating within target parameters. No intervention required.</p>
            </div>
          )}

          {actionableAlerts.map((alert) => (
            <div key={alert.id} className={`advice-card ${alert.type}`}>
              <div className="advice-card-header">
                <span className={`advice-severity ${alert.type}`}>
                  {alert.type === 'danger' ? 'CRITICAL' : 'ADVISORY'}
                </span>
              </div>
              <h4 className="advice-card-title">{alert.title}</h4>
              <p className="advice-card-msg">{alert.message}</p>

              {alert.actionable && alert.relayIndex != null && (
                <div className="advice-card-action">
                  <div className="advice-relay-status">
                    <span className="advice-relay-label">Relay {alert.relayIndex + 1} | {alert.sensorName || 'Channel'}</span>
                    <span className={`advice-relay-state ${relays?.[alert.relayIndex] ? 'on' : 'off'}`}>
                      {relays?.[alert.relayIndex] ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                  <button
                    className="advice-accept-btn"
                    onClick={() => onAcceptAdvice(alert.relayIndex)}
                    id={`advice-accept-${alert.relayIndex}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    Accept Advice | Shed Load
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
