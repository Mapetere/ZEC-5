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
import EngineerSetupPage from './components/EngineerSetupPage.jsx';
import Settings from './components/Settings.jsx';
import DailyAverages from './components/DailyAverages.jsx';
import AuditTrail from './components/AuditTrail.jsx';
import TourGuide from './components/TourGuide.jsx';
import EmergencyInterceptModal from './components/EmergencyInterceptModal.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import {
  startMockStream, generateAlerts,
  storeDailyAverage, getDailyAverages, isHouseVacant
} from './services/mockData.js';
import {
  initEngine, processTick, getUnitsRemaining,
  syncWithMeter, resetEngine, getEngineState
} from './services/energyEngine.js';
import { recordObservation, calculateForecast, simulateIntervalProgress, getVirtualTime } from './services/predictionEngine.js';
import { solveEnergyAllocation } from './services/recipeEngine.js';

const PAGE_TITLES = {
  dashboard: 'Behavioral Dashboard',
  management: 'Appliance Management',
  history: 'Daily Averages Database',
  audit: 'Token Audit Trail',
  inference: 'Inference Engine Insights',
  settings: 'System Settings',
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

  const [engineerSetup, setEngineerSetup] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zet5_engineer_setup')); } catch { return null; }
  });

  const handleEngineerSetupComplete = useCallback((engData, profs) => {
    setEngineerSetup(engData);
    setProfiles(profs);
    localStorage.removeItem('zet5_auth');
    setUser(null);
  }, []);

  const [activeScheduleId, setActiveScheduleId] = useState(() => {
    return localStorage.getItem('zet5_active_schedule') || null;
  });
  const [preScheduleRelays, setPreScheduleRelays] = useState(() => {
    try {
      const stored = localStorage.getItem('zet5_pre_schedule_relays');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [page, setPage] = useState('dashboard');
  const [sensors, setSensors] = useState([0, 0, 0, 0, 0]);
  const [history, setHistory] = useState([[], [], [], [], []]);
  const [relays, setRelays] = useState(Array(6).fill(false));
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showMeterSync, setShowMeterSync] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showEmergencyIntercept, setShowEmergencyIntercept] = useState(false);
  const [loadingState, setLoadingState] = useState({ isLoading: false, message: '' });
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

  const withLoader = useCallback(async (message, actionFn) => {
    setLoadingState({ isLoading: true, message });
    // Add artificial delay to show loader as requested
    await new Promise(r => setTimeout(r, 800));
    try {
      await actionFn();
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
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

  const stateRef = useRef({ tokenState: null, activeScheduleId, setupData });

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



    // Condition A: below user-configured threshold (kWh)
    const belowThreshold = kwhRemaining < notifyThreshold;

    // Condition B: projected depletion before target date (supplied by forecast model)
    const atRisk = forecast.atRisk;

    // Vacancy override: if house is vacant, goal is always achievable
    const isVacant = vacant;
    const emergencyThreshold = setupData?.emergencyThreshold || 5;
    const isEmergency = kwhRemaining <= emergencyThreshold;

    return {
      isPhase2: true,
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

  useEffect(() => {
    stateRef.current = { tokenState, activeScheduleId, setupData };
  });

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
        setAlerts(generateAlerts(data.sensors, profiles, stateRef.current.tokenState));

        // Evaluate automated schedule rules
        const currentScheduleId = stateRef.current.activeScheduleId;
        if (currentScheduleId && currentScheduleId !== 'none') {
          const ts = stateRef.current.tokenState;
          const sd = stateRef.current.setupData;
          const kwhAvailable = ts ? parseFloat(ts.kwhRemaining) : (sd?.tokenData?.kwh || 3.0);
          const tHours = sd?.durationGoal ? sd.durationGoal * 24 : 504;
          const allocation = solveEnergyAllocation(kwhAvailable, tHours);
          const recipe = allocation.recipes.find(r => r.id === currentScheduleId);
          if (recipe && recipe.rules) {
            const vTime = getVirtualTime();
            const h = vTime.getHours();
            const m = vTime.getMinutes();
            const currentMins = h * 60 + m;

            recipe.rules.forEach(rule => {
              const idx = rule.index + 1; // Offset by 1 because Relay 0 is Main Supply
              let shouldBeOn = true;
              if (rule.type === 'disabled') {
                shouldBeOn = false;
              } else if (rule.type === 'continuous') {
                shouldBeOn = true;
              } else if (rule.type === 'time_range') {
                const startMins = rule.startH * 60 + rule.startM;
                const endMins = rule.endH * 60 + rule.endM;
                if (startMins <= endMins) {
                  shouldBeOn = (currentMins >= startMins && currentMins < endMins);
                } else {
                  shouldBeOn = (currentMins >= startMins || currentMins < endMins);
                }
              } else if (rule.type === 'cycle') {
                const cycleTotal = rule.onMins + rule.offMins;
                const cyclePos = currentMins % cycleTotal;
                shouldBeOn = (cyclePos < rule.onMins);
              }

              if (data.relays[idx] !== shouldBeOn) {
                if (mockRef.current) mockRef.current.toggleRelay(idx, shouldBeOn);
                setRelays(prev => { const n = [...prev]; n[idx] = shouldBeOn; return n; });
              }
            });
          }
        }
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
  }, [user, setupComplete, gridBlackout, profiles]);

  useEffect(() => {
    if (sensors.some(v => v > 0)) {
      setAlerts(generateAlerts(sensors, profiles, tokenState));
    }
  }, [tokenState?.belowThreshold, tokenState?.atRisk]);


  // Scroll to top of page-container on page navigation
  useEffect(() => {
    const el = document.querySelector('.page-container');
    if (el) {
      el.scrollTop = 0;
    }
  }, [page]);

  // Time Machine Simulation Advancement (Fast-Forward clock & learn patterns)
  const handleSimulateHours = useCallback((hours) => {
    withLoader(`SIMULATING ${hours} HOURS OF USAGE...`, () => {
      const startVirtualTime = getVirtualTime();
      let kwhConsumed = 0;
      let finalRelayStates = [...relays];

      // If an automated schedule is active, accurately simulate minute-by-minute load 
      // based on the schedule's component-level rules.
      const currentScheduleId = activeScheduleId;
      if (currentScheduleId && currentScheduleId !== 'none') {
        const ts = tokenState;
        const sd = setupData;
        const kwhAvailable = ts ? parseFloat(ts.kwhRemaining) : (sd?.tokenData?.kwh || 3.0);
        const tHours = sd?.durationGoal ? sd.durationGoal * 24 : 504;
        const allocation = solveEnergyAllocation(kwhAvailable, tHours);
        const recipe = allocation.recipes.find(r => r.id === currentScheduleId);

        if (recipe && recipe.rules) {
          const totalMinutes = hours * 60;
          let vTime = new Date(startVirtualTime.getTime());
          
          for (let min = 0; min < totalMinutes; min++) {
            const h = vTime.getHours();
            const m = vTime.getMinutes();
            const currentMins = h * 60 + m;
            let minutePowerW = 0;

            // Base background power (essential constant loads not explicitly modeled)
            minutePowerW += 150; 

            recipe.rules.forEach(rule => {
              const idx = rule.index + 1; // Offset by 1 because Relay 0 is Main Supply
              let shouldBeOn = true;
              if (rule.type === 'disabled') {
                shouldBeOn = false;
              } else if (rule.type === 'continuous') {
                shouldBeOn = true;
              } else if (rule.type === 'time_range') {
                const startMins = rule.startH * 60 + rule.startM;
                const endMins = rule.endH * 60 + rule.endM;
                if (startMins <= endMins) {
                  shouldBeOn = (currentMins >= startMins && currentMins < endMins);
                } else {
                  shouldBeOn = (currentMins >= startMins || currentMins < endMins);
                }
              } else if (rule.type === 'cycle') {
                const cycleTotal = rule.onMins + rule.offMins;
                const cyclePos = currentMins % cycleTotal;
                shouldBeOn = (cyclePos < rule.onMins);
              }

              // Track final state for UI update
              if (min === totalMinutes - 1) {
                finalRelayStates[idx] = shouldBeOn;
              }

              // Accumulate power if relay is ON
              if (shouldBeOn && profiles[idx]) {
                minutePowerW += profiles[idx].load; 
              }
            });

            // Add minute's energy to total consumed (W -> kW / 60)
            kwhConsumed += (minutePowerW / 1000) / 60;
            vTime = new Date(vTime.getTime() + 60000); // add 1 min
          }
        }
      }

      // Fallback if no schedule is active: use historical average
      if (kwhConsumed === 0) {
        const dailyUsageKwh = tokenState?.dailyUsage || 8.5;
        const avgPowerW = (dailyUsageKwh * 1000) / 24;
        kwhConsumed = (avgPowerW / 1000) * hours;
      }

      // Update real-world engine states
      const averageSimulatedPowerW = (kwhConsumed * 1000) / hours;
      simulateIntervalProgress(hours, averageSimulatedPowerW);

      const engine = getEngineState();
      if (engine) {
        engine.cumulativeKwh += kwhConsumed;
        engine.lastTickTime = Date.now();
        setEngineState({ ...engine });
        localStorage.setItem('zet5_energy_engine', JSON.stringify(engine));
      }

      // Immediately push new relay states to UI and hardware mock
      setRelays(finalRelayStates);
      finalRelayStates.forEach((state, i) => {
        if (mockRef.current) mockRef.current.toggleRelay(i, state);
      });

      // Populate intermediate daily averages for all virtual dates crossed
      const passedDates = [];
      let timeCursor = new Date(startVirtualTime.getTime());
      for (let h = 1; h <= hours; h++) {
        timeCursor = new Date(timeCursor.getTime() + 60 * 60 * 1000);
        const dateStr = timeCursor.toISOString().split('T')[0];
        if (!passedDates.includes(dateStr)) {
          passedDates.push(dateStr);
        }
      }

      let updatedAverages = getDailyAverages();
      passedDates.forEach(dateStr => {
        updatedAverages = storeDailyAverage(sensors, dateStr);
      });
      setDailyAverages(updatedAverages);
      setVacant(isHouseVacant());

      showToast(`Fast-forwarded ${hours} hours. System auto-toggled relays per schedule and consumed ${kwhConsumed.toFixed(2)} kWh.`, 'success');
    });
  }, [tokenState, showToast, sensors, activeScheduleId, setupData, profiles, relays, withLoader]);



  // Update notification threshold
  const handleThresholdUpdate = useCallback((newThreshold) => {
    if (setupData) {
      const updated = { ...setupData, notifyThreshold: newThreshold };
      setSetupData(updated);
      localStorage.setItem('zet5_setup', JSON.stringify(updated));
    }
    showToast(`Trigger threshold updated to ${newThreshold} kWh!`, 'success');
  }, [setupData, showToast]);

  // Update critical emergency threshold
  const handleEmergencyThresholdUpdate = useCallback((newThresh, autoShed) => {
    setSetupData(prev => {
      const next = { ...prev, emergencyThreshold: newThresh, autoShedEmergency: autoShed };
      localStorage.setItem('zet5_setup', JSON.stringify(next));
      return next;
    });
    showToast(`Emergency settings updated (Threshold: ${newThresh} kWh, Auto-Shed: ${autoShed ? 'ON' : 'OFF'})`, 'success');
  }, [showToast]);

  // Update target duration goal
  const handleGoalUpdate = useCallback((newGoal) => {
    if (setupData) {
      const updated = { ...setupData, durationGoal: newGoal };
      setSetupData(updated);
      localStorage.setItem('zet5_setup', JSON.stringify(updated));
    }
    showToast(`Target duration goal updated to ${newGoal} days!`, 'success');
  }, [setupData, showToast]);

  const handleRelayToggle = useCallback((index, state) => {
    if (activeScheduleId) {
      setActiveScheduleId(null);
      localStorage.removeItem('zet5_active_schedule');
      showToast("Manual override detected. Autonomous schedule disabled and previous states restored.", "warning");

      let nextRelays = [...relays];
      if (preScheduleRelays) {
        nextRelays = [...preScheduleRelays];
        setPreScheduleRelays(null);
        localStorage.removeItem('zet5_pre_schedule_relays');
      }
      nextRelays[index] = state;

      setRelays(nextRelays);
      nextRelays.forEach((st, i) => {
        if (mockRef.current) mockRef.current.toggleRelay(i, st);
      });
      return;
    }

    setRelays(prev => { const n = [...prev]; n[index] = state; return n; });
    if (mockRef.current) mockRef.current.toggleRelay(index, state);
  }, [activeScheduleId, preScheduleRelays, relays, showToast]);

  const handleAcceptAdvice = useCallback((relayIndex) => {
    if (relayIndex != null && relayIndex < 6) {
      handleRelayToggle(relayIndex, false);
      showToast("Triage command active: shedded non-essential load!", 'success');
    }
  }, [handleRelayToggle, showToast]);

  const handleApplySchedule = useCallback((scheduleId, isAutonomous = true) => {
    withLoader(isAutonomous && scheduleId ? `ACTIVATING SCHEDULE: ${scheduleId.toUpperCase()}...` : "DEACTIVATING SCHEDULE...", () => {
      if (scheduleId && isAutonomous) {
        setActiveScheduleId(scheduleId);
        localStorage.setItem('zet5_active_schedule', scheduleId);
        const pre = [...relays];
        setPreScheduleRelays(pre);
        localStorage.setItem('zet5_pre_schedule_relays', JSON.stringify(pre));
        showToast(`Automated schedule '${scheduleId}' activated! Relays will now toggle automatically.`, 'success');
      } else {
        setActiveScheduleId(null);
        localStorage.removeItem('zet5_active_schedule');
        
        // Restore pre-schedule relays
        if (preScheduleRelays) {
          setRelays(preScheduleRelays);
          preScheduleRelays.forEach((st, i) => {
            if (mockRef.current) mockRef.current.toggleRelay(i, st);
          });
          setPreScheduleRelays(null);
          localStorage.removeItem('zet5_pre_schedule_relays');
        }

        showToast(isAutonomous ? `Automated schedule deactivated.` : `Manual mode selected. System will NOT automatically toggle relays.`, 'info');
      }

      setShowAdvice(false); // Close the panel
    });
  }, [preScheduleRelays, relays, showToast, withLoader]);

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
      showToast(next ? "simulated grid outage active! RHS brain frozen." : "Power restored! Resuming metrology.", next ? 'warning' : 'success');
      return next;
    });
  }, [showToast]);

  const handleLogout = useCallback(() => {
    withLoader("LOGGING OUT...", () => {
      localStorage.removeItem('zet5_auth');
      setUser(null);
    });
  }, [withLoader]);

  const handleResetSetup = useCallback(() => {
    localStorage.removeItem('zet5_setup');
    localStorage.removeItem('zet5_daily_averages');
    localStorage.removeItem('zet5_engineer_setup');
    localStorage.removeItem('zet5_profiles');
    localStorage.removeItem('zet5_auth');
    resetEngine();
    setSetupComplete(false);
    setSetupData(null);
    setDailyAverages([]);
    setEngineState(null);
    setEngineerSetup(null);
    setUser(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    withLoader("CLEARING HISTORICAL DATA...", () => {
      localStorage.removeItem('zet5_daily_averages');
      setDailyAverages([]);
      setHistory([[], [], [], [], []]);
      showToast("Daily average history cleared successfully! Audit trail remains intact.", 'success');
    });
  }, [showToast, withLoader]);

  // --- Dissertation Requirement: Autonomous Emergency Shedding (5.5.2) ---
  const autoShedTriggered = useRef(false);

  useEffect(() => {
    if (tokenState?.isEmergency && !autoShedTriggered.current) {
      if (setupData?.autoShedEmergency) {
        setShowEmergencyIntercept(true);
      } else {
        showToast("EMERGENCY: Token balance is critical. Please manually shed high-load appliances!", 'error');
      }
      autoShedTriggered.current = true;
    } else if (tokenState && !tokenState.isEmergency) {
      autoShedTriggered.current = false;
    }
  }, [tokenState?.isEmergency, setupData?.autoShedEmergency, showToast]);

  if (!engineerSetup) return <EngineerSetupPage onComplete={handleEngineerSetupComplete} />;
  if (!user) return <LoginPage onLogin={setUser} linkedEmail={engineerSetup?.clientEmail} />;
  if (!setupComplete) return <SetupWizard onComplete={handleSetupComplete} />;

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} onLogout={handleLogout} onStartTour={() => setShowTour(true)} />
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
              onOpenAdvice={() => setShowAdvice(true)}
              onOpenEmergency={() => setShowEmergency(true)}
              onOpenMeterSync={() => setShowMeterSync(true)}
              onSimulateHours={handleSimulateHours}
              tickCount={tickCount}
              dataCollectionMinutes={dataCollectionMinutes}
              dailyAverages={dailyAverages}
              vacant={vacant}
              notifyThreshold={notifyThreshold}
              engineState={engineState}
              tokenState={tokenState}
              gridBlackout={gridBlackout}
              onToggleBlackout={handleToggleBlackout}
              activeScheduleId={activeScheduleId}
              onRedirectToRecharge={() => {
                setPage('management');
                setTimeout(() => {
                  const el = document.getElementById('recharge-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              relays={relays}
              onToggleRelay={handleRelayToggle}
              showBreakdown={showBreakdown}
              setShowBreakdown={setShowBreakdown}
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
          {page === 'history' && (
            <DailyAverages
              dailyAverages={dailyAverages}
              profiles={profiles}
              vacant={vacant}
            />
          )}
          {page === 'audit' && (
            <AuditTrail
              profiles={profiles}
            />
          )}
          {page === 'inference' && (
            <div className="fade-in">
              <div className="section-title"><span className="dot" /> Active Insights & Telemetry Warnings</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                Real-time recommendations and anomalies parsed by ZET-5's predictive thermodynamic engine.
              </p>
              <div className="alerts-section">
                {(alerts || []).map((a) => (
                  <div key={a.id} className={`alert-item ${a.type}`}>
                    <div className="alert-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {a.type === 'danger' ? (
                          <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                        ) : a.type === 'warning' ? (
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        ) : (
                          <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>
                        )}
                      </svg>
                    </div>
                    <div className="alert-text">
                      <h4>{a.title}</h4>
                      <p>{a.message}</p>
                      {a.actionable && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            onClick={() => handleAcceptAdvice(a.relayIndex)}
                            className="alert-action"
                            id={`alert-shed-btn-${a.relayIndex}`}
                          >
                            Shed Load Now
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="alert-time">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {page === 'settings' && (
            <Settings
              setupData={setupData}
              notifyThreshold={notifyThreshold}
              onThresholdUpdate={handleThresholdUpdate}
              onEmergencyThresholdUpdate={handleEmergencyThresholdUpdate}
              onResetSetup={handleResetSetup}
              onClearHistory={handleClearHistory}
              engineerSetup={engineerSetup}
              onGoalUpdate={handleGoalUpdate}
            />
          )}
        </div>
      </div>

      <SmartAdvice
        alerts={alerts}
        relays={relays}
        onAcceptAdvice={handleAcceptAdvice}
        activeScheduleId={activeScheduleId}
        onApplySchedule={handleApplySchedule}
        visible={showAdvice}
        onClose={() => setShowAdvice(false)}
        tokenKwhRemaining={engineState ? Math.max(0, engineState.tokenKwh - engineState.cumulativeKwh) : (setupData?.tokenData?.kwh || 3.0)}
        targetHours={setupData?.durationGoal ? setupData.durationGoal * 24 : 504}
        tokenState={tokenState}
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

      {showEmergencyIntercept && (
        <EmergencyInterceptModal
          kwhRemaining={(tokenState?.kwhRemaining || 0).toFixed(2)}
          onKeepSchedule={() => {
            setShowEmergencyIntercept(false);
            showToast("Emergency Overridden: Existing load configuration maintained.", "warning");
          }}
          onAutoShed={() => {
            setShowEmergencyIntercept(false);
            const geyserIndex = profiles.findIndex(p => p.name.toLowerCase() === 'geyser');
            const profileIdx = geyserIndex !== -1 ? geyserIndex : 1;
            const targetIndex = profileIdx + 1;
            if (relays[targetIndex] === true) {
              handleRelayToggle(targetIndex, false);
              showToast(`EMERGENCY AUTONOMY: Shedding Tier 3 load (${profiles[profileIdx].name}).`, 'danger');
            }
          }}
          onOpenAdvice={() => {
            setShowEmergencyIntercept(false);
            setShowAdvice(true);
          }}
        />
      )}

      {loadingState.isLoading && (
        <LoadingOverlay message={loadingState.message} />
      )}

      <DepletionModal
        visible={setupComplete && !dismissCutoff && (engineState ? (engineState.tokenKwh - engineState.cumulativeKwh <= 0) : false)}
        onGoToRecharge={() => {
          setPage('management');
          setDismissCutoff(true);
          setTimeout(() => {
            const el = document.getElementById('recharge-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
          showToast("Redirected to settings panel for Recharge/Sync!", 'success');
        }}
      />

      {showTour && (
        <TourGuide
          activePage={page}
          setPage={setPage}
          onClose={() => setShowTour(false)}
          showBreakdown={showBreakdown}
          setShowBreakdown={setShowBreakdown}
        />
      )}

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
              {t.type === 'warning' ? '!' : 'OK'}
            </span>
            <span style={{ letterSpacing: '0.01em' }}>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
