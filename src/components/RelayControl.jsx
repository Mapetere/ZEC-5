/**
 * RelayControl — Interactive 5-channel relay toggle grid.
 */
export default function RelayControl({ relays, onToggle, profiles }) {
  const defaultNames = ['Main Supply', 'Geyser', 'Borehole', 'Entertainment', 'Lighting'];

  return (
    <div className="fade-in">
      <div className="section-title"><span className="dot" /> Relay Control Grid</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        Manually override power distribution across 5 channels. Toggle relays to shed or restore load based on inference recommendations.
      </p>
      <div className="relay-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {(relays || Array(5).fill(false)).slice(0, 5).map((state, i) => (
          <div key={i} className={`relay-card ${state ? 'on' : ''}`}>
            <div className="relay-number">Relay {String(i + 1).padStart(2, '0')}</div>
            <div className="relay-name">{profiles?.[i]?.name || defaultNames[i]}</div>
            <div className={`relay-status ${state ? 'on' : 'off'}`}>
              {state ? 'ACTIVE' : 'IDLE'}
            </div>
            <div className="toggle-wrap">
              <button
                className={`toggle ${state ? 'on' : ''}`}
                onClick={() => onToggle(i, !state)}
                id={`relay-toggle-${i}`}
                aria-label={`Toggle relay ${i + 1}`}
              >
                <div className="toggle-knob" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
