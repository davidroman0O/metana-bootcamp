// Quote system for slot machine LCD display
// Organized by context: states, symbols, and combinations

export interface QuoteSystem {
  states: {
    idle: string[];
    spinning: string[];
    evaluating: string[];
    winning: string[];
    losing: string[];
  };
  symbols: {
    [symbolId: number]: string[];
  };
  combinations: {
    [reelCount: number]: {
      jackpot: string[];
      matching: string[];
      near_miss: string[];
      bust: string[];
    };
  };
  motivational: string[];
  connect_incentives: string[];
}

export const QUOTE_SYSTEM: QuoteSystem = {
  // State-based quotes for different machine states
  states: {
    idle: [
      "Ready for glory?",
      "Fortune favors the brave!",
      "Your destiny awaits...",
      "Feeling lucky, punk?",
      "Time to make it rain!",
      "The casino wants YOU!",
      "Insert courage here...",
      "Dreams start with a spin",
      "What could go wrong?",
      "YOLO loading...",
      "Ape mode: ACTIVATED",
      "To the moon or bust!",
      "Diamonds hands only!",
      "HODL and spin!",
      "Bullish on luck!"
    ],
    spinning: [
      "Rolling the dice of fate!",
      "Destiny in motion...",
      "The universe decides...",
      "Calculating your future...",
      "Luck protocols loading...",
      "Fortune.exe running...",
      "Quantum luck engaged!",
      "Probability waves spinning",
      "Chaos theory in action",
      "Random gods awakening...",
      "Launching moon mission!",
      "Diamond hands spinning!",
      "To infinity and beyond!",
      "Rocket fuel burning...",
      "Ape spirits dancing!"
    ],
    evaluating: [
      "Calculating karma...",
      "Checking luck balance...",
      "Fortune processing...",
      "Destiny.exe loading...",
      "Running luck algorithms",
      "Scanning probability space",
      "Consulting crystal ball...",
      "Asking the magic 8-ball",
      "Rolling cosmic dice...",
      "Universe calculating...",
      "Moon coordinates locked!",
      "Diamond clarity check...",
      "Rocket trajectory set!",
      "Ape wisdom consulting...",
      "Meme magic activating!"
    ],
    winning: [
      "Winner winner chicken dinner!",
      "The prophecy is fulfilled!",
      "You've cracked the code!",
      "Fortune smiles upon you!",
      "Lucky stars aligned!",
      "Victory is yours!",
      "Champions are born!",
      "Dreams do come true!",
      "The force is strong!",
      "Legendary status achieved!",
      "TO THE MOON! 🚀",
      "Diamond hands paid off!",
      "Ape strong together! 🦍",
      "Number go up! 📈",
      "Blessed by Pepe! 🐸"
    ],
    losing: [
      "Almost had it!",
      "Close but no cigar!",
      "Better luck next time!",
      "The house edge bites!",
      "Fortune is fickle...",
      "Next spin could be IT!",
      "Patience, young padawan",
      "Every loss is a lesson",
      "Persistence pays off!",
      "Never give up!",
      "Paper hands punished!",
      "Diamond hands required!",
      "HODL the line! 💎",
      "Apes never surrender!",
      "Buy the dip and spin!"
    ]
  },

  // Symbol-specific quotes when reels land
  symbols: {
    1: [ // 📉 DUMP
      "Red alert! DUMP incoming!",
      "Markets are crashing!",
      "Bear market activated!",
      "Blood on the streets!",
      "Time to buy the dip?",
      "DUMP it! Load ze Korea FUD!",
      "Paper hands selling!",
      "Bears are dancing!",
      "Portfolio.exe stopped working",
      "This is fine... 🔥"
    ],
    2: [ // 🤡 COPE
      "Clown world activated!",
      "Hope meets reality!",
      "Copium levels critical!",
      "Keep coping, soldier!",
      "Hopium dealer arrived!",
      "This is fine, right?",
      "Denial stage detected!",
      "Clown shoes equipped!",
      "Reality check bounced!",
      "Cope harder! 🤡"
    ],
    3: [ // 📈 PUMP
      "Green candles rising!",
      "Bull run confirmed!",
      "Number go up! 📈",
      "To the stratosphere!",
      "Pump it up!",
      "Bull market energy!",
      "Diamond hands rejoice!",
      "Gains train loading!",
      "Green dildos everywhere!",
      "Money printer goes BRRR!"
    ],
    4: [ // 💎 DIAMOND
      "Diamond hands detected!",
      "Precious metals rising!",
      "Shine bright like a diamond!",
      "HODL mode activated!",
      "Unbreakable resolve!",
      "Crystal clear victory!",
      "Diamond in the rough!",
      "Pressure makes diamonds!",
      "Forever stones! 💎",
      "Hands of steel!"
    ],
    5: [ // 🚀 ROCKET
      "Launch sequence initiated!",
      "Rocket fuel burning!",
      "To the moon! 🚀",
      "Space mission approved!",
      "Escape velocity reached!",
      "Moon tickets validated!",
      "Houston, we have liftoff!",
      "Interstellar travel mode!",
      "Blast off, baby!",
      "Apes to space! 🦍🚀"
    ],
    6: [ // 🐵 JACKPOT
      "Ape has evolved! 🦍",
      "Monke see, monke win!",
      "Banana plantation owned!",
      "King Kong status!",
      "Alpha ape detected!",
      "Gorilla warfare won!",
      "Monkey business paid off!",
      "Silverback victory!",
      "Ape together strong!",
      "Return to monke successful!"
    ]
  },

  // Combination-specific quotes based on reel count and result type
  combinations: {
    3: {
      jackpot: [
        "TRIPLE JACKPOT! 🦍🦍🦍",
        "Three of a kind perfection!",
        "Holy trinity achieved!",
        "Triple threat unlocked!",
        "Three's company, winner!",
        "Perfect alignment! ✨",
        "Triple crown victory!",
        "Three times the charm!"
      ],
      matching: [
        "Double trouble! Nice!",
        "Pair pressure pays off!",
        "Two's company!",
        "Double or nothing won!",
        "Twin towers of luck!",
        "Double down success!",
        "Pair-fect result!"
      ],
      near_miss: [
        "SO CLOSE! One more!",
        "Almost legendary!",
        "Next time, champion!",
        "On the edge of glory!",
        "Millimeters from millions!",
        "Tantalizingly close!",
        "Almost tasted victory!"
      ],
      bust: [
        "Chaos mode activated!",
        "Random is as random does",
        "Variety is the spice!",
        "Mix it up, baby!",
        "Chaos theory proven!",
        "Random gods laughing",
        "Entropy wins again!"
      ]
    },
    4: {
      jackpot: [
        "QUAD DAMAGE! 🚀🚀🚀🚀",
        "Four horsemen aligned!",
        "Fantastic four unite!",
        "Quadruple threat mode!",
        "Four-leaf clover luck!",
        "Cardinal directions agree!",
        "Four elements harmony!",
        "Quattro perfection!"
      ],
      matching: [
        "Triple threat achieved!",
        "Three's a crowd winner!",
        "Triple crown glory!",
        "Three strikes, you WIN!",
        "Trinity of luck!",
        "Triple blessing received!",
        "Three-peat champion!"
      ],
      near_miss: [
        "Three out of four! GAH!",
        "75% of perfection!",
        "Almost quad squad!",
        "One symbol from legend!",
        "So close to quad glory!",
        "Next spin is THE ONE!",
        "Quarter away from glory!"
      ],
      bust: [
        "Four-way split decision!",
        "Diversity achieved!",
        "Four corners chaos!",
        "Random quartet!",
        "Chaos in four parts!",
        "Four-way confusion!",
        "Disorder level: QUAD!"
      ]
    },
    5: {
      jackpot: [
        "PENTAGON PERFECTION! 💎💎💎💎💎",
        "Five-star general rank!",
        "High-five to the gods!",
        "Quintuple excellence!",
        "Five fingers of fate!",
        "Pentagon protocol complete!",
        "Five-alarm jackpot!",
        "Olympic rings complete!"
      ],
      matching: [
        "Four-some fantastic!",
        "Quad squad assembled!",
        "Four-leaf luck active!",
        "Quadruple threat mode!",
        "Four seasons aligned!",
        "Quartet of champions!",
        "Four-dimensional win!"
      ],
      near_miss: [
        "FOUR of FIVE! NOOO!",
        "80% perfection achieved!",
        "One away from legend!",
        "So close to pentagon!",
        "Four-fifths of glory!",
        "Missing puzzle piece!",
        "Almost quintuple crown!"
      ],
      bust: [
        "Five-way chaos party!",
        "Pentagon of randomness!",
        "Five flavors of chaos!",
        "Quintuple diversity!",
        "Five-ring circus!",
        "Pentagon confusion!",
        "Order level: ZERO!"
      ]
    },
    6: {
      jackpot: [
        "HEXAGON HARMONY! 🚀🚀🚀🚀🚀🚀",
        "Six-pack perfection!",
        "Hexagonal excellence!",
        "Six degrees of winning!",
        "Perfect hexagon formed!",
        "Six-shooter loaded!",
        "Hexagon protocol complete!",
        "Six-star general achieved!"
      ],
      matching: [
        "Magnificent five!",
        "Cinco de mayo victory!",
        "Five-star excellence!",
        "Pentagon complete!",
        "High-five deserved!",
        "Five-alarm success!",
        "Quintuple crown!"
      ],
      near_miss: [
        "FIVE of SIX! ARGH!",
        "83% completion rate!",
        "One short of hexagon!",
        "So close to six-pack!",
        "Missing final piece!",
        "Almost perfect hex!",
        "Six-pack abs needed!"
      ],
      bust: [
        "Six-way split chaos!",
        "Hexagonal confusion!",
        "Six flavors of random!",
        "Chaos level: MAXIMUM!",
        "Six-ring circus!",
        "Hexagon of disorder!",
        "Pattern recognition failed!"
      ]
    },
    7: {
      jackpot: [
        "LUCKY SEVEN HEAVEN! 🐵🐵🐵🐵🐵🐵🐵",
        "Seven wonders achieved!",
        "Lucky number legend!",
        "Seven-fold blessing!",
        "Magnificent seven!",
        "Seven seas conquered!",
        "Seven-star perfection!",
        "Heaven's seven gates!"
      ],
      matching: [
        "Six-pack champion!",
        "Hexagonal victory!",
        "Six degrees of awesome!",
        "Six-shooter accuracy!",
        "Hexagon complete!",
        "Six-star general!",
        "Perfect hexagon!"
      ],
      near_miss: [
        "SIX of SEVEN! GAHHHH!",
        "86% of perfection!",
        "One away from seven!",
        "So close to lucky 7!",
        "Missing lucky charm!",
        "Almost seven heaven!",
        "Seven deadly close!"
      ],
      bust: [
        "Seven-way anarchy!",
        "Lucky number broken!",
        "Seven shades of chaos!",
        "Magnificent randomness!",
        "Seven-ring circus!",
        "Order level: NEGATIVE!",
        "Chaos level: LEGENDARY!"
      ]
    }
  },

  // General motivational quotes for random display
  motivational: [
    "Believe in your luck!",
    "Fortune favors the bold!",
    "Every spin is a new chance!",
    "Winners never quit!",
    "Trust the process!",
    "Your time will come!",
    "Persistence pays off!",
    "Dream big, spin bigger!",
    "Luck is preparation + opportunity!",
    "You miss 100% of spins you don't take!",
    "Diamond hands, diamond luck!",
    "HODL your dreams!",
    "To the moon and beyond!",
    "Ape strong together!",
    "This is the way!"
  ],

  // Special quotes to incentivize connecting wallet
  connect_incentives: [
    "Connect wallet for REAL wins!",
    "Real CHIPS = Real thrills!",
    "Connect and unleash the beast!",
    "Wallet connection = Win protection!",
    "Ready for the real deal?",
    "Connect to unlock TRUE power!",
    "Time to get serious!",
    "Connect for maximum damage!",
    "Show me the money! (Connect first)",
    "Real apes connect wallets!",
    "Connect wallet, activate beast mode!",
    "From spectator to gladiator!",
    "Connect for legendary status!",
    "Unlock your true potential!",
    "Real winners connect wallets!"
  ]
};

