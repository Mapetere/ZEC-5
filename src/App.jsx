import { useState, useEffect, useCallback, useRef } from 'react';
import LoginPage from './components/LoginPage.jsx';
import SetupWizard from './components/SetupWizard.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import Management from './components/Management.jsx';
import SmartAdvice from './components/SmartAdvice.jsx';
import HardwareModal from './components/HardwareModal.jsx';
import EmergencyMode from './components/EmergencyMode.jsx';
import { startMockStream, generateAlerts } from './services/mockData.js';

const PAGE_TITLES = {
  dashboard: 'Behavioral Dashboard',
  management: 'Appliance Management',
};

const DEFAULT_PROFILES = [
  { name: 'Fridge', base: 1.2, variance: 0.08, type: 'Continuous', maxLoad: '1.8' },
  { name: 'Geyser', base: 3.8, variance: 0.15, type: 'Cyclic', maxLoad: '9.0' },
  { name: 'Borehole', base: 2.1, variance: 0.10, type: 'Scheduled', maxLoad: '5.0' },
  { name: 'Entertainment', base: 0.6, variance: 0.05, type: 'Variable', maxLoad: '2.0' },
  { name: 'Lighting', base: 0.4, variance: 0.03, type: 'Variable', maxLoad: '1.2' },
];

const MAINS_VOLTAGE = 230;

