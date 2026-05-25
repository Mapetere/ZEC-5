import { TRAINING_DATA } from './nlpTrainingData.js';

// --- Lightweight Naive Bayes Classifier ---
class NaiveBayesClassifier {
  constructor() {
    this.vocab = new Set();
    this.classCounts = {};
    this.wordCounts = {};
    this.totalDocs = 0;
  }

  tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 2);
  }

  train(dataset) {
    dataset.forEach(item => {
      const { text, intent } = item;
      const tokens = this.tokenize(text);
      
      this.totalDocs++;
      if (!this.classCounts[intent]) {
        this.classCounts[intent] = 0;
        this.wordCounts[intent] = {};
      }
      this.classCounts[intent]++;

      tokens.forEach(token => {
        this.vocab.add(token);
        if (!this.wordCounts[intent][token]) {
          this.wordCounts[intent][token] = 0;
        }
        this.wordCounts[intent][token]++;
      });
    });
  }

  predict(text) {
    const tokens = this.tokenize(text);
    let bestIntent = null;
    let maxLogProb = -Infinity;

    for (const intent in this.classCounts) {
      // Prior probability P(Intent)
      let logProb = Math.log(this.classCounts[intent] / this.totalDocs);
      
      // Total words in this intent
      const totalWordsInClass = Object.values(this.wordCounts[intent]).reduce((a, b) => a + b, 0);

      // Add log P(word | Intent) for each word in query (using Laplace smoothing)
      tokens.forEach(token => {
        const count = this.wordCounts[intent][token] || 0;
        logProb += Math.log((count + 1) / (totalWordsInClass + this.vocab.size));
      });

      if (logProb > maxLogProb) {
        maxLogProb = logProb;
        bestIntent = intent;
      }
    }
    
    return bestIntent;
  }
}

// Instantiate and train the classifier globally
const classifier = new NaiveBayesClassifier();
classifier.train(TRAINING_DATA);

// --- Entity Extractors ---

function extractDurationHours(text) {
  const minMatch = text.match(/(\d+)\s*(min|mins|minute|minutes)/i);
  if (minMatch) return parseInt(minMatch[1]) / 60;

  const hrMatch = text.match(/(\d+(?:\.\d+)?)\s*(hr|hrs|hour|hours)/i);
  if (hrMatch) return parseFloat(hrMatch[1]);
  
  return null;
}

function extractTargetRunwayDays(text) {
  const dayMatch = text.match(/(\d+)\s*(day|days)/i);
  if (dayMatch) return parseInt(dayMatch[1]);

  const weekMatch = text.match(/(\d+)\s*(week|weeks)/i);
  if (weekMatch) return parseInt(weekMatch[1]) * 7;
  
  return null; // Fallback to a default if not found
}

// --- Feasibility Math Engine ---

