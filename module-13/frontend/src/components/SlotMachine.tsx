import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import SlotMachineLever from './Lever';
import IndividualReel from './IndividualReel';
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
  
  // Utility
  reset: () => void;
}

const SlotMachine = forwardRef<SlotMachineRef, SlotMachineProps>(({
  onResult,
  onStateChange,
  isConnected = false
}, ref) => {
  const { isControlledMode, isAnimatedMode } = useAppMode();
  const leverRef = useRef<any>(null);
  const reel1Ref = useRef<any>(null);
  const reel2Ref = useRef<any>(null);
  const reel3Ref = useRef<any>(null);
  
  // State Machine State
  const currentStateRef = useRef<string>(MACHINE_STATE_IDLE);
  const targetSymbolsRef = useRef<number[] | null>(null);
  
  // Reel state tracking
  const reelStatesRef = useRef<string[]>(['idle', 'idle', 'idle']);
  const reelResultsRef = useRef<number[]>([1, 2, 3]);
  const reelCompletionsRef = useRef<boolean[]>([false, false, false]); // Track which reels have completed
  
  // Sequential deceleration queue for old-school slot machine feel
  const decelerationQueueRef = useRef<Array<{reelIndex: number, targetSymbol: number}>>([]);
  const isSequentialStoppingRef = useRef<boolean>(false);
  const sequentialTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // UI State
  const [displayMessage, setDisplayMessage] = useState('Ready to play!');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [leverDisabled, setLeverDisabled] = useState(false);
  
  // Transition timers
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Reset completion tracking for new spin
    reelCompletionsRef.current = [false, false, false];
    
    // Start all reels spinning
    const success1 = reel1Ref.current?.startSpin();
    const success2 = reel2Ref.current?.startSpin();
    const success3 = reel3Ref.current?.startSpin();
    
    if (!success1 || !success2 || !success3) {
      console.error('Failed to start one or more reels');
      transitionToState(MACHINE_STATE_IDLE);
      return;
    }
    
    // Set target symbols if provided
    if (targetSymbolsRef.current) {
      reel1Ref.current?.setTargetSymbol(targetSymbolsRef.current[0]);
      reel2Ref.current?.setTargetSymbol(targetSymbolsRef.current[1]);
      reel3Ref.current?.setTargetSymbol(targetSymbolsRef.current[2]);
    }
  };

  const handleSpinningEntry = () => {
    setDisplayMessage('Spinning...');
    // Wait for external stop commands (lever or programmatic)
  };

  const handleEvaluatingResultEntry = () => {
    setDisplayMessage('Calculating result...');
    
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
    
    // Validate target symbols if provided
    if (targetSymbols) {
      if (targetSymbols.length !== 3 || targetSymbols.some(s => s < 1 || s > 6)) {
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
    reel1Ref.current?.forceStop();
    reel2Ref.current?.forceStop();
    reel3Ref.current?.forceStop();
    return true;
  };

  const stopWithTargets = (targetSymbols: number[]): boolean => {
    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      return false;
    }
    
    console.log(`🎯 SlotMachine: Stopping with targets [${targetSymbols.join(', ')}]`);
    
    // Stop reels with staggered timing for realistic effect
    setTimeout(() => reel1Ref.current?.forceStop(targetSymbols[0]), 0);
    setTimeout(() => reel2Ref.current?.forceStop(targetSymbols[1]), 500);
    setTimeout(() => reel3Ref.current?.forceStop(targetSymbols[2]), 1000);
    
    return true;
  };

  const getState = (): string => currentStateRef.current;
  
  const isReady = (): boolean => currentStateRef.current === MACHINE_STATE_IDLE;
  
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
    
    // Reset sequential stopping state
    decelerationQueueRef.current = [];
    isSequentialStoppingRef.current = false;
    
    // Reset all reels
    reel1Ref.current?.reset();
    reel2Ref.current?.reset();
    reel3Ref.current?.reset();
    
    // Reset state
    reelStatesRef.current = ['idle', 'idle', 'idle'];
    reelCompletionsRef.current = [false, false, false]; // Reset completion tracking
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
    const reelRef = reelIndex === 0 ? reel1Ref : reelIndex === 1 ? reel2Ref : reel3Ref;
    
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
    if (reelIndex < 0 || reelIndex > 2 || symbol < 1 || symbol > 6) {
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
    if (symbols.length !== 3) {
      console.error('setAllReelTargets requires exactly 3 symbols');
      return false;
    }

    if (currentStateRef.current !== MACHINE_STATE_SPINNING) {
      console.warn(`Cannot set reel targets when machine is not spinning (current state: ${currentStateRef.current})`);
      return false;
    }

    console.log(`🎯 Queuing all reel targets: [${symbols.join(', ')}]`);
    
    // Clear existing queue and add all three reels in order
    decelerationQueueRef.current = [
      { reelIndex: 0, targetSymbol: symbols[0] },
      { reelIndex: 1, targetSymbol: symbols[1] },
      { reelIndex: 2, targetSymbol: symbols[2] }
    ];
    
    // Start sequential processing
    processDecelerationQueue();
    
    return true;
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
        // Mark reels as completed when they reach showing_result
        states.forEach((state, index) => {
          if (state === 'showing_result' && !reelCompletionsRef.current[index]) {
            reelCompletionsRef.current[index] = true;
            console.log(`🎯 Reel ${index} completed! Completions: [${reelCompletionsRef.current.join(', ')}]`);
          }
        });
        
        // Transition to evaluation when ALL reels have completed (reached showing_result)
        if (reelCompletionsRef.current.every(completed => completed)) {
          console.log('🎰 All reels completed - transitioning to evaluation');
          transitionToState(MACHINE_STATE_EVALUATING_RESULT);
        }
        break;
    }
  };

  // Result Evaluation
  const evaluateResult = () => {
    const [s1, s2, s3] = reelResultsRef.current;
    const messages: string[] = [];
    let totalPayout = 0;
    let payoutType = 'LOSE';
    
    console.log(`💰 Evaluating result: [${reelResultsRef.current.join(', ')}]`);
    
    // Perfect match
    if (s1 === s2 && s2 === s3) {
      const payout = MATCH_PAYOUT[s1] || 0;
      if (payout > 0) {
        const symbolName = SYMBOLS[s1 - 1].name;
        messages.push(`${symbolName} TRIPLE! ${payout} CHIPS!`);
        totalPayout += payout;
        payoutType = `${symbolName} TRIPLE`;
      }
    }
    // Special rocket pair (🚀🚀X)
    else if (s1 === 5 && s2 === 5) {
      messages.push(`ROCKET SPECIAL! ${PAYOUT_ROCKET_PAIR} CHIPS!`);
      totalPayout += PAYOUT_ROCKET_PAIR;
      payoutType = 'ROCKET SPECIAL';
    }
    // Any pair
    else if (s1 === s2 || s2 === s3 || s1 === s3) {
      const pairPayout = 50;
      messages.push(`PAIR MATCH! ${pairPayout} CHIPS!`);
      totalPayout += pairPayout;
      payoutType = 'PAIR WIN';
    }
    
    console.log(`💰 Total payout: ${totalPayout}`);
    
    setLogMessages(messages);
    
    if (totalPayout > 0) {
      setDisplayMessage(`WIN! ${totalPayout} CHIPS!`);
    } else {
      setDisplayMessage('No win this time...');
    }
    
    // Notify parent of result
    onResult?.(reelResultsRef.current, totalPayout, payoutType);
    
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
            const randomTargets = [
              Math.floor(Math.random() * 6) + 1,
              Math.floor(Math.random() * 6) + 1,
              Math.floor(Math.random() * 6) + 1
            ];
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
    setAllReelTargets
  }));

  // Handle coin insert
  const handleCoin = async () => {
    console.log('💰 Coin inserted');
    // This would integrate with the parent's coin handling logic
  };

  return (
    <div className="slot-machine-container">
      {/* Main slot machine frame */}
      <div className="slot-frame">
        {/* Header */}
        <div className="slot-header">
          <span className="slot-title">🎰 BOOMER'S LAST HOPE 🎰</span>
          {/* Mode indicator */}
          <div className="text-xs text-center mt-1">
            {isControlledMode && <span className="text-purple-400">⚡ CONTROLLED MODE</span>}
            {isAnimatedMode && <span className="text-orange-400">🎬 ANIMATED DEMO</span>}
          </div>
        </div>

        {/* Independent Reels Container */}
        <div className="independent-reels-container">
          <div className="reels-frame">
            <IndividualReel
              ref={reel1Ref}
              reelIndex={0}
              onStateChange={handleReelStateChange}
              onResult={handleReelResult}
              disabled={leverDisabled}
              width={SYMBOL_SIZE}
              height={REEL_AREA_HEIGHT}
            />
            <IndividualReel
              ref={reel2Ref}
              reelIndex={1}
              onStateChange={handleReelStateChange}
              onResult={handleReelResult}
              disabled={leverDisabled}
              width={SYMBOL_SIZE}
              height={REEL_AREA_HEIGHT}
            />
            <IndividualReel
              ref={reel3Ref}
              reelIndex={2}
              onStateChange={handleReelStateChange}
              onResult={handleReelResult}
              disabled={leverDisabled}
              width={SYMBOL_SIZE}
              height={REEL_AREA_HEIGHT}
            />
          </div>
          
          {/* Payline overlay */}
          <div className="payline-overlay">
            <div className="payline"></div>
          </div>
        </div>

        {/* LCD display bar */}
        <div className="lcd-display-bar">
          <div className="display-screen">
            {isAnimatedMode ? "🎬 AUTO DEMO - Watch the magic happen!" : displayMessage}
          </div>
          
          {displayMessage && (
            <div className="game-message">
              {displayMessage}
            </div>
          )}
          
          {logMessages.length > 0 && (
            <div className="log-messages">
              {logMessages.map((msg, i) => (
                <div key={i} className="log-message">{msg}</div>
              ))}
            </div>
          )}
          
          {/* Status indicator showing machine readiness */}
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

        {/* Lever positioned on the right side of entire machine */}
        <div className="lever-container">
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