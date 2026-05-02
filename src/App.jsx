import { useState, useEffect, useCallback, useRef } from 'react';
import LoginPage from './components/LoginPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import RelayControl from './components/RelayControl.jsx';
import Management from './components/Management.jsx';
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

  // App state
  const [page, setPage] = useState('dashboard');
  const [sensors, setSensors] = useState([0, 0, 0, 0, 0]);
  const [history, setHistory] = useState([[], [], [], [], []]);
  const [relays, setRelays] = useState(Array(8).fill(false));
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [profiles, setProfiles] = useState(() => {
    try {
      const stored = localStorage.getItem('zec5_profiles');
      return stored ? JSON.parse(stored) : DEFAULT_PROFILES;
    } catch { return DEFAULT_PROFILES; }
  });

  const mockRef = useRef(null);

  // Start mock data stream
  useEffect(() => {
    if (!user) return;

    const mock = startMockStream((data) => {
      setSensors(data.sensors);
      setHistory(data.history);
      setRelays(prev => {
        // Keep user toggles, only init from mock on first load
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
  }, [user]);

  const handleRelayToggle = useCallback((index, state) => {
    setRelays(prev => {
      const next = [...prev];
      next[index] = state;
      return next;
    });
    if (mockRef.current) {
      mockRef.current.toggleRelay(index, state);
    }
    // In production: wsService.toggleRelay(index, state);
  }, []);

  const handleShedLoad = useCallback((relayIndex) => {
    if (relayIndex != null && relayIndex < 8) {
      handleRelayToggle(relayIndex, false);
    }
  }, [handleRelayToggle]);

  const handleProfileSave = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem('zec5_profiles', JSON.stringify(newProfiles));
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zec5_auth');
    setUser(null);
    if (mockRef.current) mockRef.current.stop();
  }, []);

  // Not authenticated
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} onLogout={handleLogout} />
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
            />
          )}
          {page === 'relays' && (
            <RelayControl
              relays={relays}
              onToggle={handleRelayToggle}
            />
          )}
          {page === 'management' && (
            <Management
              profiles={profiles}
              onSave={handleProfileSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