export default function App() {
  // Auth
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('zec5_auth');
      return stored ? JSON.parse(stored).email : null;
    } catch { return null; }
  });

  // Setup
  const [setupComplete, setSetupComplete] = useState(() => !!localStorage.getItem('zec5_setup'));
  const [setupData, setSetupData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zec5_setup')); } catch { return null; }
  });

  // App state
  const [page, setPage] = useState('dashboard');
  const [sensors, setSensors] = useState([0, 0, 0, 0, 0]);
  const [history, setHistory] = useState([[], [], [], [], []]);
  const [relays, setRelays] = useState(Array(8).fill(false));
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [hwFault, setHwFault] = useState(null);
  const [tickCount, setTickCount] = useState(0);
  const [dataStartTime] = useState(() => Date.now());

  const [profiles, setProfiles] = useState(() => {
    try {
      const stored = localStorage.getItem('zec5_profiles');
      if (stored) return JSON.parse(stored);
      const setup = localStorage.getItem('zec5_setup');
      if (setup) {
        const sd = JSON.parse(setup);
        return DEFAULT_PROFILES.map((p, i) => ({ ...p, name: sd.sensorNames?.[i] || p.name }));
      }
      return DEFAULT_PROFILES;
    } catch { return DEFAULT_PROFILES; }
  });

  const mockRef = useRef(null);

  // Data collection minutes (for 0-Day fix)
  const dataCollectionMinutes = Math.floor((Date.now() - dataStartTime) / (1000 * 60));

  // Compute token state for Phase 2 logic
  const tokenState = (() => {
    if (!setupData?.tokenData?.kwh) return null;
    const td = setupData.tokenData;
    const goal = setupData.durationGoal || 21;
    const purchaseDate = new Date(td.date);
    const now = new Date();
    const daysSincePurchase = Math.max(1, (now - purchaseDate) / (1000 * 60 * 60 * 24));
    const totalAmps = sensors.reduce((s, v) => s + (v || 0), 0);
    const avgPowerKw = (totalAmps * MAINS_VOLTAGE) / 1000;
    const dailyUsageKwh = avgPowerKw * 8;
    const kwhRemaining = Math.max(0, td.kwh - (dailyUsageKwh * daysSincePurchase));
    const daysRemaining = dailyUsageKwh > 0 ? kwhRemaining / dailyUsageKwh : goal;

    // Phase check
    const calStart = setupData.calibrationStart ? new Date(setupData.calibrationStart) : now;
    const calDays = (now - calStart) / (1000 * 60 * 60 * 24);
    const isPhase2 = calDays >= 7;

    // Condition A: below 50% of original tokens
    const belowThreshold = kwhRemaining < (td.kwh * 0.5);

    // Condition B: projected depletion before target date
    const targetEndDate = new Date(purchaseDate.getTime() + goal * 24 * 60 * 60 * 1000);
    const projectedEndDate = dailyUsageKwh > 0
      ? new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + goal * 24 * 60 * 60 * 1000);
    const atRisk = projectedEndDate < targetEndDate;

    const isEmergency = kwhRemaining <= 5;

    return {
      isPhase2,
      belowThreshold,
      atRisk,
      isEmergency,
      kwhRemaining: kwhRemaining.toFixed(1),
      daysRemaining: Math.round(daysRemaining),
      dailyUsage: dailyUsageKwh,
    };
  })();

  const handleSetupComplete = useCallback((data) => {
    setSetupData(data);
    setSetupComplete(true);
    const updated = DEFAULT_PROFILES.map((p, i) => ({ ...p, name: data.sensorNames?.[i] || p.name }));
    setProfiles(updated);
    localStorage.setItem('zec5_profiles', JSON.stringify(updated));
  }, []);

  // Mock data stream
  useEffect(() => {
    if (!user || !setupComplete) return;
    const mock = startMockStream((data) => {
      setSensors(data.sensors);
      setHistory(data.history);
      setTickCount(data.tickCount);
      setAlerts(generateAlerts(data.sensors, profiles, tokenState));
    }, 1500);
    mockRef.current = mock;
    setConnected(true);
    return () => { mock.stop(); setConnected(false); };
  }, [user, setupComplete]);

  // Update alerts when tokenState changes
  useEffect(() => {
    if (sensors.some(v => v > 0)) {
      setAlerts(generateAlerts(sensors, profiles, tokenState));
    }
  }, [tokenState?.isPhase2, tokenState?.belowThreshold, tokenState?.atRisk]);

  const handleRelayToggle = useCallback((index, state) => {
    setRelays(prev => { const n = [...prev]; n[index] = state; return n; });
    if (mockRef.current) mockRef.current.toggleRelay(index, state);
  }, []);

  const handleAcceptAdvice = useCallback((relayIndex) => {
    if (relayIndex != null && relayIndex < 8) handleRelayToggle(relayIndex, false);
  }, [handleRelayToggle]);

  const handleProfileSave = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem('zec5_profiles', JSON.stringify(newProfiles));
  }, []);

  const handleHardwareFault = useCallback((index, name) => {
    if (!hwFault) setHwFault({ index, name });
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

  if (!user) return <LoginPage onLogin={setUser} />;
  if (!setupComplete) return <SetupWizard onComplete={handleSetupComplete} />;

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} onLogout={handleLogout} />
      <div className="main-content">
        <Header title={PAGE_TITLES[page] || 'Dashboard'} connected={connected} />
        <div className="page-container">
          {page === 'dashboard' && (
            <Dashboard
              sensors={sensors}
              history={history}
              alerts={alerts}
              profiles={profiles}
              tokenData={setupData?.tokenData}
              durationGoal={setupData?.durationGoal}
              calibrationStart={setupData?.calibrationStart}
              onOpenAdvice={() => setShowAdvice(true)}
              onOpenEmergency={() => setShowEmergency(true)}
              onHardwareFault={handleHardwareFault}
              tickCount={tickCount}
              dataCollectionMinutes={dataCollectionMinutes}
            />
          )}
          {page === 'management' && (
            <Management profiles={profiles} onSave={handleProfileSave} onResetSetup={handleResetSetup} />
          )}
        </div>
      </div>

      <SmartAdvice
        alerts={alerts}
        relays={relays}
        onAcceptAdvice={handleAcceptAdvice}
        visible={showAdvice}
        onClose={() => setShowAdvice(false)}
      />

      {showEmergency && (
        <EmergencyMode
          kwhRemaining={tokenState?.kwhRemaining || '0'}
          sensors={sensors}
          profiles={profiles}
          relays={relays}
          onToggleRelay={handleRelayToggle}
          onClose={() => setShowEmergency(false)}
        />
      )}

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
