import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { animate, createScope } from 'animejs';

// Symbol definitions - Same as SlotMachine
const SYMBOLS = [
  { id: 1, emoji: '📉', name: 'DUMP', color: '#ef4444' },      // Red
  { id: 2, emoji: '🤡', name: 'COPE', color: '#eab308' },      // Yellow  
  { id: 3, emoji: '📈', name: 'PUMP', color: '#22c55e' },      // Green
  { id: 4, emoji: '💎', name: 'DIAMOND', color: '#3b82f6' },   // Blue
  { id: 5, emoji: '🚀', name: 'ROCKET', color: '#a855f7' },    // Purple
  { id: 6, emoji: '🐵', name: 'JACKPOT', color: '#facc15' }    // Gold
];

// Reel State Machine States
const REEL_STATE_IDLE = 'idle';
const REEL_STATE_SPINNING_UP = 'spinning_up';
const REEL_STATE_SPINNING = 'spinning';
const REEL_STATE_SPINNING_DOWN = 'spinning_down';
const REEL_STATE_STOPPING = 'stopping';
const REEL_STATE_PRECISION_ALIGNING = 'precision_aligning'; // New state for final precise alignment
const REEL_STATE_SETTLING = 'settling'; // New state for bounce/wiggle effect
const REEL_STATE_SHOWING_RESULT = 'showing_result';

// Config - precisely calibrated based on original
const REEL_POSITIONS = 32;
const SYMBOL_SIZE = 100;
const REEL_PIXEL_LENGTH = REEL_POSITIONS * SYMBOL_SIZE;
const ROW_COUNT = 3;

// Precise payline definition - the "red line" center point
const PAYLINE_CENTER_Y = (ROW_COUNT * SYMBOL_SIZE) / 2; // Center of middle row
const SYMBOL_CENTER_OFFSET = SYMBOL_SIZE / 2; // Distance from symbol top to center

// Critical parameters for realistic animation
const STOPPING_DISTANCE = 528 * (SYMBOL_SIZE / 32);
const MAX_REEL_SPEED = SYMBOL_SIZE;
const SPINUP_ACCELERATION = 2 * (SYMBOL_SIZE / 32);
const SPINDOWN_ACCELERATION = 1 * (SYMBOL_SIZE / 32);

// Precision targeting parameters
const PRECISION_LOCK_DISTANCE = SYMBOL_SIZE * 1.5; // 1.5 emoji heights - more forgiving 
const MIN_SPEED_FOR_PRECISION = 25; // Higher threshold - more reels can qualify

// Physics speed control constants
const MIN_DECELERATION_SPEED = 8; // Minimum realistic speed during deceleration (px/frame)
const MIN_SPEED_FAR_TARGET = 12; // Reasonable speed when target is distant (px/frame)
const MIN_SPEED_CLOSE_TARGET = 2; // Slow speed when target is close (px/frame)
const CAPTURE_ZONE = 60; // Pixels - when to trigger immediate capture for crossing detection
const SPINNING_DOWN_TIMEOUT = 20000; // Maximum time in spinning_down state (ms)

// Oscillation parameters to prevent moiré effect between reels
const OSCILLATION_AMPLITUDE = 0.15; // Maximum speed variation (±15% of base speed)
const OSCILLATION_FREQUENCY_BASE = 0.08; // Base frequency for oscillation

// Timing parameters for smooth transitions
const SPINUP_COMPLETE_DELAY = 100; // ms to wait before transitioning to spinning
const RESULT_DISPLAY_DURATION = 1000; // ms to show result before going idle

// Easing curve functions for smooth animations
const EasingCurves = {
  // Smooth acceleration (ease in cubic)
  easeInCubic: (t: number): number => t * t * t,
  
  // Smooth deceleration (ease out cubic) 
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  
  // Bounce effect for settling
  easeOutBounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
  
  // Smooth in-out for general use
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};

interface IndividualReelProps {
  reelIndex: number; // 0, 1, or 2
  onStateChange?: (reelIndex: number, state: string) => void;
  onResult?: (reelIndex: number, symbol: number) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

interface IndividualReelRef {
  // Core API
  startSpin: () => boolean;
  forceStop: (targetSymbol?: number) => boolean;
  setTargetSymbol: (symbol: number) => boolean;
  
