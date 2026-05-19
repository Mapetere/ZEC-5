import { useState, useEffect, useCallback, useRef } from 'react';
import LoginPage from './components/LoginPage.jsx';
import SetupWizard from './components/SetupWizard.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import Management from './components/Management.jsx';
import SmartAdvice from './components/SmartAdvice.jsx';
import EmergencyMode from './components/EmergencyMode.jsx';
import MeterSync from './components/MeterSync.jsx';
import DepletionModal from './components/DepletionModal.jsx';
import {
  startMockStream, generateAlerts,
  storeDailyAverage, getDailyAverages, inject7DayHistory, isHouseVacant
} from './services/mockData.js';
import {
  initEngine, processTick, getUnitsRemaining,
  syncWithMeter, resetEngine, getEngineState
} from './services/energyEngine.js';
import { recordObservation, calculateForecast, simulateIntervalProgress, getVirtualTime } from './services/predictionEngine.js';

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
    try { return JSON.parse(localStorage.getItem('zet5_auth'))?.email || null; } catch { return null; }
  });

  const [setupComplete, setSetupComplete] = useState(() => !!localStorage.getItem('zet5_setup'));
  const [setupData, setSetupData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zet5_setup')); } catch { return null; }
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
  const [tickCount, setTickCount] = useState(0);
  const [dataStartTime] = useState(() => Date.now());
  const [dailyAverages, setDailyAverages] = useState(() => getDailyAverages());
  const [vacant, setVacant] = useState(false);
  const [engineState, setEngineState] = useState(() => getEngineState());
  const [gridBlackout, setGridBlackout] = useState(false);
  const [dismissCutoff, setDismissCutoff] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const [profiles, setProfiles] = useState(() => {
    try {
      const stored = localStorage.getItem('zet5_profiles');
      if (stored) return JSON.parse(stored);
      const setup = localStorage.getItem('zet5_setup');
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
    const daysSincePurchase = Math.max(0.01, (now - purchaseDate) / (1000 * 60 * 60 * 24));

    // Use engine's corrected remaining if available, otherwise fallback
    let kwhRemaining;
    if (engineState) {
      kwhRemaining = Math.max(0, engineState.tokenKwh - engineState.cumulativeKwh);
    } else {
      const totalAmps = sensors.reduce((s, v) => s + (v || 0), 0);
      const avgPowerKw = (totalAmps * MAINS_VOLTAGE) / 1000;
      const dailyUsageKwh = avgPowerKw * 8;
      kwhRemaining = Math.max(0, td.kwh - (dailyUsageKwh * daysSincePurchase));
    }

    // Call our advanced dynamic prediction model to calculate forecast
    const forecast = calculateForecast(kwhRemaining, goal);

    const calStart = setupData.calibrationStart ? new Date(setupData.calibrationStart) : now;
    const calDays = (now - calStart) / (1000 * 60 * 60 * 24);
    const isPhase2 = calDays >= 7;

    // Condition A: below user-configured threshold (kWh)
    const belowThreshold = kwhRemaining < notifyThreshold;

    // Condition B: projected depletion before target date (supplied by forecast model)
    const atRisk = forecast.atRisk;

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
      daysRemaining: Math.round(forecast.daysRemaining),
      dailyUsage: parseFloat(forecast.projectedDailyKwh),
      hoursRemaining: forecast.hoursRemaining,
      depletionDate: forecast.depletionDate,
    };
  })();

  // Initialize energy engine when setup completes
  const handleSetupComplete = useCallback((data) => {
    setSetupData(data);
    setSetupComplete(true);
    const updated = DEFAULT_PROFILES.map((p, i) => ({ ...p, name: data.sensorNames?.[i] || p.name }));
    setProfiles(updated);
    localStorage.setItem('zet5_profiles', JSON.stringify(updated));

    // Initialize the energy engine with token data
    if (data.tokenData?.kwh && data.tokenData?.date) {
      const es = initEngine(data.tokenData.kwh, data.tokenData.date);
      setEngineState(es);
    }
  }, []);

  // Dynamic simulation data stream + daily average storage + predictive online learning ticks
  useEffect(() => {
    if (!user || !setupComplete) return;

    // Ensure engine is initialized (in case of page refresh)
    if (!getEngineState() && setupData?.tokenData?.kwh) {
      initEngine(setupData.tokenData.kwh, setupData.tokenData.date);
    }

    // Start high-fidelity client-side behavioral simulation
    const mockStream = startMockStream((data) => {
      if (gridBlackout) {
        setSensors([0, 0, 0, 0, 0]);
        const es = processTick([0, 0, 0, 0, 0], profiles);
        if (es) {
          setEngineState(es);
          // CRITICAL: Skip recordObservation (freezing learning array)
        }
        setAlerts([{
          id: `blackout-${Date.now()}`,
          type: 'danger',
          title: 'Grid Power Outage Detected',
          message: 'Utility voltage sags to 0V. ZET-5 edge brain has frozen all behavioral updates to protect profiles.',
          time: 'Now',
          actionable: false,
        }]);
      } else {
        setSensors(data.sensors);
        setHistory(data.history);
        const es = processTick(data.sensors, profiles);
        if (es) {
          setEngineState(es);
          recordObservation(es.totalRealW);
        }
        setAlerts(generateAlerts(data.sensors, profiles, tokenState));
      }
      setTickCount(data.tickCount);

      // Process daily averages
      if (!gridBlackout) {
        dailyStoreCounter.current++;
        if (dailyStoreCounter.current % 40 === 0) {
          const updated = storeDailyAverage(data.sensors);
          setDailyAverages(updated);
          setVacant(isHouseVacant());
        }
      }
    }, 1500);

    mockRef.current = mockStream;
    setConnected(true); // Simulation engine active

    return () => {
      if (mockStream) mockStream.stop();
      setConnected(false);
    };
  }, [user, setupComplete, gridBlackout, profiles, tokenState]);

  useEffect(() => {
    if (sensors.some(v => v > 0)) {
      setAlerts(generateAlerts(sensors, profiles, tokenState));
    }
  }, [tokenState?.isPhase2, tokenState?.belowThreshold, tokenState?.atRisk]);

  // Time Machine Simulation Advancement (Fast-Forward clock & learn patterns)
  const handleSimulateHours = useCallback((hours) => {
    const dailyUsageKwh = tokenState?.dailyUsage || 8.5;
    const avgPowerW = (dailyUsageKwh * 1000) / 24;

    // Simulate intervals in model
    simulateIntervalProgress(hours, avgPowerW);

    // Consume prepaid units
    const kwhConsumed = (avgPowerW / 1000) * hours;
    const engine = getEngineState();
    if (engine) {
      engine.cumulativeKwh += kwhConsumed;
      engine.lastTickTime = Date.now();
      setEngineState({ ...engine });
      localStorage.setItem('zet5_energy_engine', JSON.stringify(engine));
    }
    showToast(`Successfully advanced virtual clock by ${hours} hours!`, 'success');
  }, [tokenState, showToast]);

  // Fast-forward: inject 7-day history
  const handleFastForward = useCallback(() => {
    const days = inject7DayHistory();
    setDailyAverages(days);
    try {
      const refreshed = JSON.parse(localStorage.getItem('zet5_setup'));
      setSetupData(refreshed);
    } catch { /* ignore */ }
    showToast("Successfully injected 7-day metrology history!", 'success');
  }, [showToast]);

  // Update notification threshold
  const handleThresholdUpdate = useCallback((newThreshold) => {
    if (setupData) {
      const updated = { ...setupData, notifyThreshold: newThreshold };
      setSetupData(updated);
      localStorage.setItem('zet5_setup', JSON.stringify(updated));
    }
    showToast(`Trigger threshold updated to ${newThreshold} kWh!`, 'success');
  }, [setupData, showToast]);

  const handleRelayToggle = useCallback((index, state) => {
    setRelays(prev => { const n = [...prev]; n[index] = state; return n; });
    if (mockRef.current) mockRef.current.toggleRelay(index, state);
  }, []);

  const handleAcceptAdvice = useCallback((relayIndex) => {
    if (relayIndex != null && relayIndex < 8) {
      handleRelayToggle(relayIndex, false);
      showToast("Triage command active: shedded non-essential load!", 'success');
    }
  }, [handleRelayToggle, showToast]);

  const handleProfileSave = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem('zet5_profiles', JSON.stringify(newProfiles));
    showToast("Appliance sensor mapping profiles updated successfully!", 'success');
  }, [showToast]);

  // Meter sync handler
  const handleMeterSync = useCallback((meterReading) => {
    const result = syncWithMeter(meterReading);
    if (result) {
      setEngineState(result);
      if (meterReading > 0) setDismissCutoff(false); // Re-arm cutoff alert when synced above 0
      showToast(`Drift calibrated! New scaling coefficient: ×${result.correctionFactor.toFixed(3)}`, 'success');
    }
    return result;
  }, [showToast]);

  // Recharge handler
  const handleRecharge = useCallback((kwhAmount) => {
    const engine = getEngineState();
    if (engine) {
      engine.tokenKwh = kwhAmount;
      engine.cumulativeKwh = 0;
      engine.lastTickTime = Date.now();
      setEngineState({ ...engine });
      localStorage.setItem('zet5_energy_engine', JSON.stringify(engine));
      setDismissCutoff(false); // Re-arm cutoff alert
      showToast(`Loaded ${kwhAmount} kWh recharge successfully!`, 'success');
    }
  }, [showToast]);

  // Blackout toggle handler
  const handleToggleBlackout = useCallback(() => {
    setGridBlackout(prev => {
      const next = !prev;
      showToast(next ? "🔌 simulated grid outage active! RHS brain frozen." : "⚡ ZESA Utility power restored! Resuming metrology.", next ? 'warning' : 'success');
      return next;
    });
  }, [showToast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zet5_auth');
    setUser(null);
    if (mockRef.current) mockRef.current.stop();
  }, []);

  const handleResetSetup = useCallback(() => {
    localStorage.removeItem('zet5_setup');
    localStorage.removeItem('zet5_daily_averages');
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
              onSimulateHours={handleSimulateHours}
              onFastForward={handleFastForward}
              tickCount={tickCount}
              dataCollectionMinutes={dataCollectionMinutes}
              dailyAverages={dailyAverages}
              vacant={vacant}
              notifyThreshold={notifyThreshold}
              engineState={engineState}
              tokenState={tokenState}
              gridBlackout={gridBlackout}
              onToggleBlackout={handleToggleBlackout}
            />
          )}
          {page === 'management' && (
            <Management
              profiles={profiles}
              onSave={handleProfileSave}
              onResetSetup={handleResetSetup}
              notifyThreshold={notifyThreshold}
              onThresholdUpdate={handleThresholdUpdate}
              onRecharge={handleRecharge}
              onSyncMeter={handleMeterSync}
              engineState={engineState}
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
        tokenKwhRemaining={engineState ? Math.max(0, engineState.tokenKwh - engineState.cumulativeKwh) : (setupData?.tokenData?.kwh || 3.0)}
        targetHours={setupData?.durationGoal ? setupData.durationGoal * 24 : 504}
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

      <DepletionModal
        visible={setupComplete && !dismissCutoff && (engineState ? (engineState.tokenKwh - engineState.cumulativeKwh <= 0) : false)}
        onGoToRecharge={() => {
          setPage('management');
          setDismissCutoff(true);
          showToast("Redirected toSettings panel for Recharge/Sync!", 'success');
        }}
      />

      {/* FLOAT-IN PREMIUM GLASSMORPHIC TOAST SYSTEM */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div key={t.id} className="slide-in" style={{
            pointerEvents: 'auto',
            background: 'rgba(20, 28, 33, 0.92)',
            backdropFilter: 'blur(15px)',
            border: t.type === 'warning' ? '1px solid rgba(243, 156, 18, 0.4)' : '1px solid rgba(46, 204, 113, 0.4)',
            borderRadius: '10px',
            padding: '14px 20px',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'Outfit, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            minWidth: '280px',
            transition: 'all 0.3s ease'
          }}>
            <span style={{
              color: t.type === 'warning' ? '#f39c12' : '#2ecc71',
              fontSize: '18px',
              fontWeight: 'bold',
              lineHeight: 1
            }}>
              {t.type === 'warning' ? '⚠' : '✓'}
            </span>
            <span style={{ letterSpacing: '0.01em' }}>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
