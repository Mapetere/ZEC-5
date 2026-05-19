/**
 * Header — Top bar with page title and ESP32 connection status.
 */
export default function Header({ title, connected }) {
  return (
    <header className="header">
      <h2 className="header-title">{title}</h2>
      <div className="header-status">
        <span className={`status-dot ${connected ? 'connected' : ''}`} />
        <span>Predictive Core: {connected ? 'Active (Real-time)' : 'Offline'}</span>
      </div>
    </header>
  );
}
