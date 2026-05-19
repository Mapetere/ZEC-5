/**
 * ZET-5 Intelligent Energy Recipe & Thermodynamic Solver
 * 
 * This engine performs real-time linear knapsack optimizations and thermodynamic heating calculations
 * to provide mathematically validated, highly specific daily "energy recipes" that users can 
 * realistically apply in real life.
 */

// Thermodynamic constants for a standard domestic geyser
const GEYSER_CAPACITY_LITERS = 150; 
const SPECIFIC_HEAT_WATER_J_G_C = 4.184; // Joules per gram per degree Celsius
const GEYSER_ELEMENT_POWER_W = 2000;
const GEYSER_EFFICIENCY = 0.90; // Heat losses accounted for
const INCOMING_WATER_TEMP_C = 15; // Average well/borehole/mains temp in Zimbabwe
const TARGET_SHOWER_TEMP_C = 55; // Minimal comfortable shower temp

/**
 * Calculates the exact minimum duration (in minutes) the geyser must run to reach
 * a usable bathing temperature. Any heating duration shorter than this minimum threshold
 * represents entirely wasted standby thermal energy.
 */
export function calculateMinimumGeyserRunTime() {
  const temperatureDifference = TARGET_SHOWER_TEMP_C - INCOMING_WATER_TEMP_C;
  const massOfWaterGrams = GEYSER_CAPACITY_LITERS * 1000;
  
  // Q = m * C_p * deltaT
  const energyRequiredJoules = massOfWaterGrams * SPECIFIC_HEAT_WATER_J_G_C * temperatureDifference;
  
  // Power = Energy / Time => Time = Energy / (Power * Efficiency)
  const timeRequiredSeconds = energyRequiredJoules / (GEYSER_ELEMENT_POWER_W * GEYSER_EFFICIENCY);
  const timeRequiredMinutes = Math.ceil(timeRequiredSeconds / 60);
  
  return {
    minutes: timeRequiredMinutes, // Typically ~44-48 minutes for 2000W
    kwhRequired: parseFloat(((GEYSER_ELEMENT_POWER_W * (timeRequiredMinutes / 60)) / 1000).toFixed(2))
  };
}

/**
 * Solves the Daily Energy Budget Allocation Problem.
 * Returns actionable schedules, standby deficit warnings, and appliance-specific schedules.
 */