export function processEnergyQuery(text, kwhRemaining, profiles) {
  // 1. Predict Intent
  const intent = classifier.predict(text);
  
  // 2. Extract Entities
  const durationHours = extractDurationHours(text) || 1; // Default to 1 hour if unspecified
  const runwayDays = extractTargetRunwayDays(text) || 2; // Default to 2 days if unspecified
  const runwayHours = runwayDays * 24;

  // 3. Find target profile or fallback to a generic high load if it's "Stove" (since Stove isn't in default ZET-5 profiles)
  let targetAppliance = profiles.find(p => p.name.toLowerCase() === intent?.toLowerCase());
  let targetWatts = targetAppliance ? targetAppliance.base * 230 : 2500; // 2500W fallback for Stove/Oven

  // 4. Calculate Standby Load (Fridge & minimal lighting)
  // Assume we need at least the Fridge (index 0) running 50% duty cycle, and minimal lights (index 4) running 15% duty cycle.
  const fridge = profiles[0] ? profiles[0].base * 230 * 0.5 : 120; // ~120W avg
  const lights = profiles[4] ? profiles[4].base * 230 * 0.15 : 15; // ~15W avg
  const continuousLoadW = fridge + lights;

  // 5. Math
  const requestedKwh = (targetWatts * durationHours) / 1000;
  const standbyKwh = (continuousLoadW * runwayHours) / 1000;
  const totalRequiredKwh = requestedKwh + standbyKwh;

  const isFeasible = totalRequiredKwh <= kwhRemaining;
  const remainingAfter = kwhRemaining - totalRequiredKwh;

  // 6. Formulate Response
  const formattedDuration = durationHours < 1 
    ? `${Math.round(durationHours * 60)} minute${Math.round(durationHours * 60) === 1 ? '' : 's'}` 
    : `${durationHours} hour${durationHours === 1 ? '' : 's'}`;
  
  const formattedRunway = `${runwayDays} day${runwayDays === 1 ? '' : 's'}`;
  
  let response = "";

  let relayIndex = profiles.findIndex(p => p.name.toLowerCase() === intent?.toLowerCase());
  if (relayIndex === -1 && intent === "Stove") relayIndex = 3; // Mock map Stove to Relay 3 (Entertainment) if not found.

  let offerActivation = null;

  if (isFeasible) {
    response = `Yes! You can use the **${intent}** for ${formattedDuration}. This will cost approximately **${requestedKwh.toFixed(1)} kWh**. `;
    response += `With your current balance of ${kwhRemaining.toFixed(1)} kWh, you will still have enough power to maintain essential standby loads for the next **${formattedRunway}** (leaving you a buffer of ${remainingAfter.toFixed(1)} kWh).\n\n`;
    response += `*I can actively monitor the ${intent}. Type 'Activate' to automatically disconnect it once it has consumed exactly ${requestedKwh.toFixed(1)} kWh.*`;
    offerActivation = { limitKwh: requestedKwh, relayIndex, intent };
  } else {
    response = `I'm afraid that's too risky. Using the **${intent}** for ${formattedDuration} requires **${requestedKwh.toFixed(1)} kWh**, and maintaining essential loads for ${formattedRunway} requires another **${standbyKwh.toFixed(1)} kWh**. You only have ${kwhRemaining.toFixed(1)} kWh remaining.\n\n`;
    
    response += `**Alternative Options:**\n`;
    
    const remainingForStandby = kwhRemaining - requestedKwh;
    if (remainingForStandby > 0) {
      const actualRunwayHours = remainingForStandby / (continuousLoadW / 1000);
      const actualRunwayDays = actualRunwayHours / 24;
      if (actualRunwayDays >= 1) {
        response += `• If you must use it for ${formattedDuration}, your tokens will only last for **${actualRunwayDays.toFixed(1)} day${actualRunwayDays.toFixed(1) === '1.0' ? '' : 's'}** instead of ${formattedRunway}.\n`;
      } else {
        const floorHours = Math.floor(actualRunwayHours);
        response += `• If you must use it for ${formattedDuration}, you will run out of power in **${floorHours} hour${floorHours === 1 ? '' : 's'}**.\n`;
      }
    } else {
      response += `• You do not even have enough power to run the ${intent} for ${formattedDuration}. It will trip immediately.\n`;
    }

    const maxSafeActionKwh = kwhRemaining - standbyKwh;
    if (maxSafeActionKwh > 0) {
      const maxSafeHours = maxSafeActionKwh / (targetWatts / 1000);
      const maxSafeMins = Math.floor(maxSafeHours * 60);
      if (maxSafeMins > 0) {
        response += `• If you absolutely need to last ${runwayDays} days, you can only use the ${intent} for a maximum of **${maxSafeMins} minutes** today.\n\n`;
        response += `*I can actively monitor the ${intent} for you. Type 'Activate' to automatically disconnect it once it has consumed its safe limit of ${maxSafeActionKwh.toFixed(1)} kWh.*`;
        offerActivation = { limitKwh: maxSafeActionKwh, relayIndex, intent };
      } else {
        response += `• To last ${runwayDays} days, you must keep the ${intent} completely off.`;
      }
    } else {
      response += `• In fact, your current balance cannot even sustain your standby loads for ${runwayDays} days without the ${intent}.`;
    }
  }

  return {
    intent,
    durationHours,
    runwayDays,
    isFeasible,
    response,
    requestedKwh,
    standbyKwh,
    offerActivation
  };
}
