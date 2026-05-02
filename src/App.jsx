import { useState, useEffect, useCallback, useRef } from 'react';
import LoginPage from './components/LoginPage.jsx';
import SetupWizard from './components/SetupWizard.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import RelayControl from './components/RelayControl.jsx';
import Management from './components/Management.jsx';
import SmartAdvice from './components/SmartAdvice.jsx';
import HardwareModal from './components/HardwareModal.jsx';
import { startMockStream, generateAlerts } from './services/mockData.js';

const PAGE_TITLES = {
  dashboard: 'Behavioral Dashboard',
  relays: 'Relay Control Grid',
  management: 'Appliance Management',
};

const DEFAULT_PROFILES = [
  { name: 'Fridge', base: 1.2, variance: 0.3, type: 'Continuous', maxLoad: '1.8', spikeProbability: 0.02, spikeMultiplier: 3 },
  { name: 'Geyser', base: 3.8, variance: 0.8, type: 'Cyclic', maxLoad: '9.0', spikeProbability: 0.05, spikeMultiplier: 2 },
  { name: 'Borehole', base: 2.1, variance: 0.5, type: 'Scheduled', maxLoad: '5.0', spikeProbability: 0.03, spikeMultiplier: 2.5 },
  { name: 'Entertainment', base: 0.6, variance: 0.2, type: 'Variable', maxLoad: '2.0', spikeProbability: 0.01, spikeMultiplier: 4 },
  { name: 'Lighting', base: 0.4, variance: 0.15, type: 'Variable', maxLoad: '1.2', spikeProbability: 0.01, spikeMultiplier: 2 },
];

export default function App() {
  // Auth state
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('zec5_auth');
      return stored ? JSON.parse(stored).email : null;
    } catch { return null; }
  });

  // Setup wizard state
  const [setupComplete, setSetupComplete] = useState(() => {
    return !!localStorage.getItem('zec5_setup');
  });
  const [setupData, setSetupData] = useState(() => {
    try {
      const stored = localStorage.getItem('zec5_setup');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // App state
  const [page, setPage] = useState('dashboard');
  const [sensors, setSensors] = useState([0, 0, 0, 0, 0]);
  const [history, setHistory] = useState([[], [], [], [], []]);
  const [relays, setRelays] = useState(Array(8).fill(false));
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [hwFault, setHwFault] = useState(null); // { index, name }

  const [profiles, setProfiles] = useState(() => {
    try {
      const stored = localStorage.getItem('zec5_profiles');
      if (stored) return JSON.parse(stored);
      // Merge from setup data if available
      const setup = localStorage.getItem('zec5_setup');
      if (setup) {
        const sd = JSON.parse(setup);
        return DEFAULT_PROFILES.map((p, i) => ({
          ...p,
          name: sd.sensorNames?.[i] || p.name,
        }));
      }
      return DEFAULT_PROFILES;
    } catch { return DEFAULT_PROFILES; }
  });

  const mockRef = useRef(null);

  // Handle setup completion
  const handleSetupComplete = useCallback((data) => {
    setSetupData(data);
    setSetupComplete(true);
    // Update profiles with sensor names from setup
    const updated = DEFAULT_PROFILES.map((p, i) => ({
      ...p,
      name: data.sensorNames?.[i] || p.name,
    }));
    setProfiles(updated);
    localStorage.setItem('zec5_profiles', JSON.stringify(updated));
  }, []);

  // Start mock data stream
  useEffect(() => {
    if (!user || !setupComplete) return;

    const mock = startMockStream((data) => {
      setSensors(data.sensors);
      setHistory(data.history);
      setRelays(prev => {
        if (prev.some(v => v)) return prev;
        return data.relays;
      });
      setAlerts(generateAlerts(data.sensors, profiles));
    }, 1500);

    mockRef.current = mock;
    setConnected(true);

    return () => {
      mock.stop();
      setConnected(false);
    };
  }, [user, setupComplete]);

  const handleRelayToggle = useCallback((index, state) => {
    setRelays(prev => {
      const next = [...prev];
      next[index] = state;
      return next;
    });
    if (mockRef.current) {
      mockRef.current.toggleRelay(index, state);
    }
  }, []);

  const handleShedLoad = useCallback((relayIndex) => {
    if (relayIndex != null && relayIndex < 8) {
      handleRelayToggle(relayIndex, false);
    }
  }, [handleRelayToggle]);

  const handleAcceptAdvice = useCallback((relayIndex) => {
    handleShedLoad(relayIndex);
    // Could close advice panel after action
  }, [handleShedLoad]);

  const handleProfileSave = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem('zec5_profiles', JSON.stringify(newProfiles));
  }, []);

  const handleHardwareFault = useCallback((index, name) => {
    if (!hwFault) {
      setHwFault({ index, name });
    }
  }, [hwFault]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zec5_auth');
    setUser(null);
    if (mockRef.current) mockRef.current.stop();
  }, []);

  const handleResetSetup = useCallback(() => {
    localStorage.removeItem('zec5_setup');
    setSetupComplete(false);
    setSetupData(null);
  }, []);

  // Not authenticated
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // First-run setup
  if (!setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        onLogout={handleLogout}
      />
      <div className="main-content">
        <Header title={PAGE_TITLES[page]} connected={connected} />
        <div className="page-container">
          {page === 'dashboard' && (
            <Dashboard
              sensors={sensors}
              history={history}
              alerts={alerts}
              profiles={profiles}
              onShedLoad={handleShedLoad}
              tokenData={setupData?.tokenData}
              durationGoal={setupData?.durationGoal}
              calibrationStart={setupData?.calibrationStart}
              onOpenAdvice={() => setShowAdvice(true)}
              onHardwareFault={handleHardwareFault}
            />
          )}
          {page === 'relays' && (
            <RelayControl relays={relays} onToggle={handleRelayToggle} />
          )}
          {page === 'management' && (
            <Management
              profiles={profiles}
              onSave={handleProfileSave}
              onResetSetup={handleResetSetup}
            />
          )}
        </div>
      </div>

      {/* Smart Advice Sidebar */}
      <SmartAdvice
        alerts={alerts}
        relays={relays}
        onAcceptAdvice={handleAcceptAdvice}
        visible={showAdvice}
        onClose={() => setShowAdvice(false)}
      />

      {/* Hardware Fault Modal */}
      {hwFault && (
        <HardwareModal
          sensorName={hwFault.name}
          sensorIndex={hwFault.index}
          onClose={() => setHwFault(null)}
        />
      )}
    </div>
  );
}
