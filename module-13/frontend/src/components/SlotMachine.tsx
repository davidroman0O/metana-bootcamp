import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import SlotMachineLever from './Lever';
import IndividualReel from './IndividualReel';
import LCDDisplay, { LCDDisplayRef } from './LCDDisplay';
import { useAppMode } from '../contexts/AppModeContext';
import '../styles/SlotMachine.css';

// Symbol definitions - Boomer's Last Hope symbols
const SYMBOLS = [
  { id: 1, emoji: '📉', name: 'DUMP', color: '#ef4444' },      // Red
  { id: 2, emoji: '🤡', name: 'COPE', color: '#eab308' },      // Yellow  
  { id: 3, emoji: '📈', name: 'PUMP', color: '#22c55e' },      // Green
  { id: 4, emoji: '💎', name: 'DIAMOND', color: '#3b82f6' },   // Blue
  { id: 5, emoji: '🚀', name: 'ROCKET', color: '#a855f7' },    // Purple
  { id: 6, emoji: '🐵', name: 'JACKPOT', color: '#facc15' }    // Gold
];

/**
 * FLEXIBLE SLOT MACHINE SYSTEM
 * 
 * This slot machine now supports 1 to 10 reels dynamically!
 * 
 * Usage Examples:
 * - <SlotMachine /> // Default 3 reels
 * - <SlotMachine reelCount={1} /> // Single reel
 * - <SlotMachine reelCount={5} /> // 5 reels
 * - <SlotMachine reelCount={7} /> // Lucky 7 reels
 * 
 * APIs automatically adapt:
 * - setAllReelTargets([1,2,3,4,5]) for 5 reels
 * - setReelTarget(4, 6) for reel index 4
 * - Sequential reveal works for any count
 * - Payout logic adapts (perfect matches, pairs)
 */

// Slot Machine State Machine States
const MACHINE_STATE_IDLE = 'idle';
const MACHINE_STATE_SPINNING_UP = 'spinning_up';
const MACHINE_STATE_SPINNING = 'spinning';
const MACHINE_STATE_EVALUATING_RESULT = 'evaluating_result';

// Payouts - Boomer's Last Hope style
const MATCH_PAYOUT: { [key: number]: number } = {
  1: 111,   // DUMP triple
  2: 222,   // COPE triple  
  3: 333,   // PUMP triple
  4: 444,   // DIAMOND triple
  5: 555,   // ROCKET triple
  6: 666,   // JACKPOT triple
};

// Special payouts
const PAYOUT_ROCKET_PAIR = 100; // 🚀🚀X Special

// Reel area dimensions
const SYMBOL_SIZE = 100;
const REEL_AREA_HEIGHT = 300;

// Timing parameters
const EVALUATION_DELAY = 500; // ms to show result before going idle

// Classic slot machine deceleration timing
const FIRST_REEL_DELAY = 500;   // ms before first reel starts stopping
const REEL_STOP_INTERVAL = 800; // ms between each reel stop
const REEL_STOP_RANDOMNESS = 200; // ±ms random variation for natural feel

interface SlotMachineProps {
  onResult?: (symbols: number[], payout: number, payoutType: string) => void;
  onStateChange?: (state: string) => void;
  isConnected?: boolean;
  reelCount?: number; // Number of reels (default: 3, min: 1, max: 10)
}

interface SlotMachineRef {
  // Core API
  startSpin: (targetSymbols?: number[]) => boolean;
  forceStop: () => boolean;
  
  // State queries
  getState: () => string;
  isReady: () => boolean;
  isSpinning: () => boolean;
  
  // Display control
  updateDisplayMessage: (message: string) => void;
  getDisplayMessage: () => string;
  
  // Individual reel control
  setReelTarget: (reelIndex: number, symbol: number) => boolean;
  setAllReelTargets: (symbols: number[]) => boolean;
  
  // Reveal order control APIs
  setAllReelTargetsSequential: (symbols: number[]) => boolean;
  setAllReelTargetsSimultaneous: (symbols: number[]) => boolean;
  setReelTargetWithRevealOrder: (reelIndex: number, symbol: number, revealOrder: number) => boolean;
  
  // LCD Display API - exposed from LCDDisplay component
  lcd: {
    setMessage: (message: string) => void;
    getMessage: () => string;
    clear: () => void;
    setIdlePattern: () => void;
    setSpinningPattern: () => void;
    setWinPattern: (amount?: number) => void;
    setErrorPattern: () => void;
    startBlinking: (interval?: number) => void;
    stopBlinking: () => void;
    flashMessage: (message: string, duration?: number) => void;
    setMotivationalQuote: () => void;
    setASCIIAnimation: (type: 'dots' | 'bars' | 'arrows') => void;
    stopAnimation: () => void;
    setCustomPattern: (pattern: string) => void;
  };
  
  // Utility
  reset: () => void;
}

