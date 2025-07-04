import { useRef, useCallback, useEffect } from 'react';
import { QuoteManager } from '../utils/quotes';

// Symbol IDs for generating random results
const SYMBOL_IDS = [1, 2, 3, 4, 5, 6]; // 📉 🤡 📈 💎 🚀 🐵

// Timing configuration for animations - BALANCED timing for better quote display
const ANIMATION_CONFIG = {
  IDLE_DISPLAY_TIME: 2500,      // How long to show idle quotes (2.5s)
  LEVER_PULL_DELAY: 200,        // Delay before pulling lever (0.2s)
  SPIN_DURATION: 1500,          // How long reels spin (1.5s)
  REEL_REVEAL_DELAY: 400,       // Delay between each reel stopping (0.4s)
  SYMBOL_QUOTE_TIME: 1500,      // How long to show individual symbol quotes (1.5s) - REMOVED PER REEL
  RESULT_QUOTE_TIME: 3000,      // How long to show final result quote (3s)
  CYCLE_PAUSE: 1500,            // Pause between animation cycles (1.5s)
  CONNECT_INCENTIVE_CHANCE: 0.25 // 25% chance to show connect incentive
};

interface SlotAnimatorConfig {
  reelCount?: number;
  autoStart?: boolean;
  cyclePause?: number;
}