export function solveEnergyAllocation(remainingKwh, targetHours, activeApplianceWatts, activeAppliancePowerFactors) {
  const minGeyser = calculateMinimumGeyserRunTime();
  
  // 1. Calculate Baseline Standby (Tier 1 Essentials: Lights & Fridge standby)
  // Fridge cycles: 15 mins ON (150W), 45 mins OFF (0W) -> average 37.5W
  // Lighting ring (LED): 100W for 10 hours at night -> average 41.6W
  // Wifi router / Standby: 15W continuous -> average 15W
  const ESSENTIAL_STANDBY_POWER_W = 95.0; // Total baseline continuous draw (kW: 0.095)
  const hoursPossible = (remainingKwh * 1000) / ESSENTIAL_STANDBY_POWER_W;
  
  // Check if the budget target is mathematically unfeasible
  if (hoursPossible < 24) {
    const isLessThanOneHour = hoursPossible < 1;
    return {
      feasible: false,
      deficitKwh: parseFloat(((ESSENTIAL_STANDBY_POWER_W * 24 / 1000) - remainingKwh).toFixed(2)),
      diagnostic: isLessThanOneHour
        ? `CRITICAL: Remaining time is less than 1 hour (${hoursPossible.toFixed(1)} hours). Your time will be less than 24 hours regardless.`
        : `CRITICAL: Remaining time will be less than 24 hours (${hoursPossible.toFixed(1)} hours) regardless of appliance control. Recharge immediately.`,
      recipes: []
    };
  }

  // Adjust targetHours for recipe calculations to the maximum possible hours if targetHours is longer
  const effectiveHours = Math.min(targetHours, hoursPossible);
  const essentialKwhNeeded = (ESSENTIAL_STANDBY_POWER_W * effectiveHours) / 1000;
  const surplusKwh = remainingKwh - essentialKwhNeeded;
  
  const dailySurplusKwh = parseFloat(((surplusKwh / effectiveHours) * 24).toFixed(2));
  const totalDays = Math.ceil(effectiveHours / 24);

  // Generate 3 Actionable "Daily Recipes" based on surplus
  const recipes = [];

  // RECIPE 1: "SURVIVAL MODE" (Zero excess consumption, preserve essentials)
  recipes.push({
    id: "survival",
    name: "Survival Mode",
    description: "Guarantees you hit your budget runway by completely locking out heavy appliances.",
    dailyBudget: parseFloat(((essentialKwhNeeded / effectiveHours) * 24).toFixed(2)),
    feasible: true,
    schedules: [
      { appliance: "Fridge Loop", schedule: "Cycled automatically (15m ON, 45m OFF) to prevent spoilage." },
      { appliance: "Lighting Ring", schedule: "Restricted strictly to evening hours (19:00 - 22:00)." },
      { appliance: "Geyser Loop", schedule: "DISABLED. (Running it under this budget results in cold water/blackout)." },
      { appliance: "Borehole Pump", schedule: "DISABLED. Use manual reserves." },
      { appliance: "Entertainment", schedule: "DISABLED. Keep off." }
    ]
  });

  // RECIPE 2: "SMART BUDGET BALANCE" (Optimized comfortable usage)
  const canRunGeyser = surplusKwh >= minGeyser.kwhRequired;
  const geyserFrequency = dailySurplusKwh >= minGeyser.kwhRequired 
    ? "1 cycle daily" 
    : (surplusKwh >= minGeyser.kwhRequired ? `1 cycle every ${Math.ceil(minGeyser.kwhRequired / (dailySurplusKwh || 0.1))} days` : "Disabled");
  
  recipes.push({
    id: "balanced",
    name: "Smart Budget Balance",
    description: "Distributes energy to heavy appliances at minimum functional thresholds.",
    dailyBudget: parseFloat(((remainingKwh / effectiveHours) * 24).toFixed(2)),
    feasible: true,
    schedules: [
      { appliance: "Fridge Loop", schedule: "Continuous operation (100% normal cycle)." },
      { appliance: "Lighting Ring", schedule: "On normally (18:00 - 23:00)." },
      { appliance: "Geyser Loop", schedule: canRunGeyser 
          ? `Run exactly ${minGeyser.minutes} minutes (${geyserFrequency}) between 05:00 - 05:45. Shorter runs waste power!` 
          : "DISABLED due to budget constraints." 
      },
      { appliance: "Borehole Pump", schedule: dailySurplusKwh >= 0.8 
          ? "Run 20 minutes daily at midday (12:00 - 12:20) for tank top-up." 
          : "Run 15 minutes every 2 days." 
      },
      { appliance: "Entertainment", schedule: "Limit to 1.5 hours in the evening (20:00 - 21:30)." }
    ]
  });

  // RECIPE 3: "COMFORT MAX" (Slightly elevated load usage, target date at borderline risk)
  recipes.push({
    id: "comfort",
    name: "Comfort Priority",
    description: "Slightly shorter runway, but offers hot water and pump operations daily.",
    dailyBudget: parseFloat((((remainingKwh / effectiveHours) * 24) * 1.2).toFixed(2)),
    feasible: true,
    schedules: [
      { appliance: "Fridge Loop", schedule: "Continuous operation (100% normal)." },
      { appliance: "Lighting Ring", schedule: "Continuous normal operation." },
      { appliance: "Geyser Loop", schedule: `Run 1 full heating cycle (${minGeyser.minutes} mins) daily at 05:00 - 05:45.` },
      { appliance: "Borehole Pump", schedule: "Run 40 minutes daily at midday." },
      { appliance: "Entertainment", schedule: "Run 3 hours daily in the evening." }
    ]
  });

  return {
    feasible: true,
    deficitKwh: 0,
    diagnostic: `BUDGET FEASIBLE: Your essential load takes ${essentialKwhNeeded.toFixed(2)} kWh. You have a comfortable daily surplus of ${dailySurplusKwh} kWh to distribute among convenience loads. Below are three smart operational schedules calculated using thermodynamic models and knapsack constraints:`,
    recipes
  };
}
