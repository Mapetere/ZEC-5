import { useState, useEffect, useRef } from 'react';

const steps = [
  {
    title: "Welcome to ZET-5",
    description: "This interactive tour will guide you through your new smart energy controller dashboard and features. Let's get started!",
    target: null, // Centered modal
    page: "dashboard",
  },
  {
    title: "System Navigation",
    description: "Use these sidebar shortcuts to navigate between the Dashboard, Appliance Profiles, Daily Averages Database, and the Prepaid Token Audit Trail.",
    target: ".sidebar",
    placement: "right",
    page: "dashboard",
  },
  {
    title: "Energy Runway & Status",
    description: "This card shows your remaining prepaid ZESA units, current draw, and the ZET-5 predictive runway projection (remaining time left).",
    target: "#tour-runway",
    placement: "bottom",
    page: "dashboard",
  },
  {
    title: "Live Power Breakdown Option",
    description: "Use this toggle button on the home page to show or hide the live power breakdown. This gives you direct control to view live metrics on demand.",
    target: "#toggle-breakdown",
    placement: "bottom",
    page: "dashboard",
    action: (helpers) => {
      if (helpers && helpers.setShowBreakdown) {
        helpers.setShowBreakdown(true);
      }
    }
  },
  {
    title: "Instantaneous Draw",
    description: "Once toggled, this section calculates and graphs exactly which appliance circuits are consuming energy right at this very second.",
    target: "#tour-breakdown",
    placement: "top",
    page: "dashboard",
  },
  {
    title: "Smart Relays",
    description: "Control loads directly. Green indicates active circuits; red means ZET-5 has shedded or isolated the circuit to save units.",
    target: ".relay-grid",
    placement: "top",
    page: "dashboard",
  },
  {
    title: "Smart Advice Engine",
    description: "When remaining energy runs low, click here to request optimized load-shedding recipes designed to guarantee you hit your runway target.",
    target: "#tour-advice-btn",
    placement: "top",
    page: "dashboard",
  },
  {
    title: "Prepaid Token Audit Trail",
    description: "Navigate here to view your complete immutable purchase ledger, track blackout days, and break down historical consumption by month, week, or day.",
    target: "#nav-audit",
    placement: "right",
    page: "audit",
  }
];

export default function TourGuide({ activePage, setPage, onClose, showBreakdown, setShowBreakdown }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState(null);
  const tooltipRef = useRef(null);

  const step = steps[currentStep];

  useEffect(() => {
    // If the step is on a different page, switch page and wait for render
    if (activePage !== step.page) {
      setPage(step.page);
      setCoords(null);
      return;
    }

    // Call custom step action if available
    if (step.action) {
      step.action({ setShowBreakdown });
    }

    // Calculate target element coordinates
    const calculatePosition = () => {
      if (!step.target) {
        setCoords(null);
        return;
      }

      const el = document.querySelector(step.target);
      if (!el) {
        // Fallback or retry after brief delay
        setTimeout(calculatePosition, 100);
        return;
      }

      // Check if it's the live breakdown and it needs to be visible
      if (step.target === '#tour-breakdown' && !showBreakdown) {
        setShowBreakdown(true);
        setTimeout(calculatePosition, 150);
        return;
      }

      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      setCoords({
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height,
      });

      // Ensure the highlighted element is scrolled into view smoothly
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Delay calculation to let routing/rendering complete
    const timer = setTimeout(calculatePosition, 200);

    window.addEventListener('resize', calculatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [currentStep, activePage, step.page, step.target, showBreakdown]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Determine styles for the floating tooltip
  const getTooltipStyle = () => {
    if (!coords) {
      // Centered Welcome modal position
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(420px, 90vw)',
      };
    }

    const { top, left, width, height } = coords;
    const padding = 12; // distance from element

    switch (step.placement) {
      case 'right':
        return {
          position: 'absolute',
          top: top + height / 2,
          left: left + width + padding,
          transform: 'translateY(-50%)',
          width: '320px',
        };
      case 'left':
        return {
          position: 'absolute',
          top: top + height / 2,
          left: left - 320 - padding,
          transform: 'translateY(-50%)',
          width: '320px',
        };
      case 'bottom':
        return {
          position: 'absolute',
          top: top + height + padding,
          left: left + width / 2,
          transform: 'translateX(-50%)',
          width: '320px',
        };
      case 'top':
      default:
        return {
          position: 'absolute',
          top: top - padding,
          left: left + width / 2,
          transform: 'translate(-50%, -100%)',
          width: '320px',
        };
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 99999,
      pointerEvents: 'auto',
      overflow: 'hidden'
    }}>
      {/* Dimmed backdrop background */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 10, 0.65)',
          backdropFilter: 'blur(1.5px)',
          zIndex: 99998
        }} 
      />

      {/* Target spotlight focus highlight box */}
      {coords && (
        <div style={{
          position: 'absolute',
          top: coords.top - 4,
          left: coords.left - 4,
          width: coords.width + 8,
          height: coords.height + 8,
          borderRadius: '4px',
          border: '2px solid var(--accent-blue)',
          boxShadow: '0 0 0 9999px rgba(5, 8, 10, 0.75), 0 0 15px var(--accent-blue)',
          zIndex: 99999,
          pointerEvents: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      )}

      {/* Floating Tour Card */}
      <div 
        style={{
          ...getTooltipStyle(),
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card), 0 10px 30px rgba(0, 0, 0, 0.5)',
          padding: '24px',
          zIndex: 100000,
          color: 'var(--text-primary)',
          borderRadius: 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Render Arrow pointing to target */}
        {coords && (
          <div style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            pointerEvents: 'none',
            ...(() => {
              const size = 8;
              switch (step.placement) {
                case 'right':
                  return {
                    top: '50%',
                    left: -size,
                    transform: 'translateY(-50%)',
                    borderWidth: `${size}px ${size}px ${size}px 0`,
                    borderColor: `transparent var(--border-color) transparent transparent`,
                  };
                case 'left':
                  return {
                    top: '50%',
                    right: -size,
                    transform: 'translateY(-50%)',
                    borderWidth: `${size}px 0 ${size}px ${size}px`,
                    borderColor: `transparent transparent transparent var(--border-color)`,
                  };
                case 'bottom':
                  return {
                    top: -size,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: `0 ${size}px ${size}px ${size}px`,
                    borderColor: `transparent transparent var(--border-color) transparent`,
                  };
                case 'top':
                default:
                  return {
                    bottom: -size,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: `${size}px ${size}px 0 ${size}px`,
                    borderColor: `var(--border-color) transparent transparent transparent`,
                  };
              }
            })()
          }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
            Tour Guide · Step {currentStep + 1} of {steps.length}
          </span>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              fontSize: '16px',
            }}
            title="Exit Tour"
          >
            ×
          </button>
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif' }}>
          {step.title}
        </h3>
        
        <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {step.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0
            }}
          >
            Skip
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button 
                onClick={handleBack} 
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext} 
              className="btn-primary"
              style={{ width: 'auto', padding: '6px 16px', fontSize: '12px' }}
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
