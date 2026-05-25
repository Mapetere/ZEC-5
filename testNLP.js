import { processEnergyQuery } from './src/services/nlpEngine.js';

const MOCK_PROFILES = [
  { name: 'Fridge', base: 1.2 },
  { name: 'Geyser', base: 3.8 },
  { name: 'Borehole', base: 2.1 },
  { name: 'Entertainment', base: 0.6 },
  { name: 'Lighting', base: 0.4 },
];

const TEST_QUERIES = [
  "I want to cook some food for 45 mins. Can I last 3 days?",
  "i need to take a hot shower for 15 minutes, will it last 1 week?",
  "can I watch a movie for 2 hours and last 5 days?",
  "boil water for tea for 10 mins and last 48 hours",
  "pump water for 2 hours and last 2 days",
  "need to wash up really quick for 5 mins, last 10 days" // challenging one
];

const REMAINING_KWH = 6.5; // Simulate low token balance

console.log('==============================================');
console.log(' ZET-5 AI ASSISTANT MODEL TEST RUN');
console.log(` Starting Token Balance: ${REMAINING_KWH} kWh`);
console.log('==============================================\n');

TEST_QUERIES.forEach(query => {
  console.log(`💬 USER: "${query}"`);
  
  try {
    const result = processEnergyQuery(query, REMAINING_KWH, MOCK_PROFILES);
    console.log(`🤖 PREDICTED INTENT: ${result.intent}`);
    console.log(`⏳ EXTRACTED DURATION: ${result.durationHours.toFixed(2)} hours`);
    console.log(`📅 EXTRACTED RUNWAY: ${result.runwayDays} days`);
    console.log(`💡 ENERGY REQ: ${result.requestedKwh.toFixed(2)} kWh (Action) + ${result.standbyKwh.toFixed(2)} kWh (Standby)`);
    console.log(`✅ FEASIBLE? ${result.isFeasible ? 'YES' : 'NO'}`);
    console.log(`💬 RESPONSE: ${result.response}`);
  } catch (e) {
    console.error("❌ ERROR:", e.message);
  }
  
  console.log('----------------------------------------------\n');
});
