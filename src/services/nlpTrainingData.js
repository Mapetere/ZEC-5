// Training dataset for the ZET-5 Naive Bayes NLP Classifier
// Maps user statements (including typos/colloquialisms) to specific appliance intents.

export const TRAINING_DATA = [
  // STOVE / COOKING
  { text: "i want to cook", intent: "Stove" },
  { text: "make some dinner", intent: "Stove" },
  { text: "boil water for tea", intent: "Stove" },
  { text: "use the stove", intent: "Stove" },
  { text: "fry some eggs", intent: "Stove" },
  { text: "i ned to cook lunch", intent: "Stove" }, // typo
  { text: "warm up food on the stove", intent: "Stove" },
  { text: "make super", intent: "Stove" }, // typo
  { text: "turn on the oven", intent: "Stove" },
  { text: "bake a cake", intent: "Stove" },
  { text: "cookin a meal", intent: "Stove" },
  { text: "prepare some food", intent: "Stove" },

  // GEYSER / SHOWER
  { text: "take a hot shower", intent: "Geyser" },
  { text: "i want to bath", intent: "Geyser" },
  { text: "turn on the geyser", intent: "Geyser" },
  { text: "heat up water for bathing", intent: "Geyser" },
  { text: "i need a shower", intent: "Geyser" },
  { text: "showering", intent: "Geyser" },
  { text: "need hot water", intent: "Geyser" },
  { text: "on the geyser", intent: "Geyser" },
  { text: "geyser for bath", intent: "Geyser" },
  { text: "warm bath", intent: "Geyser" },
  { text: "bath water", intent: "Geyser" },
  { text: "have a quick wash", intent: "Geyser" },
  { text: "can i use the geyser today", intent: "Geyser" },
  { text: "use the geyser", intent: "Geyser" },
  { text: "i want to use the geyser", intent: "Geyser" },

  // ENTERTAINMENT / TV
  { text: "watch some tv", intent: "Entertainment" },
  { text: "put on the television", intent: "Entertainment" },
  { text: "play playstation", intent: "Entertainment" },
  { text: "watch a movie", intent: "Entertainment" },
  { text: "turn on the tv", intent: "Entertainment" },
  { text: "need to watch the news", intent: "Entertainment" },
  { text: "use the entertainment system", intent: "Entertainment" },
  { text: "listen to the radio", intent: "Entertainment" },
  { text: "wacth netflix", intent: "Entertainment" }, // typo
  { text: "play some games", intent: "Entertainment" },
  { text: "use the computer", intent: "Entertainment" },
  { text: "sound system", intent: "Entertainment" },

  // FRIDGE / COOLING
  { text: "use the fridge", intent: "Fridge" },
  { text: "keep the fridge on", intent: "Fridge" },
  { text: "cool some drinks", intent: "Fridge" },
  { text: "put stuff in the freezer", intent: "Fridge" },
  { text: "refrigerator", intent: "Fridge" },
  { text: "frige power", intent: "Fridge" }, // typo
  { text: "keep food cold", intent: "Fridge" },
  { text: "dont let the meat spoil", intent: "Fridge" },
  { text: "chill the beers", intent: "Fridge" },

  // LIGHTING
  { text: "turn on the lights", intent: "Lighting" },
  { text: "i need to see", intent: "Lighting" },
  { text: "its dark put the lights on", intent: "Lighting" },
  { text: "switch on the bulbs", intent: "Lighting" },
  { text: "house lighting", intent: "Lighting" },
  { text: "need lights for the kitchen", intent: "Lighting" },
  { text: "outside lights", intent: "Lighting" },
  { text: "leave the security lights on", intent: "Lighting" },
  { text: "keep it lit", intent: "Lighting" },

  // BOREHOLE / PUMP
  { text: "pump some water", intent: "Borehole" },
  { text: "use the borehole", intent: "Borehole" },
  { text: "turn on the water pump", intent: "Borehole" },
  { text: "fill the jojo tank", intent: "Borehole" },
  { text: "water the garden", intent: "Borehole" },
  { text: "boerhole", intent: "Borehole" }, // typo
  { text: "need water in the house", intent: "Borehole" },
  { text: "run the booster pump", intent: "Borehole" }
];
