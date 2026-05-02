/**
 * RelayControl — Interactive 8-channel relay toggle grid.
 */
export default function RelayControl({ relays, onToggle }) {
  const relayNames = [
    'Main Supply', 'Geyser', 'Borehole', 'Kitchen',
    'Lighting', 'Entertainment', 'Garage', 'Auxiliary'
  ];

  return (
    <div className="fade-in">
      <div className="section-title"><span className="dot" /> Relay Control Grid</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        Manually override power distribution across 8 channels. Toggle relays to shed or restore load based on inference recommendations.
      </p>
      <div className="relay-grid">
        {(relays || Array(8).fill(false)).map((state, i) => (
          <div key={i} className={`relay-card ${state ? 'on' : ''}`}>
            <div className="relay-number">Relay {String(i + 1).padStart(2, '0')}</div>
            <div className="relay-name">{relayNames[i]}</div>
            <div className={`relay-status ${state ? 'on' : 'off'}`}>
              {state ? '● ACTIVE' : '○ IDLE'}
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