export function useSlotAnimator(config: SlotAnimatorConfig = {}) {
  const {
    reelCount = 3,
    autoStart = true,
    cyclePause = ANIMATION_CONFIG.CYCLE_PAUSE
  } = config;

  // Refs for slot machine and animation control
  const slotMachineRef = useRef<any>(null);
  const animationRunningRef = useRef(false);
  const currentCycleRef = useRef(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Animation state
  const isAnimatingRef = useRef(false);
  const shouldStopRef = useRef(false);

  // Utility: Clear all pending timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
  }, []);

  // Utility: Add timeout with cleanup tracking
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      // Remove this timeout from tracking
      timeoutRefs.current = timeoutRefs.current.filter(t => t !== timeout);
    }, delay);
    timeoutRefs.current.push(timeout);
    return timeout;
  }, []);

  // Generate random symbols with some bias towards winning combinations
  const generateRandomSymbols = useCallback((): number[] => {
    const symbols: number[] = [];
    const random = Math.random();
    
    console.log(`🎲 Generating symbols for ${reelCount} reels (random: ${random.toFixed(3)})`);
    
    // 20% chance for jackpot (all same)
    if (random < 0.2) {
      const jackpotSymbol = SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)];
      const result = Array(reelCount).fill(jackpotSymbol);
      console.log(`🎰 Generated JACKPOT: [${result.join(', ')}]`);
      return result;
    }
    
    // 30% chance for partial match (at least half matching)
    if (random < 0.5) {
      const matchSymbol = SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)];
      const matchCount = Math.ceil(reelCount / 2);
      
      // Fill with matching symbols
      for (let i = 0; i < matchCount; i++) {
        symbols.push(matchSymbol);
      }
      
      // Fill remaining with random
      for (let i = matchCount; i < reelCount; i++) {
        symbols.push(SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]);
      }
      
      // Shuffle to randomize positions
      const result = symbols.sort(() => Math.random() - 0.5);
      console.log(`🎯 Generated PARTIAL MATCH: [${result.join(', ')}] (${matchCount} matching ${matchSymbol})`);
      return result;
    }
    
    // 50% chance for completely random
    for (let i = 0; i < reelCount; i++) {
      symbols.push(SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]);
    }
    
    console.log(`🎲 Generated RANDOM: [${symbols.join(', ')}]`);
    return symbols;
  }, [reelCount]);

  // Main animation cycle
  const runAnimationCycle = useCallback(async () => {
    if (!slotMachineRef.current || shouldStopRef.current) return;

    isAnimatingRef.current = true;
    currentCycleRef.current++;

    console.log(`🎬 Starting animation cycle #${currentCycleRef.current}`);

    try {
      const machine = slotMachineRef.current;

      // Phase 1: Show idle quote with connect incentive chance
      const showConnectIncentive = Math.random() < ANIMATION_CONFIG.CONNECT_INCENTIVE_CHANCE;
      const idleQuote = showConnectIncentive 
        ? QuoteManager.getConnectIncentiveQuote()
        : QuoteManager.getStateQuote('idle');
      
      machine.lcd?.setMessage(idleQuote);
      
      await new Promise(resolve => {
        addTimeout(() => resolve(void 0), ANIMATION_CONFIG.IDLE_DISPLAY_TIME);
      });

      if (shouldStopRef.current) return;

      // Phase 2: Generate target symbols and pull lever
      const targetSymbols = generateRandomSymbols();
      console.log(`🎯 Target symbols: [${targetSymbols.join(', ')}]`);

      // Show spinning quote
      machine.lcd?.setMessage(QuoteManager.getStateQuote('spinning'));

      // Pull the lever first to start the spin
      if (!machine.pullLever) {
        console.warn('⚠️ pullLever method not available');
        return;
      }

      const leverPulled = machine.pullLever(1.0);
      if (!leverPulled) {
        console.warn('⚠️ Failed to pull lever');
        return;
      }

      // Wait for machine to transition to spinning state
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => {
          addTimeout(() => resolve(void 0), 200);
        });

        if (shouldStopRef.current) return;

        const currentState = machine.getState ? machine.getState() : 'unknown';
        console.log(`🔄 Waiting for spin state, current: ${currentState} (attempt ${attempts + 1})`);
        
        if (currentState === 'spinning') {
          console.log('✅ Machine is spinning, setting targets now');
          
          if (machine.setAllReelTargets) {
            const success = machine.setAllReelTargets(targetSymbols);
            if (success) {
              console.log(`🎯 Successfully set targets: [${targetSymbols.join(', ')}]`);
            } else {
              console.warn('⚠️ Failed to set target symbols');
            }
          } else {
            console.warn('⚠️ setAllReelTargets method not available');
          }
          break;
        }
        
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn('⚠️ Machine never reached spinning state, skipping target setting');
      }

      // Phase 3: Wait for spin duration
      await new Promise(resolve => {
        addTimeout(() => resolve(void 0), ANIMATION_CONFIG.SPIN_DURATION);
      });

      if (shouldStopRef.current) return;

      // Phase 4: Show final result quote directly (skip individual symbol quotes)
      const resultQuote = QuoteManager.getResultQuote(targetSymbols);
      machine.lcd?.setMessage(resultQuote);

      // Phase 5: Wait for result display time
      await new Promise(resolve => {
        addTimeout(() => resolve(void 0), ANIMATION_CONFIG.RESULT_QUOTE_TIME);
      });

      if (shouldStopRef.current) return;

      // Phase 6: Cycle pause before next round
      await new Promise(resolve => {
        addTimeout(() => resolve(void 0), cyclePause);
      });

      // Schedule next cycle if not stopped
      if (!shouldStopRef.current && animationRunningRef.current) {
        addTimeout(() => {
          runAnimationCycle();
        }, 100);
      }

    } catch (error) {
      console.error('❌ Animation cycle error:', error);
    } finally {
      isAnimatingRef.current = false;
    }
  }, [reelCount, cyclePause, generateRandomSymbols, addTimeout]);

  // Start animation
  const startAnimation = useCallback(() => {
    if (animationRunningRef.current) {
      console.log('🎬 Animation already running');
      return;
    }

    console.log('🎬 Starting slot machine animation');
    animationRunningRef.current = true;
    shouldStopRef.current = false;
    currentCycleRef.current = 0;

    // Start first cycle
    runAnimationCycle();
  }, [runAnimationCycle]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    console.log('🛑 Stopping slot machine animation');
    animationRunningRef.current = false;
    shouldStopRef.current = true;
    clearAllTimeouts();

    // Show appropriate idle message instead of debug text
    if (slotMachineRef.current?.lcd) {
      slotMachineRef.current.lcd.setMessage(QuoteManager.getConnectIncentiveQuote());
    }
  }, [clearAllTimeouts]);

  // Pause/Resume animation
  const pauseAnimation = useCallback(() => {
    shouldStopRef.current = true;
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  const resumeAnimation = useCallback(() => {
    if (animationRunningRef.current && shouldStopRef.current) {
      shouldStopRef.current = false;
      addTimeout(() => {
        runAnimationCycle();
      }, 1000);
    }
  }, [runAnimationCycle, addTimeout]);

  // Manual trigger for immediate animation
  const triggerAnimation = useCallback(() => {
    if (!isAnimatingRef.current) {
      runAnimationCycle();
    }
  }, [runAnimationCycle]);

  // Auto-start animation when enabled
  useEffect(() => {
    if (autoStart && slotMachineRef.current) {
      // Small delay to ensure slot machine is fully initialized
      const startTimer = setTimeout(() => {
        startAnimation();
      }, 1000);

      return () => clearTimeout(startTimer);
    }
  }, [autoStart, startAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    // Ref to pass to SlotMachine component
    slotMachineRef,
    
    // Animation controls
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    triggerAnimation,
    
    // State
    isAnimating: isAnimatingRef.current,
    isRunning: animationRunningRef.current,
    currentCycle: currentCycleRef.current,
    
    // Manual quote control (for testing or custom flows)
    showQuote: (quote: string) => {
      if (slotMachineRef.current?.lcd) {
        slotMachineRef.current.lcd.setMessage(quote);
      }
    },
    
    showRandomQuote: (type: 'idle' | 'spinning' | 'motivational' | 'connect') => {
      let quote: string;
      switch (type) {
        case 'idle':
          quote = QuoteManager.getStateQuote('idle');
          break;
        case 'spinning':
          quote = QuoteManager.getStateQuote('spinning');
          break;
        case 'motivational':
          quote = QuoteManager.getMotivationalQuote();
          break;
        case 'connect':
          quote = QuoteManager.getConnectIncentiveQuote();
          break;
        default:
          quote = QuoteManager.getMotivationalQuote();
      }
      
      if (slotMachineRef.current?.lcd) {
        slotMachineRef.current.lcd.setMessage(quote);
      }
    }
  };
}