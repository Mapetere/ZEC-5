/**
 * HardwareModal — Triggered when a sensor reports Null or 0 while the system is armed.
 * Directs user to contact Technical Support at 0774694160.
 * Strictly professional — no emojis.
 */
export default function HardwareModal({ sensorName, sensorIndex, onClose }) {
  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="hw-modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="hw-modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="hw-modal-title">Hardware Fault Detected</h3>
        <div className="hw-modal-alert-bar">
          Sensor <span>S{sensorIndex + 1}</span> | {sensorName || `Channel ${sensorIndex + 1}`}
        </div>
        <p className="hw-modal-desc">
          Data ping returned Null while system is armed. This is likely due to the device being fully powered off, an offline controller, 
          a disconnected clamping channel, or an ADC failure on the ESP32 controller module.
          Immediate inspection is recommended.
        </p>
        <div className="hw-modal-contact">
          <div className="hw-modal-contact-label">Contact Technical Support</div>
          <a href="tel:0774694160" className="hw-modal-phone">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            0774 694 160
          </a>
        </div>
        <button className="btn-primary" onClick={onClose} style={{ marginTop: 20 }} id="hw-modal-close">
          Acknowledged
        </button>
      </div>
    </div>
  );
}
