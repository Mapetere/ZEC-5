export default function DepletionModal({ visible, onGoToRecharge }) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(10, 14, 16, 0.98)',
      backdropFilter: 'blur(35px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card slide-in" style={{
        maxWidth: '420px',
        width: '100%',
        background: 'rgba(20, 28, 33, 0.75)',
        border: '1px solid rgba(255, 107, 107, 0.4)',
        borderRadius: '16px',
        padding: '36px 30px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        
        {/* SUBTLE WARNING ICON */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255, 107, 107, 0.08)',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--alert-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: 10, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.02em' }}>
          PREPAID TOKEN EXHAUSTED
        </h2>
        
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: 28, padding: '0 10px' }}>
          Your prepaid energy token balance has depleted to <strong>0.00 kWh</strong>. 
          Non-essential residential loops have been isolated to protect backup circuits.
        </p>

        {/* PRIMARY CTA: MAGETSI */}
        <a 
          href="https://magetsi.co.zw/zesa" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px',
            background: 'var(--accent-green)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '13px',
            marginBottom: '14px',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Purchase Token on Magetsi
        </a>

        {/* SECONDARY CTA: SWITCH TO MANAGEMENT */}
        <button 
          onClick={onGoToRecharge}
          className="meter-sync-btn"
          style={{
            width: '100%',
            padding: '11px',
            fontSize: '12px',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.85)',
            cursor: 'pointer'
          }}
        >
          Recharge or Resync in Settings
        </button>

      </div>
    </div>
  );
}
