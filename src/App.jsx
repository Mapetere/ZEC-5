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
import MeterSync from './components/MeterSync.jsx';
import {
  startMockStream, generateAlerts,
  storeDailyAverage, getDailyAverages, inject7DayHistory, isHouseVacant
} from './services/mockData.js';
import {
  initEngine, processTick, getUnitsRemaining,
  syncWithMeter, resetEngine, getEngineState
} from './services/energyEngine.js';
import wsService from './services/websocket.js';

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
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zec5_auth'))?.email || null; } catch { return null; }
  });

  const [setupComplete, setSetupComplete] = useState(() => !!localStorage.getItem('zec5_setup'));
  const [setupData, setSetupData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zec5_setup')); } catch { return null; }
  });

  const [page, setPage] = useState('dashboard');
  const [sensors, setSensors] = useState([0, 0, 0, 0, 0]);
  const [history, setHistory] = useState([[], [], [], [], []]);
  const [relays, setRelays] = useState(Array(8).fill(false));
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showMeterSync, setShowMeterSync] = useState(false);
  const [hwFault, setHwFault] = useState(null);
  const [tickCount, setTickCount] = useState(0);
  const [dataStartTime] = useState(() => Date.now());
  const [dailyAverages, setDailyAverages] = useState(() => getDailyAverages());
  const [vacant, setVacant] = useState(false);
  const [engineState, setEngineState] = useState(() => getEngineState());

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
  const dailyStoreCounter = useRef(0);

  const dataCollectionMinutes = Math.floor((Date.now() - dataStartTime) / (1000 * 60));

  // User-configurable notification threshold (kWh)
  const notifyThreshold = setupData?.notifyThreshold || 50;

  // Compute token state for Phase 2 logic (uses engine state when available)
  const tokenState = (() => {
    if (!setupData?.tokenData?.kwh) return null;
    const td = setupData.tokenData;
    const goal = setupData.durationGoal || 21;
    const purchaseDate = new Date(td.date);
    const now = new Date();
    const daysSincePurchase = Math.max(1, (now - purchaseDate) / (1000 * 60 * 60 * 24));

    // Use engine's corrected remaining if available, otherwise fallback
    let kwhRemaining;
    let dailyUsageKwh;
    if (engineState) {
      kwhRemaining = Math.max(0, engineState.tokenKwh - engineState.cumulativeKwh);
      // Estimate daily from current real power draw
      const totalAmps = sensors.reduce((s, v) => s + (v || 0), 0);
      const avgRealPowerKw = (totalAmps * MAINS_VOLTAGE * 0.80) / 1000; // 0.80 avg PF
      dailyUsageKwh = avgRealPowerKw * 24 * 0.45;
    } else {
      const totalAmps = sensors.reduce((s, v) => s + (v || 0), 0);
      const avgPowerKw = (totalAmps * MAINS_VOLTAGE) / 1000;
      dailyUsageKwh = avgPowerKw * 8;
      kwhRemaining = Math.max(0, td.kwh - (dailyUsageKwh * daysSincePurchase));
    }

    const daysRemaining = dailyUsageKwh > 0 ? kwhRemaining / dailyUsageKwh : goal;

    const calStart = setupData.calibrationStart ? new Date(setupData.calibrationStart) : now;
    const calDays = (now - calStart) / (1000 * 60 * 60 * 24);
    const isPhase2 = calDays >= 7;

    // Condition A: below user-configured threshold (kWh)
    const belowThreshold = kwhRemaining < notifyThreshold;

    // Condition B: projected depletion before target date
    const targetEndDate = new Date(purchaseDate.getTime() + goal * 24 * 60 * 60 * 1000);
    const projectedEndDate = dailyUsageKwh > 0
      ? new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + goal * 24 * 60 * 60 * 1000);
    const atRisk = projectedEndDate < targetEndDate;

    // Vacancy override: if house is vacant, goal is always achievable
    const isVacant = vacant;
    const isEmergency = kwhRemaining <= 5;

    return {
      isPhase2,
      belowThreshold: isVacant ? false : belowThreshold,
      atRisk: isVacant ? false : atRisk,
      isEmergency: isVacant ? false : isEmergency,
      isVacant,
      kwhRemaining: kwhRemaining.toFixed(1),
      daysRemaining: Math.round(daysRemaining),
      dailyUsage: dailyUsageKwh,
    };
  })();

  // Initialize energy engine when setup completes
  const handleSetupComplete = useCallback((data) => {
    setSetupData(data);
    setSetupComplete(true);
    const updated = DEFAULT_PROFILES.map((p, i) => ({ ...p, name: data.sensorNames?.[i] || p.name }));
    setProfiles(updated);
    localStorage.setItem('zec5_profiles', JSON.stringify(updated));

    // Initialize the energy engine with token data
    if (data.tokenData?.kwh && data.tokenData?.date) {
      const es = initEngine(data.tokenData.kwh, data.tokenData.date);
      setEngineState(es);
    }
  }, []);

  // Mock data stream + daily average storage + energy engine tick + WebSocket integration
  useEffect(() => {
    if (!user || !setupComplete) return;

    // Ensure engine is initialized (in case of page refresh)
    if (!getEngineState() && setupData?.tokenData?.kwh) {
      initEngine(setupData.tokenData.kwh, setupData.tokenData.date);
    }

    let mockStream = null;
    let localTickCount = 0;

    // Subscribe to live ESP32 status updates
    const unsubscribeStatus = wsService.onStatus((isConnected) => {
      setConnected(isConnected);
      if (isConnected) {
        // Hardware connected! Stop local client simulation to prevent duplicate ticks
        if (mockStream) {
          mockStream.stop();
          mockStream = null;
        }
        console.log('[ZEC-5] Active ESP32 connection established. Streaming live telemetry.');
      } else if (!mockStream) {
        // Hardware offline. Start client-side simulation failover
        console.log('[ZEC-5] ESP32 disconnected. Initiating client-side simulation failover.');
        startLocalSimulation();
      }
    });

    // Subscribe to live sensor telemetry from the ESP32
    const unsubscribeData = wsService.onData((data) => {
      // Parse sensors: ESP32 sends raw floats, clamp index 0 to 4
      const liveSensors = (data.sensors || [0, 0, 0, 0, 0]).map(v => parseFloat(v) || 0);
      setSensors(liveSensors);
      
      // Update history arrays
      setHistory(prev => {
        return prev.map((arr, i) => {
          const next = [...arr, liveSensors[i] || 0];
          if (next.length > 50) next.shift();
          return next;
        });
      });

      localTickCount++;
      setTickCount(localTickCount);

      // Process live tick in the self-correcting calibration engine
      const es = processTick(liveSensors, profiles);
      if (es) setEngineState(es);

      // Process daily averages
      dailyStoreCounter.current++;
      if (dailyStoreCounter.current % 40 === 0) {
        const updated = storeDailyAverage(liveSensors);
        setDailyAverages(updated);
        setVacant(isHouseVacant());
      }
    });

    // Subscribe to relay updates from the ESP32
    const unsubscribeRelays = wsService.onRelayUpdate((liveRelays) => {
      if (liveRelays) {
        setRelays(liveRelays);
      }
    });

    // Start client-side simulation failover
    function startLocalSimulation() {
      mockStream = startMockStream((data) => {
        setSensors(data.sensors);
        setHistory(data.history);
        setTickCount(data.tickCount);

        const es = processTick(data.sensors, profiles);
        if (es) setEngineState(es);

        dailyStoreCounter.current++;
        if (dailyStoreCounter.current % 40 === 0) {
          const updated = storeDailyAverage(data.sensors);
          setDailyAverages(updated);
          setVacant(isHouseVacant());
        }

        setAlerts(generateAlerts(data.sensors, profiles, tokenState));
      }, 1500);
      mockRef.current = mockStream;
    }

    // Connect to the ESP32 access point IP
    wsService.connect();

    return () => {
      unsubscribeStatus();
      unsubscribeData();
      unsubscribeRelays();
      wsService.disconnect();
      if (mockStream) mockStream.stop();
    };
  }, [user, setupComplete]);

  useEffect(() => {
    if (sensors.some(v => v > 0)) {
      setAlerts(generateAlerts(sensors, profiles, tokenState));
    }
  }, [tokenState?.isPhase2, tokenState?.belowThreshold, tokenState?.atRisk]);

  // Fast-forward: inject 7-day history
  const handleFastForward = useCallback(() => {
    const days = inject7DayHistory();
    setDailyAverages(days);
    // Reload setup data from localStorage (calibrationStart was updated)
    try {
      const refreshed = JSON.parse(localStorage.getItem('zec5_setup'));
      setSetupData(refreshed);
    } catch { /* ignore */ }
  }, []);

  // Update notification threshold
  const handleThresholdUpdate = useCallback((newThreshold) => {
    if (setupData) {
      const updated = { ...setupData, notifyThreshold: newThreshold };
      setSetupData(updated);
      localStorage.setItem('zec5_setup', JSON.stringify(updated));
    }
  }, [setupData]);

  const handleRelayToggle = useCallback((index, state) => {
    setRelays(prev => { const n = [...prev]; n[index] = state; return n; });
    // Propagate over-the-air to the physical ESP32 via WebSocket
    wsService.toggleRelay(index, state);
    // Fallback sync in simulation mode
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

  // Meter sync handler
  const handleMeterSync = useCallback((meterReading) => {
    const result = syncWithMeter(meterReading);
    if (result) setEngineState(result);
    return result;
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zec5_auth');
    setUser(null);
    if (mockRef.current) mockRef.current.stop();
  }, []);

  const handleResetSetup = useCallback(() => {
    localStorage.removeItem('zec5_setup');
    localStorage.removeItem('zec5_daily_averages');
    resetEngine();
    setSetupComplete(false);
    setSetupData(null);
    setDailyAverages([]);
    setEngineState(null);
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
              onOpenMeterSync={() => setShowMeterSync(true)}
              onHardwareFault={handleHardwareFault}
              onFastForward={handleFastForward}
              tickCount={tickCount}
              dataCollectionMinutes={dataCollectionMinutes}
              dailyAverages={dailyAverages}
              vacant={vacant}
              notifyThreshold={notifyThreshold}
              engineState={engineState}
            />
          )}
          {page === 'management' && (
            <Management
              profiles={profiles}
              onSave={handleProfileSave}
              onResetSetup={handleResetSetup}
              notifyThreshold={notifyThreshold}
              onThresholdUpdate={handleThresholdUpdate}
            />
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

      <MeterSync
        visible={showMeterSync}
        onClose={() => setShowMeterSync(false)}
        onSync={handleMeterSync}
        engineState={engineState}
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
