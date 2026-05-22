import React from 'react';

export default function EmergencyInterceptModal({ kwhRemaining, onKeepSchedule, onAutoShed, onOpenAdvice }) {
  return (
    <div className="hw-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="emergency-panel fade-in" style={{ borderColor: 'var(--alert-red)' }}>
        <div className="emergency-header" style={{ background: 'rgba(255, 61, 0, 0.1)', padding: '16px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(255, 61, 0, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 61, 0, 0.2)', padding: '8px', borderRadius: '50%', color: 'var(--alert-red)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="emergency-title" style={{ margin: 0, color: 'var(--alert-red)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Critical Emergency Threshold
            </h3>
          </div>
        </div>

        <div style={{ padding: '24px 20px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
            Your prepaid balance has dropped to a critical level (<strong style={{ color: 'var(--alert-red)' }}>{kwhRemaining} kWh</strong>). 
            If your current load is maintained, a total blackout is imminent.
          </p>

          <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Please instruct ZET-5 on how to proceed.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Option 1: Auto-Shed */}
            <button 
              onClick={onAutoShed}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 61, 0, 0.15), rgba(255, 61, 0, 0.05))',
                border: '1px solid rgba(255, 61, 0, 0.4)',
                padding: '14px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 61, 0, 0.25)'}
              onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 61, 0, 0.15), rgba(255, 61, 0, 0.05))'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--alert-red)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>ZET-5 Autonomous Protection</strong>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Acknowledge and allow system to immediately shed Tier 3 loads (e.g. Geyser).</span>
              </div>
            </button>

            {/* Option 2: Keep Schedule */}
            <button 
              onClick={onKeepSchedule}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '14px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Keep Existing Configuration</strong>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Maintain current load profile. You accept the risk of rapid depletion.</span>
              </div>
            </button>

            {/* Option 3: Advice Panel */}
            <button 
              onClick={onOpenAdvice}
              style={{
                background: 'transparent',
                border: '1px dashed var(--accent-blue)',
                padding: '14px',
                borderRadius: '8px',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              View Strategic Survival Schedules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