  // State queries
  getState: () => string;
  isReady: () => boolean;
  isSpinning: () => boolean;
  getCurrentSymbol: () => number;
  
  // Utility
  reset: () => void;
}

const IndividualReel = forwardRef<IndividualReelRef, IndividualReelProps>(({
  reelIndex,
  onStateChange,
  onResult,
  disabled = false,
  width = 100,
  height = 300
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // State Machine State
  const currentStateRef = useRef<string>(REEL_STATE_IDLE);
  const targetSymbolRef = useRef<number | null>(null);
  
  // Animation state
  const reelPositionRef = useRef<number>(0);
  const reelSpeedRef = useRef<number>(0);
  const startSlowingRef = useRef<boolean>(false);
  const reelStripRef = useRef<number[]>([]);
  
  // Animation timing for easing curves
  const animationStartTimeRef = useRef<number>(0);
  const animationDurationRef = useRef<number>(0);
  const initialSpeedRef = useRef<number>(0);
  const finalPositionRef = useRef<number>(0);
  
  // Settling animation for bounce effect
  const settlingStartTimeRef = useRef<number>(0);
  const settlingDurationRef = useRef<number>(500); // ms for settling animation
  const settlingAmplitudeRef = useRef<number>(8); // pixels for bounce effect
  
  // Oscillation state to prevent moiré effect between reels
  const oscillationCounterRef = useRef<number>(0);
  const oscillationFrequencyRef = useRef<number>(OSCILLATION_FREQUENCY_BASE + (reelIndex * 0.023)); // Each reel has different frequency
  const oscillationPhaseRef = useRef<number>(reelIndex * 1.2); // Each reel starts at different phase
  
  // Transition timers
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Settling animation reference position
  const settlingReferencePositionRef = useRef<number>(0);
  
  // Anime.js scope for proper React integration and cleanup
  const animeScope = useRef<any>(null);
  const isAnimatingWithAnimeRef = useRef<boolean>(false);

  // Generate a random reel strip that ALWAYS contains all 6 symbols
  const generateRandomStrip = () => {
    const newStrip = [];
    
    // First, ensure we have at least one of each symbol (1-6)
    for (let symbolId = 1; symbolId <= 6; symbolId++) {
      newStrip.push(symbolId);
    }
    
    // Fill remaining positions with random symbols
    for (let i = 6; i < REEL_POSITIONS; i++) {
      newStrip.push(Math.floor(Math.random() * 6) + 1);
    }
    
    // Shuffle the strip for randomness while keeping all symbols present
    for (let i = newStrip.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newStrip[i], newStrip[j]] = [newStrip[j], newStrip[i]];
    }
    
    return newStrip;
  };

  // Initialize
  useEffect(() => {
    reelPositionRef.current = Math.floor(Math.random() * REEL_POSITIONS) * SYMBOL_SIZE;
    reelStripRef.current = generateRandomStrip();
  }, []);

  // State Machine Methods
  const transitionToState = (newState: string) => {
    const oldState = currentStateRef.current;
    currentStateRef.current = newState;
    
    console.log(`🎰 Reel ${reelIndex}: ${oldState} → ${newState}`);
    onStateChange?.(reelIndex, newState);
    
    // Handle state entry actions
    switch (newState) {
      case REEL_STATE_SPINNING_UP:
        handleSpinningUpEntry();
        break;
      case REEL_STATE_SPINNING:
        handleSpinningEntry();
        break;
      case REEL_STATE_SPINNING_DOWN:
        handleSpinningDownEntry();
        break;
      case REEL_STATE_STOPPING:
        handleStoppingEntry();
        break;
      case REEL_STATE_PRECISION_ALIGNING:
        handlePrecisionAligningEntry();
        break;
      case REEL_STATE_SETTLING:
        handleSettlingEntry();
        break;
      case REEL_STATE_SHOWING_RESULT:
        handleShowingResultEntry();
        break;
      case REEL_STATE_IDLE:
        handleIdleEntry();
        break;
    }
  };

  // State Entry Handlers
  const handleSpinningUpEntry = () => {
    // Start with zero speed and let physics acceleration build it up
    reelSpeedRef.current = 0;
    startSlowingRef.current = false;
    
    // Reset oscillation for consistent start
    oscillationCounterRef.current = 0;
  };

  const handleSpinningEntry = () => {
    // Already at max speed, just maintain it
    reelSpeedRef.current = MAX_REEL_SPEED;
  };

  const handleSpinningDownEntry = () => {
    if (targetSymbolRef.current !== null) {
      console.log(`🎯 Reel ${reelIndex}: Starting physics-based deceleration for target symbol ${targetSymbolRef.current}`);
      
      // Start deceleration from current speed (physics-based, not time-based)
      startSlowingRef.current = false;
      
      // Reset timeout timer for spinning_down phase
      animationStartTimeRef.current = Date.now();
    }
  };

  const handleStoppingEntry = () => {
    startSlowingRef.current = true;
    console.log(`🎯 Reel ${reelIndex}: Starting final physics-based deceleration from speed ${reelSpeedRef.current.toFixed(1)}`);
  };

  const handlePrecisionAligningEntry = () => {
    if (!targetSymbolRef.current) return;
    
    // Calculate the exact position needed to center the target symbol on the red line
    const targetPosition = calculateExactCenterPosition(targetSymbolRef.current);
    
    if (targetPosition !== null) {
      console.log(`🎯 Reel ${reelIndex}: Starting precision alignment to position ${targetPosition.toFixed(2)} for perfect centering`);
      
      // Initialize timing for final precision easing to exact center (slower)
      animationStartTimeRef.current = Date.now();
      animationDurationRef.current = 600; // ms for final precision alignment (increased from 400ms)
      initialSpeedRef.current = reelSpeedRef.current;
      finalPositionRef.current = targetPosition;
      
      // Start with current speed and ease to zero
      reelSpeedRef.current = Math.abs(initialSpeedRef.current);
    } else {
      // Fallback if calculation fails
      console.log(`🎯 Reel ${reelIndex}: Precision calculation failed, proceeding to settling`);
      transitionToState(REEL_STATE_SETTLING);
    }
  };

  const handleSettlingEntry = () => {
    // Initialize settling animation for bounce effect
    settlingStartTimeRef.current = Date.now();
    reelSpeedRef.current = 0;
    
    // Store current position for settling reference (no more teleporting)
    settlingReferencePositionRef.current = reelPositionRef.current;
    
    console.log(`🎯 Reel ${reelIndex}: Starting settling animation with bounce from position ${settlingReferencePositionRef.current}`);
    
    // Auto-transition to showing result after settling
    transitionTimerRef.current = setTimeout(() => {
      transitionToState(REEL_STATE_SHOWING_RESULT);
    }, settlingDurationRef.current);
  };

  const handleShowingResultEntry = () => {
    const finalSymbol = getCurrentSymbol();
    console.log(`🎯 Reel ${reelIndex}: Final result = ${finalSymbol}`);
    onResult?.(reelIndex, finalSymbol);
    
    // Auto-transition to idle after display duration
    transitionTimerRef.current = setTimeout(() => {
      transitionToState(REEL_STATE_IDLE);
    }, RESULT_DISPLAY_DURATION);
  };

  const handleIdleEntry = () => {
    // Reset state for next spin
    reelSpeedRef.current = 0;
    startSlowingRef.current = false;
    targetSymbolRef.current = null;
    
    // Clear any pending transitions
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

  // API Implementation
  const startSpin = (): boolean => {
    if (currentStateRef.current !== REEL_STATE_IDLE || disabled) {
      return false;
    }
    
    console.log(`🎮 Reel ${reelIndex}: Starting spin`);
    transitionToState(REEL_STATE_SPINNING_UP);
    return true;
  };

  const forceStop = (targetSymbol?: number): boolean => {
    if (!isSpinning() || disabled) {
      return false;
    }
    
    if (targetSymbol) {
      setTargetSymbol(targetSymbol);
    }
    
    // Force transition to spinning down regardless of current state
    if (currentStateRef.current === REEL_STATE_SPINNING_UP || 
        currentStateRef.current === REEL_STATE_SPINNING) {
      transitionToState(REEL_STATE_SPINNING_DOWN);
      return true;
    }
    
    return false;
  };

  const setTargetSymbol = (symbol: number): boolean => {
    if (symbol < 1 || symbol > 6) {
      return false;
    }
    
    targetSymbolRef.current = symbol;
    console.log(`🎯 Reel ${reelIndex}: Target symbol set to ${symbol}`);
    
    // Automatically transition to spinning_down if currently spinning
    if (currentStateRef.current === REEL_STATE_SPINNING) {
      console.log(`🎯 Reel ${reelIndex}: Auto-transitioning to spinning_down`);
      transitionToState(REEL_STATE_SPINNING_DOWN);
    }
    
    return true;
  };

  const getState = (): string => currentStateRef.current;
  
  const isReady = (): boolean => currentStateRef.current === REEL_STATE_IDLE && !disabled;
  
  const isSpinning = (): boolean => {
    return currentStateRef.current === REEL_STATE_SPINNING_UP ||
           currentStateRef.current === REEL_STATE_SPINNING ||
           currentStateRef.current === REEL_STATE_SPINNING_DOWN ||
           currentStateRef.current === REEL_STATE_STOPPING ||
           currentStateRef.current === REEL_STATE_PRECISION_ALIGNING ||
           currentStateRef.current === REEL_STATE_SETTLING;
  };

  const getCurrentSymbol = (): number => {
    // Calculate the current reel state (same as render function)  
    const currentReelIndex = Math.floor(reelPositionRef.current / SYMBOL_SIZE);
    const symbolOffset = reelPositionRef.current % SYMBOL_SIZE;
    
    let closestSymbol = 1;
    let closestDistance = Infinity;
    
    // Check all visible rows to find symbol closest to payline center
    for (let row = 0; row < ROW_COUNT + 1; row++) {
      let wrappedIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS; // Handle negative wrap
      
      const symbolAtThisRow = reelStripRef.current[wrappedIndex];
      
      // Calculate this symbol's distance from payline center
      const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
      const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
      const FIXED_PAYLINE_CENTER = 150; // Center of middle row on screen
      const distance = Math.abs(symbolScreenCenter - FIXED_PAYLINE_CENTER);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSymbol = symbolAtThisRow;
      }
    }
    
    return closestSymbol;
  };

  const reset = (): void => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    
    // Restore initial centered position and generate new strip like on first load
    reelPositionRef.current = Math.floor(Math.random() * REEL_POSITIONS) * SYMBOL_SIZE;
    reelStripRef.current = generateRandomStrip();
    
    transitionToState(REEL_STATE_IDLE);
  };

  // Get the precise distance from payline center to the closest instance of target symbol (in screen coordinates)
  const getClosestTargetSymbolDistance = (targetSymbol: number): number => {
    // Calculate the current reel state (same as render function)  
    const currentReelIndex = Math.floor(reelPositionRef.current / SYMBOL_SIZE);
    const symbolOffset = reelPositionRef.current % SYMBOL_SIZE;
    
    let closestDistance = 1000; // Large initial distance
    let foundTargetSymbol = false;
    
    // Check all visible rows for the target symbol
    for (let row = 0; row < ROW_COUNT + 1; row++) {
      let wrappedIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS; // Handle negative wrap
      
      const symbolAtThisRow = reelStripRef.current[wrappedIndex];
      
      // If this row contains our target symbol, calculate its distance from payline center
      if (symbolAtThisRow === targetSymbol) {
        foundTargetSymbol = true;
        const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
        const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
        
        // Distance from symbol center to fixed payline center (middle row center)
        const FIXED_PAYLINE_CENTER = 150; // Center of middle row on screen
        const distance = Math.abs(symbolScreenCenter - FIXED_PAYLINE_CENTER);
        
        if (distance < closestDistance) {
          closestDistance = distance;
        }
      }
    }
    
    // If target symbol not found in visible area, find the next upcoming target symbol
    if (!foundTargetSymbol) {
      // Look ahead in the strip to find when target symbol will appear
      for (let futureRow = ROW_COUNT + 1; futureRow < REEL_POSITIONS; futureRow++) {
        let wrappedIndex = (currentReelIndex + futureRow) % REEL_POSITIONS;
        if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
        
        const symbolAtThisRow = reelStripRef.current[wrappedIndex];
        
        if (symbolAtThisRow === targetSymbol) {
          // Calculate distance to when this symbol will reach the payline center
          // Each symbol is SYMBOL_SIZE pixels, so distance = rows * SYMBOL_SIZE - symbolOffset
          const distanceToPayline = (futureRow * SYMBOL_SIZE) - symbolOffset - SYMBOL_CENTER_OFFSET;
          
          // Return a large but realistic distance (not 1000 which prevents lock-on)
          closestDistance = Math.min(closestDistance, distanceToPayline);
          foundTargetSymbol = true;
          break; // Take the first upcoming target symbol
        }
      }
    }
    
    // Debug: if target symbol still not found, check if it exists in strip at all
    if (!foundTargetSymbol && Math.random() < 0.01) { // 1% chance to debug when not found
      const stripContainsTarget = reelStripRef.current.includes(targetSymbol);
      console.log(`🚨 Reel ${reelIndex}: Target ${targetSymbol} not found anywhere! Strip contains target: ${stripContainsTarget}, Strip: [${reelStripRef.current.slice(0, 8).join(',')}...]`);
    }
    
    return closestDistance;
  };

  // Check if we should start precision lock-on for the target symbol
  const shouldStartPrecisionLockOn = (targetSymbol: number): boolean => {
    if (!targetSymbolRef.current) {
      return false;
    }
    
    // Get the distance of the closest target symbol to the red line
    const closestDistance = getClosestTargetSymbolDistance(targetSymbol);
    
    // Start precision when target is close enough - simple distance check
    return closestDistance <= PRECISION_LOCK_DISTANCE;
  };

  // Check if target symbol is perfectly centered on the red line
  const isSymbolPerfectlyCentered = (targetSymbol: number): boolean => {
    if (!targetSymbolRef.current) return false;
    
    // Get the distance of the closest target symbol to the red line
    const closestDistance = getClosestTargetSymbolDistance(targetSymbol);
    
    // Consider "perfectly centered" if within 60 pixels of center (much more forgiving, less aggressive)
    return closestDistance <= 60.0;
  };

  // Draw a symbol at the given position
  const drawSymbol = (symbolIndex: number, x: number, y: number) => {
    if (!ctxRef.current) return;
    
    const ctx = ctxRef.current;
    const symbol = SYMBOLS[symbolIndex - 1];
    
    // Draw background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(x, y, SYMBOL_SIZE, SYMBOL_SIZE);
    
    // Draw border
    ctx.strokeStyle = '#0055aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, SYMBOL_SIZE, SYMBOL_SIZE);
    
    // Draw emoji
    ctx.font = `${SYMBOL_SIZE * 0.6}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = symbol.color;
    
    const centerX = x + SYMBOL_SIZE / 2;
    const centerY = y + SYMBOL_SIZE / 2;
    
    ctx.fillText(symbol.emoji, centerX, centerY);
  };

  // Move reel
  const moveReel = () => {
    reelPositionRef.current -= reelSpeedRef.current;
    
    if (reelPositionRef.current < 0) {
      reelPositionRef.current += REEL_PIXEL_LENGTH;
    }
  };

  // Calculate oscillation offset to prevent moiré effect
  const getOscillationOffset = (): number => {
    const time = oscillationCounterRef.current * oscillationFrequencyRef.current + oscillationPhaseRef.current;
    return Math.sin(time) * OSCILLATION_AMPLITUDE * MAX_REEL_SPEED;
  };

  // State Machine Logic
  const processStateMachine = () => {
    // Update oscillation counter for smooth animation
    oscillationCounterRef.current += 1;
    
    switch (currentStateRef.current) {
      case REEL_STATE_SPINNING_UP:
        processSpinningUp();
        break;
      case REEL_STATE_SPINNING:
        processSpinning();
        break;
      case REEL_STATE_SPINNING_DOWN:
        processSpinningDown();
        break;
      case REEL_STATE_STOPPING:
        processStopping();
        break;
      case REEL_STATE_PRECISION_ALIGNING:
        processPrecisionAligning();
        break;
      case REEL_STATE_SETTLING:
        processSettling();
        break;
    }
  };

  const processSpinningUp = () => {
    // Real physics-based acceleration - increase speed gradually
    reelSpeedRef.current += SPINUP_ACCELERATION;
    
    // Cap at maximum speed
    if (reelSpeedRef.current >= MAX_REEL_SPEED) {
      reelSpeedRef.current = MAX_REEL_SPEED;
      
      // Small delay before transitioning to spinning for smoothness
      transitionTimerRef.current = setTimeout(() => {
        transitionToState(REEL_STATE_SPINNING);
      }, SPINUP_COMPLETE_DELAY);
    }
    
    moveReel();
  };

  const processSpinning = () => {
    // Apply base speed + oscillation to prevent moiré effect
    const oscillationOffset = getOscillationOffset();
    const currentSpeed = MAX_REEL_SPEED + oscillationOffset;
    
    // Temporarily set speed with oscillation for this frame
    reelSpeedRef.current = currentSpeed;
    moveReel();
    
    // Restore base speed for consistency
    reelSpeedRef.current = MAX_REEL_SPEED;
  };

  const processSpinningDown = () => {
    // NORMAL DECELERATION until target center crosses red line
    reelSpeedRef.current -= SPINDOWN_ACCELERATION;
    
    // Allow natural slowdown with minimal floor
    const MINIMAL_SEARCH_SPEED = 5; // Keep moving to find target
    if (reelSpeedRef.current < MINIMAL_SEARCH_SPEED) {
      reelSpeedRef.current = MINIMAL_SEARCH_SPEED;
    }
    
    moveReel();
    
    // MODERN SLOT MACHINE: Detect when target symbol CENTER crosses red line
    if (!startSlowingRef.current && targetSymbolRef.current) {
      const currentSpeed = reelSpeedRef.current;
      const crossingDetection = checkTargetSymbolCrossing(targetSymbolRef.current);
      
      // Enhanced debug logging
      if (Math.random() < 0.05) { // 5% chance
        console.log(`🔍 Reel ${reelIndex}: NORMAL_DECEL - Speed: ${currentSpeed.toFixed(1)}, Center Crossed: ${crossingDetection.isCrossing}, Distance: ${crossingDetection.distance.toFixed(1)}px`);
      }
      
      // SNAP-BACK CAPTURE when target symbol center crosses the red line
      if (crossingDetection.isCrossing) {
        console.log(`🎯 Reel ${reelIndex}: CENTER CROSSED RED LINE! Snap-back capture at speed ${currentSpeed.toFixed(1)} - symbol center: ${crossingDetection.symbolCenter.toFixed(1)}px`);
        transitionToState(REEL_STATE_STOPPING);
        return;
      }
    }
    
    // TIMEOUT MECHANISM
    if (!animationStartTimeRef.current) {
      animationStartTimeRef.current = Date.now();
    }
    
    const timeInSpinningDown = Date.now() - animationStartTimeRef.current;
    if (timeInSpinningDown > SPINNING_DOWN_TIMEOUT) {
      console.log(`🚨 Reel ${reelIndex}: TIMEOUT in spinning_down (${timeInSpinningDown}ms) - emergency transition`);
      transitionToState(REEL_STATE_STOPPING);
      return;
    }
  };
  
  // MODERN SLOT MACHINE: Real-time symbol CENTER crossing detection
  const checkTargetSymbolCrossing = (targetSymbol: number): { isCrossing: boolean, distance: number, symbolCenter: number } => {
    const currentReelIndex = Math.floor(reelPositionRef.current / SYMBOL_SIZE);
    const symbolOffset = reelPositionRef.current % SYMBOL_SIZE;
    const FIXED_PAYLINE_CENTER = 150; // Red line center
    
    // Check all visible rows for target symbol
    for (let row = 0; row < ROW_COUNT + 1; row++) {
      let wrappedIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
      
      const symbolAtThisRow = reelStripRef.current[wrappedIndex];
      
      if (symbolAtThisRow === targetSymbol) {
        const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
        const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
        const distance = Math.abs(symbolScreenCenter - FIXED_PAYLINE_CENTER);
        
        // MODERN CAPTURE: Detect when symbol CENTER has crossed or is crossing the red line
        const symbolCenterY = symbolScreenCenter;
        const redLineY = FIXED_PAYLINE_CENTER;
        
        // Check if symbol center has crossed the red line (is below it)
        const hasCrossedRedLine = symbolCenterY >= redLineY;
        
        // Trigger capture when center crosses (not just gets close)
        if (hasCrossedRedLine && distance <= 50) { // Give some tolerance for detection
          return { isCrossing: true, distance, symbolCenter: symbolCenterY };
        }
      }
    }
    
    return { isCrossing: false, distance: 1000, symbolCenter: 0 };
  };

  const processStopping = () => {
    // MODERN SLOT MACHINE: Smooth snap-back with Anime.js (no more jitter!)
    const targetSymbol = targetSymbolRef.current;
    
    if (!targetSymbol) {
      console.log(`🚨 Reel ${reelIndex}: No target symbol in stopping state`);
      transitionToState(REEL_STATE_PRECISION_ALIGNING);
      return;
    }
    
    // Initialize smooth snap-back animation with Anime.js
    if (!isAnimatingWithAnimeRef.current) {
      isAnimatingWithAnimeRef.current = true;
      
      // Calculate target position for perfect alignment
      const targetPosition = calculateExactCenterPosition(targetSymbol);
      
      if (targetPosition === null) {
        console.log(`🚨 Reel ${reelIndex}: Cannot calculate target position`);
        transitionToState(REEL_STATE_PRECISION_ALIGNING);
        return;
      }
      
      // Use the scoped animation method (proper Anime.js React pattern)
      if (animeScope.current?.methods?.snapBackToTarget) {
        animeScope.current.methods.snapBackToTarget(targetPosition);
      } else {
        // Fallback if scope not ready
        console.log(`🚨 Reel ${reelIndex}: Anime scope not ready, using fallback`);
        transitionToState(REEL_STATE_PRECISION_ALIGNING);
      }
    }
    
    // During animation, just let Anime.js handle everything smoothly
    // No more manual speed/position manipulation = no more jitter!
  };

  const processSettling = () => {
    const currentTime = Date.now();
    const elapsed = currentTime - settlingStartTimeRef.current;
    const progress = Math.min(elapsed / settlingDurationRef.current, 1);
    
    // Use easeOutBounce for settling wiggle effect
    const bounceProgress = EasingCurves.easeOutBounce(progress);
    const bounceOffset = settlingAmplitudeRef.current * (1 - bounceProgress);
    
    // Apply subtle bounce to position relative to stopping point
    reelPositionRef.current = settlingReferencePositionRef.current + bounceOffset;
    
    // Don't call moveReel() since we're manually setting position
  };

  const processPrecisionAligning = () => {
    const currentTime = Date.now();
    const elapsed = currentTime - animationStartTimeRef.current;
    const progress = Math.min(elapsed / animationDurationRef.current, 1);
    
    // Use smooth easing for final precision alignment
    const easedProgress = EasingCurves.easeInOutQuad(progress);
    
    // Calculate target position and move towards it
    const currentPosition = reelPositionRef.current;
    const targetPosition = finalPositionRef.current;
    const newPosition = currentPosition + (targetPosition - currentPosition) * easedProgress;
    
    // Set the new position directly (no moveReel since we're doing precise positioning)
    reelPositionRef.current = newPosition;
    
    // Calculate remaining distance for logging
    const remainingDistance = Math.abs(targetPosition - newPosition);
    
    if (Math.random() < 0.1) { // 10% chance to log
      console.log(`🎯 Reel ${reelIndex}: Precision aligning - remaining distance: ${remainingDistance.toFixed(2)}px`);
    }
    
    // Transition to settling when alignment is complete
    if (progress >= 1 || remainingDistance <= 0.5) {
      reelPositionRef.current = targetPosition; // Ensure exact final position
      console.log(`🎯 Reel ${reelIndex}: Precision alignment complete - symbol perfectly centered!`);
      reelSpeedRef.current = 0;
      transitionToState(REEL_STATE_SETTLING);
    }
  };

  // Calculate the exact reel position needed to center the target symbol on the red line
  const calculateExactCenterPosition = (targetSymbol: number): number | null => {
    const currentReelIndex = Math.floor(reelPositionRef.current / SYMBOL_SIZE);
    const symbolOffset = reelPositionRef.current % SYMBOL_SIZE;
    
    // Find the target symbol that's currently closest to being centered
    let targetSymbolStripIndex = -1;
    let closestDistance = Infinity;
    
    // Check which visible target symbol is closest to the red line
    for (let row = 0; row < ROW_COUNT + 1; row++) {
      let stripIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (stripIndex < 0) stripIndex += REEL_POSITIONS;
      
      const symbolAtThisRow = reelStripRef.current[stripIndex];
      
      if (symbolAtThisRow === targetSymbol) {
        const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
        const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
        const FIXED_PAYLINE_CENTER = 150;
        const distance = Math.abs(symbolScreenCenter - FIXED_PAYLINE_CENTER);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          targetSymbolStripIndex = stripIndex;
        }
      }
    }
    
    if (targetSymbolStripIndex === -1) return null;
    
    console.log(`🎯 Reel ${reelIndex}: Found target symbol ${targetSymbol} at strip index ${targetSymbolStripIndex}`);
    
    // The center row displays symbol at index (currentReelIndex + 1) % REEL_POSITIONS
    // So we need: (targetReelPosition / SYMBOL_SIZE + 1) % REEL_POSITIONS = targetSymbolStripIndex
    // Therefore: targetReelPosition / SYMBOL_SIZE = (targetSymbolStripIndex - 1 + REEL_POSITIONS) % REEL_POSITIONS
    
    const targetCurrentReelIndex = (targetSymbolStripIndex - 1 + REEL_POSITIONS) % REEL_POSITIONS;
    const targetReelPosition = targetCurrentReelIndex * SYMBOL_SIZE;
    
    console.log(`�� Reel ${reelIndex}: Calculated target position ${targetReelPosition} to center symbol ${targetSymbol} at strip index ${targetSymbolStripIndex}`);
    
    return targetReelPosition;
  };

  // Initialize canvas and start animation loop
  useEffect(() => {
    if (!canvasRef.current) return;
    
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctxRef.current = canvasRef.current.getContext('2d');
    
    const animate = () => {
      processStateMachine();
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      // Anime.js scope cleanup is handled in its own useEffect
    };
  }, [width, height]);

  // Render the reel
  const render = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    
    const ctx = ctxRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#0a1526';
    ctx.fillRect(0, 0, width, height);
    
    // Set clipping area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    
    // Calculate which symbol should be at the top
    const currentReelIndex = Math.floor(reelPositionRef.current / SYMBOL_SIZE);
    const symbolOffset = reelPositionRef.current % SYMBOL_SIZE;
    
    // Draw ROW_COUNT + 1 symbols vertically for smooth scrolling
    for (let j = 0; j < ROW_COUNT + 1; j++) {
      let wrappedIndex = (currentReelIndex + j) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
      
      const symbolIndex = reelStripRef.current[wrappedIndex];
      
      // Calculate y position with offset for smooth animation
      const y = j * SYMBOL_SIZE - symbolOffset;
      
      // Draw the symbol
      drawSymbol(symbolIndex, 0, y);
    }
    
    ctx.restore();
  };

  // Initialize Anime.js scope for proper React integration
  useEffect(() => {
    animeScope.current = createScope({ root: canvasRef }).add(self => {
      // Anime.js animations will be scoped to this component
      
      // Register snap-back animation method
      self.add('snapBackToTarget', (targetPosition: number) => {
        console.log(`🎯 Reel ${reelIndex}: Starting smooth snap-back animation to position ${targetPosition.toFixed(1)}`);
        
        // Create animation object for position interpolation
        const animationObject = { position: reelPositionRef.current };
        
        animate(animationObject, {
          position: targetPosition,
          duration: 300, // 300ms for smooth snap-back
          ease: 'outBack(1.7)', // Professional back easing for slot machine feel
          onUpdate: () => {
            // Smoothly update reel position
            reelPositionRef.current = animationObject.position;
            reelSpeedRef.current = 0; // Set speed to 0 during animation
          },
          onComplete: () => {
            // Animation complete - ensure exact final position
            reelPositionRef.current = targetPosition;
            reelSpeedRef.current = 0;
            isAnimatingWithAnimeRef.current = false;
            
            console.log(`🎯 Reel ${reelIndex}: Smooth snap-back complete! Perfect alignment achieved.`);
            transitionToState(REEL_STATE_PRECISION_ALIGNING);
          }
        });
      });
    });
    
    // Proper cleanup when component unmounts
    return () => {
      if (animeScope.current) {
        animeScope.current.revert();
      }
    };
  }, [reelIndex]);

  // Expose API to parent
  useImperativeHandle(ref, () => ({
    startSpin,
    forceStop,
    setTargetSymbol,
    getState,
    isReady,
    isSpinning,
    getCurrentSymbol,
    reset
  }));

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        imageRendering: 'crisp-edges' as any
      }}
    />
  );
});

IndividualReel.displayName = 'IndividualReel';

export default IndividualReel; 