const SlotMachine = forwardRef<SlotMachineRef, SlotMachineProps>(({
  onResult,
  onStateChange,
  isConnected = false,
  reelCount = 3
}, ref) => {
  // Validate reelCount
  const validReelCount = Math.min(Math.max(reelCount, 1), 10); // Clamp between 1-10
  if (reelCount !== validReelCount) {
    console.warn(`Invalid reelCount ${reelCount}, clamped to ${validReelCount}`);
  }

  const { isControlledMode, isAnimatedMode } = useAppMode();
  const leverRef = useRef<any>(null);
  const lcdRef = useRef<LCDDisplayRef>(null);
  
  // Dynamic reel refs instead of fixed reel1Ref, reel2Ref, reel3Ref
  const reelRefs = useRef<Array<React.RefObject<any>>>(
    Array.from({ length: validReelCount }, () => React.createRef())
  );
  
  // State Machine State
  const currentStateRef = useRef<string>(MACHINE_STATE_IDLE);
  const targetSymbolsRef = useRef<number[] | null>(null);
  
  // Dynamic reel state tracking based on reel count
  const reelStatesRef = useRef<string[]>(Array(validReelCount).fill('idle'));
  const reelResultsRef = useRef<number[]>(Array(validReelCount).fill(1).map((_, i) => i + 1));
  const reelCompletionsRef = useRef<boolean[]>(Array(validReelCount).fill(false));
  
  // Sequential deceleration queue for old-school slot machine feel
  const decelerationQueueRef = useRef<Array<{reelIndex: number, targetSymbol: number}>>([]);
  const isSequentialStoppingRef = useRef<boolean>(false);
  const sequentialTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sequential reveal queue to ensure 0→1→2 reveal order
  const revealQueueRef = useRef<Array<{reelIndex: number, result: number}>>([]);
  const isSequentialRevealingRef = useRef<boolean>(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const capturedReelsRef = useRef<boolean[]>(Array(validReelCount).fill(false));
  const reelCaptureResultsRef = useRef<number[]>(Array(validReelCount).fill(0));
  const isSimultaneousRevealRef = useRef<boolean>(false);
  
  // UI State
  const [displayMessage, setDisplayMessage] = useState('Ready to play!');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [leverDisabled, setLeverDisabled] = useState(false);
  
  // Transition timers
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for dynamic lever positioning
  const slotFrameRef = useRef<HTMLDivElement>(null);
  const leverContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to check if ALL reels are truly ready
  const areAllReelsReady = (): boolean => {
    let readyCount = 0;
    let totalCount = 0;
    
    reelRefs.current.forEach((reelRef, index) => {
      if (reelRef?.current) {
        totalCount++;
        if (reelRef.current.isReady && reelRef.current.isReady()) {
          readyCount++;
        } else {
          const state = reelRef.current.getState ? reelRef.current.getState() : 'unknown';
          console.log(`⏳ Reel ${index} not ready (state: ${state})`);
        }
      }
    });
    
    const allReady = readyCount === validReelCount && totalCount === validReelCount;
    if (!allReady) {
      console.log(`🚨 Reels readiness check: ${readyCount}/${validReelCount} ready, ${totalCount}/${validReelCount} connected`);
    }
    
    return allReady;
  };

  // Update refs when reel count changes and clear any pending operations
  useEffect(() => {
    // Clear any pending operations when reel count changes
    if (sequentialTimerRef.current) {
      clearTimeout(sequentialTimerRef.current);
      sequentialTimerRef.current = null;
    }
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    
    // Clear queues
    decelerationQueueRef.current = [];
    revealQueueRef.current = [];
    isSequentialStoppingRef.current = false;
    isSequentialRevealingRef.current = false;
    
    // Reset arrays to match new reel count
    reelStatesRef.current = Array(validReelCount).fill('idle');
    reelResultsRef.current = Array(validReelCount).fill(1).map((_, i) => i + 1);
    reelCompletionsRef.current = Array(validReelCount).fill(false);
    capturedReelsRef.current = Array(validReelCount).fill(false);
    reelCaptureResultsRef.current = Array(validReelCount).fill(0);
    
    // Recreate refs for new reel count
    reelRefs.current = Array.from({ length: validReelCount }, () => React.createRef());
    
    console.log(`🎰 Reel count changed to ${validReelCount}, cleared all queues`);
  }, [validReelCount]);

  // Dynamic lever positioning
  useEffect(() => {
    const positionLever = () => {
      if (slotFrameRef.current && leverContainerRef.current) {
        const slotFrameRect = slotFrameRef.current.getBoundingClientRect();
        const slotFrameWidth = slotFrameRect.width;
        
        // Position lever at the RIGHT EDGE of the yellow slot frame
        // The lever should start where the yellow frame ends
        const leverLeftPosition = slotFrameWidth; // At the right edge of yellow frame
        
        leverContainerRef.current.style.left = `${leverLeftPosition}px`;
        
        console.log(`🎮 Lever positioned at RIGHT EDGE: ${leverLeftPosition}px (yellow frame width: ${slotFrameWidth}px)`);
      }
    };

    // Position immediately
    positionLever();

    // Position after a short delay to ensure DOM is fully rendered
    const timer = setTimeout(positionLever, 100);

    // Position on window resize
    window.addEventListener('resize', positionLever);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', positionLever);
    };
  }, [validReelCount]); // Re-run when reel count changes

  // State Machine Methods
  const transitionToState = (newState: string) => {
    const oldState = currentStateRef.current;
    currentStateRef.current = newState;
    
    console.log(`🎰 SlotMachine: ${oldState} → ${newState}`);
    onStateChange?.(newState);
    
    // Handle state entry actions
    switch (newState) {
      case MACHINE_STATE_IDLE:
        handleIdleEntry();
        break;
      case MACHINE_STATE_SPINNING_UP:
        handleSpinningUpEntry();
        break;
      case MACHINE_STATE_SPINNING:
        handleSpinningEntry();
        break;
      case MACHINE_STATE_EVALUATING_RESULT:
        handleEvaluatingResultEntry();
        break;
    }
  };

  // State Entry Handlers
  const handleIdleEntry = () => {
    setDisplayMessage(isAnimatedMode ? '🎬 Demo mode ready!' : 'Ready to play!');
    setLogMessages([]);
    setLeverDisabled(false);
    
    // Set LCD to idle pattern
    lcdRef.current?.setIdlePattern();
    
    // Clear any timers
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    
    // In animated mode, start demo cycle
      if (isAnimatedMode) {
      startDemoMode();
    }
  };

  const handleSpinningUpEntry = () => {
    setDisplayMessage('Starting spin...');
    setLeverDisabled(true);
    
    // Set LCD to spinning pattern
    lcdRef.current?.setSpinningPattern();
    
    // Reset completion tracking for new spin
    reelCompletionsRef.current = Array(validReelCount).fill(false);
    
    // Validate all reel refs are properly connected AND each reel is ready
    let refsConnected = 0;
    let reelsReady = 0;
    
    reelRefs.current.forEach((reelRef, index) => {
      if (reelRef?.current) {
        refsConnected++;
        
        // CRITICAL: Check if this specific reel is actually ready
        if (reelRef.current.isReady && reelRef.current.isReady()) {
          reelsReady++;
        } else {
          const reelState = reelRef.current.getState ? reelRef.current.getState() : 'unknown';
          console.warn(`🚨 Reel ${index} ref exists but NOT READY (state: ${reelState})`);
        }
      } else {
        console.warn(`🚨 Reel ${index} ref is not connected`);
      }
    });
    
    if (refsConnected !== validReelCount) {
      console.error(`🚨 Only ${refsConnected}/${validReelCount} reel refs connected. Aborting spin.`);
      setDisplayMessage('Error: Reels not ready. Try resetting.');
      setTimeout(() => transitionToState(MACHINE_STATE_IDLE), 1000);
      return;
    }
    
    if (reelsReady !== validReelCount) {
      console.error(`🚨 Only ${reelsReady}/${validReelCount} reels ready (${refsConnected} connected). Some reels are busy!`);
      setDisplayMessage(`Error: ${validReelCount - reelsReady} reel(s) still busy. Wait a moment...`);
      setTimeout(() => transitionToState(MACHINE_STATE_IDLE), 1000);
      return;
    }
    
    console.log(`✅ All ${reelsReady} reels are connected AND ready`);
    
    // Start all reels spinning
    let success = true;
    let startedReels = 0;
    reelRefs.current.forEach((reelRef, index) => {
      if (reelRef.current) {
        const started = reelRef.current.startSpin();
        if (started) {
          startedReels++;
        } else {
          console.error(`🚨 Failed to start reel ${index}`);
        }
        success = success && started;
      }
    });
    
    if (!success || startedReels !== validReelCount) {
      console.error(`🚨 Failed to start reels: ${startedReels}/${validReelCount} started`);
      setDisplayMessage('Error: Failed to start reels. Resetting...');
      setTimeout(() => transitionToState(MACHINE_STATE_IDLE), 1000);
      return;
    }
    
    console.log(`✅ Successfully started all ${startedReels} reels`);
    
    // Set target symbols if provided
    if (targetSymbolsRef.current) {
      reelRefs.current.forEach((reelRef, index) => {
        if (reelRef.current && targetSymbolsRef.current) {
          reelRef.current.setTargetSymbol(targetSymbolsRef.current[index]);
        }
      });
    }
    
    // Safety timeout: if we don't transition to SPINNING within 5 seconds, reset
    transitionTimerRef.current = setTimeout(() => {
      if (currentStateRef.current === MACHINE_STATE_SPINNING_UP) {
        console.error('🚨 Stuck in SPINNING_UP state for 5 seconds. Force resetting.');
        setDisplayMessage('Spin timeout. Resetting...');
        setTimeout(() => transitionToState(MACHINE_STATE_IDLE), 1000);
      }
    }, 5000);
  };

  const handleSpinningEntry = () => {
    setDisplayMessage('Spinning...');
    // LCD already set to spinning pattern in handleSpinningUpEntry
    // Wait for external stop commands (lever or programmatic)
  };

  const handleEvaluatingResultEntry = () => {
    setDisplayMessage('Calculating result...');
    // Keep LCD showing spinning pattern until result is evaluated
    
    // Small delay before evaluation for smoothness
    transitionTimerRef.current = setTimeout(() => {
      evaluateResult();
    }, EVALUATION_DELAY);
  };

  // API Implementation
  const startSpin = (targetSymbols?: number[]): boolean => {
    if (currentStateRef.current !== MACHINE_STATE_IDLE) {
      console.warn('SlotMachine: Cannot start spin, not in idle state');
      return false;
    }
    
    // CRITICAL: Check if ALL individual reels are actually ready
    if (!areAllReelsReady()) {
      console.error('SlotMachine: Cannot start spin, not all reels are ready');
      setDisplayMessage('Some reels are busy. Please wait...');
      return false;
    }
    
    // Validate target symbols if provided
    if (targetSymbols) {
      if (targetSymbols.length !== validReelCount || targetSymbols.some(s => s < 1 || s > 6)) {
        console.error('SlotMachine: Invalid target symbols');
        return false;
      }
      targetSymbolsRef.current = [...targetSymbols];
    } else {
      targetSymbolsRef.current = null;
    }
    
    console.log(`🎮 SlotMachine: Starting spin${targetSymbols ? ` with targets [${targetSymbols.join(', ')}]` : ''}`);
    transitionToState(MACHINE_STATE_SPINNING_UP);
    return true;
  };

  const forceStop = (): boolean => {
    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      return false;
    }
    
    console.log('🛑 SlotMachine: Force stopping all reels');
    reelRefs.current.forEach((reelRef, index) => {
      if (reelRef && reelRef.current && index < reelRefs.current.length) {
        reelRef.current.forceStop();
      }
    });
    return true;
  };

  const stopWithTargets = (targetSymbols: number[]): boolean => {
    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      return false;
    }
    
    if (targetSymbols.length !== validReelCount) {
      console.error(`stopWithTargets: Expected ${validReelCount} symbols, got ${targetSymbols.length}`);
      return false;
    }
    
    console.log(`🎯 SlotMachine: Stopping with targets [${targetSymbols.join(', ')}]`);
    
    // Stop reels with staggered timing for realistic effect
    targetSymbols.forEach((symbol, index) => {
      if (index < reelRefs.current.length && reelRefs.current[index]?.current) {
        setTimeout(() => {
          reelRefs.current[index].current?.forceStop(symbol);
        }, index * 500); // Stagger by 500ms per reel
      }
    });
    
    return true;
  };

  const getState = (): string => currentStateRef.current;
  
  const isReady = (): boolean => {
    return currentStateRef.current === MACHINE_STATE_IDLE && areAllReelsReady();
  };
  
  const isSpinning = (): boolean => {
    return currentStateRef.current === MACHINE_STATE_SPINNING_UP ||
           currentStateRef.current === MACHINE_STATE_SPINNING ||
           currentStateRef.current === MACHINE_STATE_EVALUATING_RESULT;
  };

  const updateDisplayMessage = (message: string): void => {
    setDisplayMessage(message);
  };

  const getDisplayMessage = (): string => {
    return displayMessage;
  };

  const reset = (): void => {
    console.log('🔄 SlotMachine: Resetting to idle');
    
    // Clear all timers
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    if (sequentialTimerRef.current) {
      clearTimeout(sequentialTimerRef.current);
      sequentialTimerRef.current = null;
    }
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    
    // Reset sequential stopping state
    decelerationQueueRef.current = [];
    isSequentialStoppingRef.current = false;
    
    // Reset sequential reveal state
    revealQueueRef.current = [];
    isSequentialRevealingRef.current = false;
    capturedReelsRef.current = Array(validReelCount).fill(false);
    reelCaptureResultsRef.current = Array(validReelCount).fill(0);
    isSimultaneousRevealRef.current = false;
    
    // Reset all reels
    reelRefs.current.forEach(reelRef => {
      if (reelRef.current) {
        reelRef.current.reset();
      }
    });
    
    // Reset state
    reelStatesRef.current = Array(validReelCount).fill('idle');
    reelCompletionsRef.current = Array(validReelCount).fill(false); // Reset completion tracking
    targetSymbolsRef.current = null;
    
    transitionToState(MACHINE_STATE_IDLE);
  };

  // Sequential deceleration processor for classic slot machine feel
  const processDecelerationQueue = () => {
    if (decelerationQueueRef.current.length === 0 || isSequentialStoppingRef.current) {
      return;
    }
    
    isSequentialStoppingRef.current = true;
    console.log(`🎰 Starting sequential deceleration with ${decelerationQueueRef.current.length} queued stops`);
    
    // Process first reel after initial delay
    sequentialTimerRef.current = setTimeout(() => {
      processNextReelStop(0);
    }, FIRST_REEL_DELAY);
  };

  const processNextReelStop = (stopIndex: number) => {
    if (stopIndex >= decelerationQueueRef.current.length) {
      // All reels processed
      isSequentialStoppingRef.current = false;
      decelerationQueueRef.current = [];
      console.log('🎰 Sequential deceleration complete');
      return;
    }
    
    const { reelIndex, targetSymbol } = decelerationQueueRef.current[stopIndex];
    
    // Bounds checking to prevent runtime errors
    if (reelIndex >= reelRefs.current.length) {
      console.error(`🚨 Invalid reel index ${reelIndex}, max is ${reelRefs.current.length - 1}`);
      // Skip this reel and continue with next
      if (stopIndex < decelerationQueueRef.current.length - 1) {
        const randomDelay = REEL_STOP_INTERVAL + (Math.random() - 0.5) * REEL_STOP_RANDOMNESS;
        sequentialTimerRef.current = setTimeout(() => {
          processNextReelStop(stopIndex + 1);
        }, randomDelay);
      } else {
        isSequentialStoppingRef.current = false;
        decelerationQueueRef.current = [];
      }
      return;
    }
    
    const reelRef = reelRefs.current[reelIndex];
    
    console.log(`🎯 Sequential stop ${stopIndex + 1}: Reel ${reelIndex} → Symbol ${targetSymbol}`);
    
    // Set target and force stop this reel
    if (reelRef.current) {
      reelRef.current.setTargetSymbol(targetSymbol);
      // Note: setTargetSymbol now auto-transitions to spinning_down, so no need for forceStop
    }
    
    // Schedule next reel stop with randomized delay for natural feel
    if (stopIndex < decelerationQueueRef.current.length - 1) {
      const randomDelay = REEL_STOP_INTERVAL + (Math.random() - 0.5) * REEL_STOP_RANDOMNESS;
      sequentialTimerRef.current = setTimeout(() => {
        processNextReelStop(stopIndex + 1);
      }, randomDelay);
    } else {
      // Last reel, finish up
      isSequentialStoppingRef.current = false;
      decelerationQueueRef.current = [];
    }
  };

  const setReelTarget = (reelIndex: number, symbol: number): boolean => {
    if (reelIndex < 0 || reelIndex > validReelCount - 1 || symbol < 1 || symbol > 6) {
      console.error(`Invalid reel index ${reelIndex} or symbol ${symbol}`);
      return false;
    }

    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      console.warn(`Cannot set reel target when machine is not spinning (current state: ${currentStateRef.current})`);
      return false;
    }

    console.log(`🎯 Queuing reel ${reelIndex} target: symbol ${symbol}`);
    
    // Add to queue (avoid duplicates for same reel)
    const existingIndex = decelerationQueueRef.current.findIndex(item => item.reelIndex === reelIndex);
    if (existingIndex >= 0) {
      // Update existing entry
      decelerationQueueRef.current[existingIndex].targetSymbol = symbol;
    } else {
      // Add new entry in reel order (0, 1, 2)
      decelerationQueueRef.current.push({ reelIndex, targetSymbol: symbol });
      decelerationQueueRef.current.sort((a, b) => a.reelIndex - b.reelIndex);
    }
    
    // Start processing if not already running
    processDecelerationQueue();
    
    return true;
  };

  const setAllReelTargets = (symbols: number[]): boolean => {
    if (symbols.length !== validReelCount) {
      console.error(`setAllReelTargets requires exactly ${validReelCount} symbols`);
      return false;
    }

    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      console.warn(`Cannot set reel targets when machine is not spinning (current state: ${currentStateRef.current})`);
      return false;
    }

    console.log(`🎯 Queuing all reel targets: [${symbols.join(', ')}]`);
    
    // Clear existing queue and add all reels in order
    decelerationQueueRef.current = symbols.map((symbol, index) => ({
      reelIndex: index,
      targetSymbol: symbol
    }));
    
    // Start sequential processing
    processDecelerationQueue();
    
    return true;
  };

  // Sequential reveal - reels reveal in strict 0→1→2 order with dramatic pauses
  const setAllReelTargetsSequential = (symbols: number[]): boolean => {
    if (symbols.length !== validReelCount) {
      console.error(`setAllReelTargetsSequential requires exactly ${validReelCount} symbols`);
      return false;
    }

    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      console.warn(`Cannot set reel targets when machine is not spinning (current state: ${currentStateRef.current})`);
      return false;
    }

    console.log(`🎭 Queuing all reel targets with sequential reveal: [${symbols.join(', ')}]`);
    
    // Use standard targeting but the sequential reveal system handles the timing
    return setAllReelTargets(symbols);
  };

  // Simultaneous reveal - all reels reveal together once all have captured
  const setAllReelTargetsSimultaneous = (symbols: number[]): boolean => {
    if (symbols.length !== validReelCount) {
      console.error(`setAllReelTargetsSimultaneous requires exactly ${validReelCount} symbols`);
      return false;
    }

    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      console.warn(`Cannot set reel targets when machine is not spinning (current state: ${currentStateRef.current})`);
      return false;
    }

    console.log(`⚡ Queuing all reel targets with simultaneous reveal: [${symbols.join(', ')}]`);
    
    // Set flag for simultaneous reveal mode
    isSimultaneousRevealRef.current = true;
    
    return setAllReelTargets(symbols);
  };

  // Individual reel with custom reveal order
  const setReelTargetWithRevealOrder = (reelIndex: number, symbol: number, revealOrder: number): boolean => {
    if (reelIndex < 0 || reelIndex > validReelCount - 1 || symbol < 1 || symbol > 6 || revealOrder < 0 || revealOrder > validReelCount - 1) {
      console.error(`Invalid reel index ${reelIndex}, symbol ${symbol}, or reveal order ${revealOrder}`);
      return false;
    }

    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      console.warn(`Cannot set reel target when machine is not spinning (current state: ${currentStateRef.current})`);
      return false;
    }

    console.log(`🎯 Queuing reel ${reelIndex} target: symbol ${symbol} with reveal order ${revealOrder}`);
    
    // Store the custom reveal order for this reel
    // This would require extending the system to handle custom orders
    return setReelTarget(reelIndex, symbol);
  };

  // Event Handlers
  const handleReelStateChange = (reelIndex: number, state: string) => {
    reelStatesRef.current[reelIndex] = state;
    
    console.log(`🔄 Reel ${reelIndex}: ${state} (States: [${reelStatesRef.current.join(', ')}])`);
    
    // Check for state transitions based on reel states
    checkStateTransitions();
  };

  const handleReelResult = (reelIndex: number, symbol: number) => {
    reelResultsRef.current[reelIndex] = symbol;
    console.log(`🎯 Reel ${reelIndex}: Result = ${symbol} (Results: [${reelResultsRef.current.join(', ')}])`);
    
    // Queue result for sequential reveal instead of immediate processing
    queueReelResult(reelIndex, symbol);
  };

  // Sequential result reveal system
  // Ensures reels always reveal results in 0→1→2 order for cinematic effect
  // Even if they capture targets at different times
  const queueReelResult = (reelIndex: number, symbol: number) => {
    capturedReelsRef.current[reelIndex] = true;
    reelCaptureResultsRef.current[reelIndex] = symbol;
    
    console.log(`📦 Reel ${reelIndex}: Result queued = ${symbol} (Captured: [${capturedReelsRef.current.join(', ')}])`);
    
    // Start sequential reveal if not already running
    processRevealQueue();
  };

  const processRevealQueue = () => {
    if (isSequentialRevealingRef.current) return;
    
    isSequentialRevealingRef.current = true;
    console.log(`🎭 Starting sequential reveal process`);
    
    // Process reels in order 0→1→2
    processNextReveal(0);
  };

  const processNextReveal = (reelIndex: number) => {
    if (reelIndex >= validReelCount) {
      // All reels revealed
      isSequentialRevealingRef.current = false;
      isSimultaneousRevealRef.current = false; // Reset flag
      console.log('🎭 Sequential reveal complete');
      
      // Now check if all reels are actually showing results
      checkStateTransitions();
      return;
    }
    
    // Wait for this reel to be captured
    if (!capturedReelsRef.current[reelIndex]) {
      console.log(`⏳ Waiting for reel ${reelIndex} to capture...`);
      // Check again in 100ms
      revealTimerRef.current = setTimeout(() => {
        processNextReveal(reelIndex);
      }, 100);
      return;
    }
    
    const revealType = isSimultaneousRevealRef.current ? 'simultaneously' : 'sequentially';
    console.log(`🎭 Revealing reel ${reelIndex} ${revealType} with result ${reelCaptureResultsRef.current[reelIndex]}`);
    
    // Mark this reel as completed for transition logic
    reelCompletionsRef.current[reelIndex] = true;
    
    // Schedule next reel reveal with timing based on mode
    const revealDelay = isSimultaneousRevealRef.current ? 0 : 300; // No delay for simultaneous
    revealTimerRef.current = setTimeout(() => {
      processNextReveal(reelIndex + 1);
    }, revealDelay);
  };

  const checkStateTransitions = () => {
    const states = reelStatesRef.current;
    const currentState = currentStateRef.current;
    
    switch (currentState) {
      case MACHINE_STATE_SPINNING_UP:
        // All reels must be spinning to move to spinning state
        if (states.every(s => s === 'spinning')) {
          transitionToState(MACHINE_STATE_SPINNING);
        }
        break;
        
      case MACHINE_STATE_SPINNING:
        // Don't mark reels as completed here - let sequential reveal system handle it
        // Just transition to evaluation when ALL reels have been revealed sequentially
        if (reelCompletionsRef.current.every(completed => completed)) {
          console.log('🎰 All reels sequentially revealed - transitioning to evaluation');
          transitionToState(MACHINE_STATE_EVALUATING_RESULT);
        }
        break;
    }
  };

  // Result Evaluation
  const evaluateResult = () => {
    const results = reelResultsRef.current;
    const messages: string[] = [];
    let totalPayout = 0;
    let payoutType = 'LOSE';
    
    console.log(`💰 Evaluating result: [${results.join(', ')}]`);
    
    // Perfect match - all symbols the same
    if (results.every(symbol => symbol === results[0])) {
      const payout = MATCH_PAYOUT[results[0]] || 0;
      if (payout > 0) {
        const symbolName = SYMBOLS[results[0] - 1].name;
        messages.push(`${symbolName} ${validReelCount === 3 ? 'TRIPLE' : 'MATCH'}! ${payout} CHIPS!`);
        totalPayout += payout;
        payoutType = `${symbolName} ${validReelCount === 3 ? 'TRIPLE' : 'MATCH'}`;
      }
    }
    // Special rocket pair (🚀🚀X) - only applies if we have at least 2 reels
    else if (validReelCount >= 2 && results[0] === 5 && results[1] === 5) {
      messages.push(`ROCKET SPECIAL! ${PAYOUT_ROCKET_PAIR} CHIPS!`);
      totalPayout += PAYOUT_ROCKET_PAIR;
      payoutType = 'ROCKET SPECIAL';
    }
    // Any pair - check if any two symbols match
    else if (validReelCount >= 2) {
      let hasPair = false;
      for (let i = 0; i < results.length - 1; i++) {
        for (let j = i + 1; j < results.length; j++) {
          if (results[i] === results[j]) {
            hasPair = true;
            break;
          }
        }
        if (hasPair) break;
      }
      
      if (hasPair) {
      const pairPayout = 50;
      messages.push(`PAIR MATCH! ${pairPayout} CHIPS!`);
      totalPayout += pairPayout;
        payoutType = 'PAIR WIN';
      }
    }
    
    console.log(`💰 Total payout: ${totalPayout}`);
    
    setLogMessages(messages);
    
    if (totalPayout > 0) {
      setDisplayMessage(`WIN! ${totalPayout} CHIPS!`);
      // Set LCD to win pattern with payout amount
      lcdRef.current?.setWinPattern(totalPayout);
    } else {
      setDisplayMessage('No win this time...');
      // Flash a motivational message on LCD
      lcdRef.current?.flashMessage('NEXT TIME!', 2000);
    }
    
    // Notify parent of result
    onResult?.(results, totalPayout, payoutType);
    
    // Return to idle after showing result
    transitionTimerRef.current = setTimeout(() => {
      transitionToState(MACHINE_STATE_IDLE);
    }, 3000);
  };

  // Demo Mode
  const startDemoMode = () => {
    if (!isAnimatedMode || currentStateRef.current !== MACHINE_STATE_IDLE) return;
    
    demoTimerRef.current = setTimeout(() => {
      if (leverRef.current && currentStateRef.current === MACHINE_STATE_IDLE && isAnimatedMode) {
        leverRef.current.triggerPull(1.0);
      }
      if (isAnimatedMode) {
        startDemoMode();
      }
    }, 5000);
  };

  // Lever Integration
  useEffect(() => {
    if (leverRef.current) {
      leverRef.current.setCallback(async () => {
        console.log(`🎮 LEVER PULLED - Machine state: ${currentStateRef.current}`);
        
        if (currentStateRef.current !== MACHINE_STATE_IDLE) {
          console.log("⚠️ Machine is busy");
          return "Machine is busy!";
        }
        
        // Start spin (no targets = random result)
        const success = startSpin();
        if (!success) {
          return "Failed to start spin!";
        }
        
        // In animated mode, auto-stop after delay with random targets
        if (isAnimatedMode) {
          setTimeout(() => {
            const randomTargets = Array.from({ length: validReelCount }, () => Math.floor(Math.random() * 6) + 1);
            console.log(`🎯 Auto-stopping with random targets: [${randomTargets.join(', ')}]`);
            stopWithTargets(randomTargets);
          }, 2000 + Math.random() * 2000); // 2-4 seconds
        }
        
        return "Spin started!";
      });
    }
  }, [isAnimatedMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
      }
      if (sequentialTimerRef.current) {
        clearTimeout(sequentialTimerRef.current);
      }
    };
  }, []);

  // Expose API to parent
  useImperativeHandle(ref, () => ({
    startSpin,
    forceStop,
    getState,
    isReady,
    isSpinning,
    updateDisplayMessage,
    getDisplayMessage,
    reset,
    setReelTarget,
    setAllReelTargets,
    setAllReelTargetsSequential: setAllReelTargetsSequential,
    setAllReelTargetsSimultaneous: setAllReelTargetsSimultaneous,
    setReelTargetWithRevealOrder: setReelTargetWithRevealOrder,
    // LCD Display API - forward to LCD component
    lcd: {
      setMessage: (message: string) => lcdRef.current?.setMessage(message),
      getMessage: () => lcdRef.current?.getMessage() || '',
      clear: () => lcdRef.current?.clear(),
      setIdlePattern: () => lcdRef.current?.setIdlePattern(),
      setSpinningPattern: () => lcdRef.current?.setSpinningPattern(),
      setWinPattern: (amount?: number) => lcdRef.current?.setWinPattern(amount),
      setErrorPattern: () => lcdRef.current?.setErrorPattern(),
      startBlinking: (interval?: number) => lcdRef.current?.startBlinking(interval),
      stopBlinking: () => lcdRef.current?.stopBlinking(),
      flashMessage: (message: string, duration?: number) => lcdRef.current?.flashMessage(message, duration),
      setMotivationalQuote: () => lcdRef.current?.setMotivationalQuote(),
      setASCIIAnimation: (type: 'dots' | 'bars' | 'arrows') => lcdRef.current?.setASCIIAnimation(type),
      stopAnimation: () => lcdRef.current?.stopAnimation(),
      setCustomPattern: (pattern: string) => lcdRef.current?.setCustomPattern(pattern)
    }
  }));

  // Handle coin insert
  const handleCoin = async () => {
    console.log('💰 Coin inserted');
    // This would integrate with the parent's coin handling logic
  };

  return (
    <div className="slot-machine-container">
      {/* Main slot machine frame */}
      <div className="slot-frame" ref={slotFrameRef}>
        {/* Header - LCD Display at top */}
        <div className="slot-header" style={{ marginBottom: '5px' }}>
          <LCDDisplay ref={lcdRef} />
        </div>

        {/* Independent Reels Container */}
        <div className="independent-reels-container" data-reel-count={validReelCount}>
          <div className="reels-frame">
            {reelRefs.current.map((reelRef, index) => (
              <IndividualReel
                key={`reel-${index}-${validReelCount}`}
                ref={reelRef}
                reelIndex={index}
                onStateChange={handleReelStateChange}
                onResult={handleReelResult}
                disabled={leverDisabled}
                width={SYMBOL_SIZE}
                height={REEL_AREA_HEIGHT}
              />
            ))}
          </div>
          
          {/* Payline overlay */}
          <div className="payline-overlay">
            <div className="payline"></div>
          </div>
        </div>

        {/* State display bar at bottom */}
        <div className="state-display-bar">
          <div className="status-indicator">
            <div className={`status-light ${currentStateRef.current === MACHINE_STATE_IDLE ? 'ready' : 'busy'}`}></div>
            <span className="status-text">
              {currentStateRef.current === MACHINE_STATE_IDLE 
                ? 'READY TO SPIN' 
                : currentStateRef.current === MACHINE_STATE_SPINNING_UP 
                  ? 'SPINNING UP' 
                  : currentStateRef.current === MACHINE_STATE_SPINNING 
                    ? 'SPINNING' 
                    : 'EVALUATING'}
            </span>
          </div>
          
          {/* Results messages when there's a win */}
          {logMessages.length > 0 && (
            <div className="win-messages">
              {logMessages.map((msg, i) => (
                <div key={i} className="win-message" style={{color: '#00ff00', fontSize: '12px'}}>{msg}</div>
              ))}
            </div>
          )}
        </div>

        {/* Coin slot at the bottom of the machine frame */}
        <div className="coin-slot-bottom">
          <div
            className="coin-slot-button"
            onClick={handleCoin}
          >
            <div className="coin-slot-hole"></div>
            <div className="coin-slot-text">
              {isControlledMode ? "INSERT CHIPS" : "DEMO MODE"}
            </div>
          </div>
        </div>

        {/* Lever positioned dynamically via JavaScript */}
        <div className="lever-container" ref={leverContainerRef}>
          <SlotMachineLever
            ref={leverRef}
            position="left" 
            cylinderOrientation="right" 
            cylinderLength={1.9}
            ballSize={1.5}
            showIndicator={false}
            cylinderDiameter={1.5}
            stickLength={1.2}
            disabled={leverDisabled}
          />
        </div>
      </div>
    </div>
  );
});

SlotMachine.displayName = 'SlotMachine';

export default SlotMachine;
export type { SlotMachineRef }; 