// Utility functions for getting random quotes
export class QuoteManager {
  private static getRandomQuote(quotes: string[]): string {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  static getStateQuote(state: keyof QuoteSystem['states']): string {
    return this.getRandomQuote(QUOTE_SYSTEM.states[state]);
  }

  static getSymbolQuote(symbolId: number): string {
    return this.getRandomQuote(QUOTE_SYSTEM.symbols[symbolId] || ['Symbol landed!']);
  }

  static getCombinationQuote(reelCount: number, type: 'jackpot' | 'matching' | 'near_miss' | 'bust'): string {
    const reelQuotes = QUOTE_SYSTEM.combinations[reelCount];
    if (!reelQuotes) {
      // Fallback to 3-reel quotes if specific count not found
      return this.getRandomQuote(QUOTE_SYSTEM.combinations[3][type]);
    }
    return this.getRandomQuote(reelQuotes[type]);
  }

  static getMotivationalQuote(): string {
    return this.getRandomQuote(QUOTE_SYSTEM.motivational);
  }

  static getConnectIncentiveQuote(): string {
    return this.getRandomQuote(QUOTE_SYSTEM.connect_incentives);
  }

  // Advanced combination detection
  static analyzeResult(symbols: number[]): { type: 'jackpot' | 'matching' | 'near_miss' | 'bust', count: number } {
    const counts = symbols.reduce((acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const maxCount = Math.max(...Object.values(counts));
    const uniqueSymbols = Object.keys(counts).length;

    // Jackpot: all symbols match
    if (maxCount === symbols.length) {
      return { type: 'jackpot', count: maxCount };
    }

    // Matching: significant number of same symbols
    if (maxCount >= Math.ceil(symbols.length / 2)) {
      return { type: 'matching', count: maxCount };
    }

    // Near miss: one away from jackpot
    if (maxCount === symbols.length - 1) {
      return { type: 'near_miss', count: maxCount };
    }

    // Bust: completely random
    return { type: 'bust', count: maxCount };
  }

  static getResultQuote(symbols: number[]): string {
    const analysis = this.analyzeResult(symbols);
    return this.getCombinationQuote(symbols.length, analysis.type);
  }
} 