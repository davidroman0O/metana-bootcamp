import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { animate, createTimeline, createScope } from 'animejs';

// Symbol definitions - Same as SlotMachine
const SYMBOLS = [
  { id: 1, emoji: '📉', name: 'DUMP', color: '#ef4444' },      // Red
  { id: 2, emoji: '🤡', name: 'COPE', color: '#eab308' },      // Yellow  
  { id: 3, emoji: '📈', name: 'PUMP', color: '#22c55e' },      // Green
  { id: 4, emoji: '💎', name: 'DIAMOND', color: '#3b82f6' },   // Blue
  { id: 5, emoji: '🚀', name: 'ROCKET', color: '#a855f7' },    // Purple
  { id: 6, emoji: '🐵', name: 'JACKPOT', color: '#facc15' }    // Gold
];

// Reel State Machine States (now managed by Anime.js timelines)
const REEL_STATE_IDLE = 'idle';
const REEL_STATE_SPINNING_UP = 'spinning_up';
const REEL_STATE_SPINNING = 'spinning';
const REEL_STATE_SPINNING_DOWN = 'spinning_down';
const REEL_STATE_STOPPING = 'stopping';
const REEL_STATE_SETTLING = 'settling';
const REEL_STATE_SHOWING_RESULT = 'showing_result';

// Config - precisely calibrated 
const REEL_POSITIONS = 32;
const SYMBOL_SIZE = 100;
const REEL_PIXEL_LENGTH = REEL_POSITIONS * SYMBOL_SIZE;
const ROW_COUNT = 3;

// Precise payline definition - the "red line" center point
const PAYLINE_CENTER_Y = (ROW_COUNT * SYMBOL_SIZE) / 2; // Center of middle row
const SYMBOL_CENTER_OFFSET = SYMBOL_SIZE / 2; // Distance from symbol top to center

// Animation timing constants
const SPINUP_DURATION = 800; // ms to reach max speed
const MAX_SPINNING_SPEED = 28*2; // pixels per frame (60fps) 
const SPINDOWN_BASE_DURATION = 2000; // ms base deceleration time
const STOPPING_DURATION = 300; // ms for snap-back
const SETTLING_DURATION = 500*2; // ms for bounce effect
const RESULT_DISPLAY_DURATION = 1000; // ms to show result

// Oscillation parameters to prevent moiré effect between reels
const OSCILLATION_AMPLITUDE = 15; // pixels
const OSCILLATION_FREQUENCY = 60; // frames per cycle

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
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const animeScope = useRef<any>(null);
  
  // Animation state 
  const reelAnimation = useRef({ 
    position: 0, 
    speed: 0,
    oscillation: 0 
  });
  
  // State management
  const currentStateRef = useRef<string>(REEL_STATE_IDLE);
  const targetSymbolRef = useRef<number | null>(null);
  const reelStripRef = useRef<number[]>([]);
  
  // Cache target position to prevent oscillation
  const lockedTargetPositionRef = useRef<number | null>(null);
  
  // Master lock flag to bypass other position calculations when target is captured
  const masterLockEngagedRef = useRef<boolean>(false);
  const lockedTargetSymbolRef = useRef<number | null>(null);

  // Animation references 
  const currentAnimationRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const isSpinningContinuouslyRef = useRef<boolean>(false);
  const targetDetectedRef = useRef<boolean>(false); // Prevent multiple detections
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track result display timeout
  const operationLockRef = useRef<boolean>(false); // Operation lock

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

  // Single point target detection with tolerance to prevent oscillation
  const checkTargetSymbolCrossing = (targetSymbol: number): boolean => {
    const currentReelIndex = Math.floor(reelAnimation.current.position / SYMBOL_SIZE);
    const symbolOffset = reelAnimation.current.position % SYMBOL_SIZE;
    const FIXED_PAYLINE_CENTER = 150;
    
    // Single detection point with larger tolerance to prevent oscillation
    const DETECTION_TOLERANCE = 20; // More forgiving than before
    
    // Check visible rows for target symbol
    for (let row = 0; row < ROW_COUNT + 2; row++) {
      let wrappedIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
      
      if (reelStripRef.current[wrappedIndex] === targetSymbol) {
        const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
        const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
        
        // Single forgiving check - symbol center within tolerance of payline
        const distanceFromPayline = Math.abs(symbolScreenCenter - FIXED_PAYLINE_CENTER);
        if (distanceFromPayline <= DETECTION_TOLERANCE) {
          console.log(`🎯 Reel ${reelIndex}: Target ${targetSymbol} detected (distance: ${distanceFromPayline.toFixed(1)}px)`);
          return true;
        }
      }
    }
    
    return false;
  };

  // Deterministic position calculation - always pick the first upcoming target symbol
  const calculateTargetPosition = (targetSymbol: number): number | null => {
    const currentReelIndex = Math.floor(reelAnimation.current.position / SYMBOL_SIZE);
    const symbolOffset = reelAnimation.current.position % SYMBOL_SIZE;
    const FIXED_PAYLINE_CENTER = 150;
    
    console.log(`🔍 Reel ${reelIndex}: Starting position calculation for symbol ${targetSymbol}`);
    console.log(`📍 Current reel index: ${currentReelIndex}, offset: ${symbolOffset.toFixed(1)}`);
    
    // Always pick the first upcoming instance of target symbol
    // Look ahead in the strip direction to find the next occurrence
    for (let lookAhead = 0; lookAhead < REEL_POSITIONS; lookAhead++) {
      let stripIndex = (currentReelIndex + lookAhead) % REEL_POSITIONS;
      if (stripIndex < 0) stripIndex += REEL_POSITIONS;
      
      const symbolAtThisPosition = reelStripRef.current[stripIndex];
      
      if (symbolAtThisPosition === targetSymbol) {
        console.log(`✅ Found target symbol ${targetSymbol} at strip index ${stripIndex} (lookAhead: ${lookAhead})`);
        
        // Calculate the exact position to center this specific symbol instance
        // We want this symbol to appear in the middle row (row 1, 0-indexed)
        // Row 0 (top): currentReelIndex + 0
        // Row 1 (middle): currentReelIndex + 1  ← TARGET ROW
        // Row 2 (bottom): currentReelIndex + 2
        // So we need: currentReelIndex + 1 = stripIndex
        // Therefore: currentReelIndex = stripIndex - 1
        const targetReelPosition = ((stripIndex - 1 + REEL_POSITIONS) % REEL_POSITIONS) * SYMBOL_SIZE;
        
        console.log(`🎯 Target position: ${targetReelPosition} for symbol at strip index ${stripIndex}`);
        
        // Verify this makes sense
        const verificationReelIndex = Math.floor(targetReelPosition / SYMBOL_SIZE);
        const verificationMiddleRowIndex = (verificationReelIndex + 1) % REEL_POSITIONS;
        const verificationSymbol = reelStripRef.current[verificationMiddleRowIndex];
        console.log(`✓ Verification: At position ${targetReelPosition}, middle row (index ${verificationMiddleRowIndex}) will show symbol ${verificationSymbol} (expected: ${targetSymbol})`);
        
        return targetReelPosition;
      }
    }
    
    console.log(`❌ No target symbol ${targetSymbol} found in entire strip!`);
    return null;
  };

  // Get current symbol closest to payline center
  const getCurrentSymbol = (): number => {
    // If master lock is engaged, return the locked symbol directly
    if (masterLockEngagedRef.current && lockedTargetSymbolRef.current !== null) {
      console.log(`🔒 Returning locked symbol ${lockedTargetSymbolRef.current} instead of calculating`);
      return lockedTargetSymbolRef.current;
    }
    
    const currentReelIndex = Math.floor(reelAnimation.current.position / SYMBOL_SIZE);
    const symbolOffset = reelAnimation.current.position % SYMBOL_SIZE;
    
    let closestSymbol = 1;
    let closestDistance = Infinity;
    
    // Check all visible rows to find symbol closest to payline center
    for (let row = 0; row < ROW_COUNT + 1; row++) {
      let wrappedIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
      
      const symbolAtThisRow = reelStripRef.current[wrappedIndex];
      
      // Calculate this symbol's distance from payline center
      const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
      const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
      const FIXED_PAYLINE_CENTER = 150;
      const distance = Math.abs(symbolScreenCenter - FIXED_PAYLINE_CENTER);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSymbol = symbolAtThisRow;
      }
    }
    
    return closestSymbol;
  };

  // State transition helper
  const transitionToState = (newState: string) => {
    const oldState = currentStateRef.current;
    currentStateRef.current = newState;
    
    console.log(`🎰 Reel ${reelIndex}: ${oldState} → ${newState}`);
    onStateChange?.(reelIndex, newState);
  };

  // Stop all running animations
  const stopAllAnimations = () => {
    // Stop continuous spinning
    isSpinningContinuouslyRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    // Stop anime animation
    if (currentAnimationRef.current) {
      currentAnimationRef.current.pause();
      currentAnimationRef.current = null;
    }
  };

  // Internal state reset - preserves reel strip and position
  const cleanReset = () => {
    stopAllAnimations();
    
    // Reset animation properties but keep current position
    reelAnimation.current.speed = 0;
    reelAnimation.current.oscillation = 0;
    // Don't randomize position - keep the captured result visible
    
    // Reset target and detection flag
    targetSymbolRef.current = null;
    targetDetectedRef.current = false;
    
    // Clear all locks for next spin
    lockedTargetPositionRef.current = null;
    masterLockEngagedRef.current = false;
    lockedTargetSymbolRef.current = null;
    
    // Clear any blur effects
    if (canvasRef.current) {
      canvasRef.current.style.filter = 'none';
    }
    
    // Don't regenerate reel strip - keep existing symbols
    
    // Always end in idle
    transitionToState(REEL_STATE_IDLE);
    render();
  };

  // External reset API - generates new symbols
  const reset = (): void => {
    console.log(`🔄 Reel ${reelIndex}: Full reset with new symbols`);
    stopAllAnimations();
    
    // Reset all animation state
    reelAnimation.current.position = Math.floor(Math.random() * REEL_POSITIONS) * SYMBOL_SIZE;
    reelAnimation.current.speed = 0;
    reelAnimation.current.oscillation = 0;
    
    // Reset target and detection flag
    targetSymbolRef.current = null;
    targetDetectedRef.current = false;
    
    // Clear all locks for fresh start
    lockedTargetPositionRef.current = null;
    masterLockEngagedRef.current = false;
    lockedTargetSymbolRef.current = null;
    
    // Clear any blur effects
    if (canvasRef.current) {
      canvasRef.current.style.filter = 'none';
    }
    
    // Generate fresh reel strip for manual reset
    reelStripRef.current = generateRandomStrip();
    
    // Always end in idle
    transitionToState(REEL_STATE_IDLE);
    render();
  };

  // Draw a symbol at the given position (clean, no blur)
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

  // Render the reel 
  const render = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#0a1526';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate dynamic vertical motion blur based on current speed and state
    const currentSpeed = reelAnimation.current.speed;
    const currentState = currentStateRef.current;
    
    let blurIntensity = 0;
    
    // Map speed to vertical motion blur intensity
    if (currentState === REEL_STATE_SPINNING_UP) {
      // Blur increases as reel accelerates (0 to MAX_SPINNING_SPEED)
      blurIntensity = Math.min((currentSpeed / MAX_SPINNING_SPEED) * 2, 6);
    } else if (currentState === REEL_STATE_SPINNING) {
      // Maximum blur during constant high-speed spinning
      blurIntensity = 6;
    } else if (currentState === REEL_STATE_SPINNING_DOWN) {
      // Blur decreases as reel decelerates
      blurIntensity = Math.max((currentSpeed / MAX_SPINNING_SPEED) * 2, 0);
    } else {
      // No blur when idle, stopping, settling, or showing result
      blurIntensity = 0;
    }
    
    // Apply vertical-only motion blur using canvas filter (much cleaner!)
    if (blurIntensity > 0.1) {
      ctx.filter = `blur(0px ${blurIntensity.toFixed(1)}px)`; // Only vertical blur
    } else {
      ctx.filter = 'none';
    }
    
    // Set clipping area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    
    // Calculate which symbol should be at the top
    const currentPosition = reelAnimation.current.position + reelAnimation.current.oscillation;
    const currentReelIndex = Math.floor(currentPosition / SYMBOL_SIZE);
    const symbolOffset = currentPosition % SYMBOL_SIZE;
    
    // Draw ROW_COUNT + 1 symbols vertically for smooth scrolling
    for (let j = 0; j < ROW_COUNT + 1; j++) {
      let wrappedIndex = (currentReelIndex + j) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
      
      const symbolIndex = reelStripRef.current[wrappedIndex];
      
      // Calculate y position with offset for smooth animation
      const y = j * SYMBOL_SIZE - symbolOffset;
      
      // Draw the symbol (with canvas filter blur applied)
      drawSymbol(symbolIndex, 0, y);
    }
    
    // Reset filter for future draws
    ctx.filter = 'none';
    ctx.restore();
  };

  // Continuous spinning loop using requestAnimationFrame (smooth, no stutter)
  const continuousSpinLoop = () => {
    if (!isSpinningContinuouslyRef.current) return;
    
    // Update position smoothly - direct pixels per frame (no math conversion needed)
    reelAnimation.current.position -= MAX_SPINNING_SPEED;
    if (reelAnimation.current.position < 0) {
      reelAnimation.current.position += REEL_PIXEL_LENGTH;
    }
    
    // NO oscillation during spinning
    reelAnimation.current.oscillation = 0;
    
    // Render
    render();
    
    // Continue loop
    animationFrameRef.current = requestAnimationFrame(continuousSpinLoop);
  };

  // Initialize Anime.js scope and timelines
  useEffect(() => {
    animeScope.current = createScope({ root: canvasRef }).add(self => {
      
      // Spin up phase - accelerate to max speed
      self.add('spinUp', () => {
        transitionToState(REEL_STATE_SPINNING_UP);
        
        currentAnimationRef.current = animate(reelAnimation.current, {
          speed: MAX_SPINNING_SPEED,
          duration: SPINUP_DURATION,
          ease: 'outExpo', // Fast acceleration, then smooth to max speed
          onUpdate: () => {
            reelAnimation.current.position -= reelAnimation.current.speed; // Direct pixels per frame
            if (reelAnimation.current.position < 0) {
              reelAnimation.current.position += REEL_PIXEL_LENGTH;
            }
            render(); // Render on each update
          },
          onComplete: () => {
            console.log(`🎰 Reel ${reelIndex}: Spin up complete, transitioning to spinning`);
            self.methods.startSpinning();
          }
        });
      });
      
      // Spinning phase - maintain constant speed with oscillation
      self.add('startSpinning', () => {
        transitionToState(REEL_STATE_SPINNING);
        
        console.log(`🎡 Reel ${reelIndex}: Starting smooth continuous spinning`);
        
        // Start smooth continuous spinning with requestAnimationFrame
        isSpinningContinuouslyRef.current = true;
        continuousSpinLoop();
      });
      
      // Spin down phase - deceleration with target detection
      self.add('spinDown', () => {
        stopAllAnimations();
        transitionToState(REEL_STATE_SPINNING_DOWN);
        
        console.log(`🎯 Reel ${reelIndex}: Clean deceleration starting`);
        
        // Create isolated animation state to avoid interference
        const animationState = { 
          speed: MAX_SPINNING_SPEED,
          position: reelAnimation.current.position 
        };
        
        currentAnimationRef.current = animate(animationState, {
          speed: 0.5,
          duration: 6000,
          ease: 'outQuint',
          onUpdate: () => {
            // Only update position if master lock is not engaged
            if (!masterLockEngagedRef.current) {
              // Update position
              animationState.position -= animationState.speed;
              if (animationState.position < 0) {
                animationState.position += REEL_PIXEL_LENGTH;
              }
              
              reelAnimation.current.position = animationState.position;
              reelAnimation.current.speed = animationState.speed;
              reelAnimation.current.oscillation = 0;
              
              render();
              
              // Check for target detection - only once, then lock permanently
              if (targetSymbolRef.current && 
                  !targetDetectedRef.current &&
                  checkTargetSymbolCrossing(targetSymbolRef.current)) {
                console.log(`🔒 Target ${targetSymbolRef.current} detected - engaging lock`);
                
                // Engage master lock to prevent further interference
                targetDetectedRef.current = true;
                masterLockEngagedRef.current = true;
                lockedTargetSymbolRef.current = targetSymbolRef.current;
                
                // Stop this animation immediately to prevent further updates
                if (currentAnimationRef.current) {
                  currentAnimationRef.current.pause();
                  currentAnimationRef.current = null;
                }
                
                // Force immediate capture
                self.methods.capture();
              }
            }
          },
          onComplete: () => {
            if (!targetDetectedRef.current && !masterLockEngagedRef.current) {
              console.log(`⚠️ Reel ${reelIndex}: Deceleration timeout without detection`);
              self.methods.capture();
            }
          }
        });
      });
      
      // Capture phase - atomic positioning with no interference
      self.add('capture', () => {
        console.log(`🎯 Reel ${reelIndex}: Capture for target ${targetSymbolRef.current}`);
        
        // Prevent duplicate calls
        if (currentStateRef.current === REEL_STATE_STOPPING) {
          console.log(`🚫 Reel ${reelIndex}: Capture already in progress - ignoring`);
          return;
        }
        
        stopAllAnimations();
        transitionToState(REEL_STATE_STOPPING);
        
        let targetPosition: number | null = null;
        
        // Use cached position if available, never recalculate
        if (lockedTargetPositionRef.current !== null) {
          targetPosition = lockedTargetPositionRef.current;
          console.log(`🔒 Using locked target position: ${targetPosition.toFixed(1)}`);
        } else {
          targetPosition = calculateTargetPosition(targetSymbolRef.current!);
          if (targetPosition !== null) {
            lockedTargetPositionRef.current = targetPosition; // Lock it permanently
            console.log(`🔒 Locking target position: ${targetPosition.toFixed(1)}`);
          }
        }
        
        if (targetPosition === null) {
          console.log(`⚠️ Reel ${reelIndex}: No target position - showing current`);
          self.methods.showResult();
          return;
        }
        
        // Engage master lock if not already engaged
        if (!masterLockEngagedRef.current) {
          masterLockEngagedRef.current = true;
          lockedTargetSymbolRef.current = targetSymbolRef.current!;
          console.log(`🔒 Master lock engaged for symbol ${lockedTargetSymbolRef.current}`);
        }
        
        console.log(`🎯 Capturing to locked position ${targetPosition.toFixed(1)}`);
        
        // Clean animation with no elastic bounce that could drift
        currentAnimationRef.current = animate(reelAnimation.current, {
          position: targetPosition,
          speed: 0,
          duration: 800, // Shorter, cleaner animation
          ease: 'outQuart', // Simpler easing, less bouncy
          onUpdate: () => {
            // Only render, no position interference
            render();
          },
          onComplete: () => {
            console.log(`✅ Capture complete at position ${reelAnimation.current.position.toFixed(1)}`);
            // Skip settling phase entirely - go directly to result
            self.methods.showResult();
          }
        });
      });
      
      // Result phase - deterministic result based on locked symbol
      self.add('showResult', () => {
        transitionToState(REEL_STATE_SHOWING_RESULT);
        
        // Use locked symbol if available, otherwise calculate
        const finalSymbol = masterLockEngagedRef.current && lockedTargetSymbolRef.current !== null 
          ? lockedTargetSymbolRef.current 
          : getCurrentSymbol();
          
        console.log(`🎯 Result: Symbol = ${finalSymbol} ${masterLockEngagedRef.current ? '(locked)' : '(calculated)'}`);
        onResult?.(reelIndex, finalSymbol);
        
        // Auto-return to idle after brief display
        setTimeout(() => {
          cleanReset();
        }, 1000);
      });
      
    });
    
    // Cleanup
    return () => {
      // Stop continuous spinning
      isSpinningContinuouslyRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (animeScope.current) {
        animeScope.current.revert();
      }
    };
  }, [reelIndex]);

  // Initialize canvas and reel strip
  useEffect(() => {
    if (!canvasRef.current) return;
    
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctxRef.current = canvasRef.current.getContext('2d');
    
    // Initialize reel position and strip
    reelAnimation.current.position = Math.floor(Math.random() * REEL_POSITIONS) * SYMBOL_SIZE;
    reelStripRef.current = generateRandomStrip();
    
    // Initial render
    render();
  }, [width, height]);

  // API Implementation - CLEAN and simple
  const startSpin = (): boolean => {
    // Clean reset if not idle
    if (currentStateRef.current !== REEL_STATE_IDLE) {
      cleanReset();
    }
    
    if (disabled) return false;
    
    // Reset detection flag for new spin
    targetDetectedRef.current = false;
    
    // Clear all locks for new spin
    lockedTargetPositionRef.current = null;
    masterLockEngagedRef.current = false;
    lockedTargetSymbolRef.current = null;
    
    console.log(`🎮 Reel ${reelIndex}: Starting clean spin`);
    
    if (animeScope.current?.methods?.spinUp) {
      animeScope.current.methods.spinUp();
      return true;
    }
    
    return false;
  };

  const forceStop = (targetSymbol?: number): boolean => {
    if (!isSpinning() || disabled) {
      return false;
    }
    
    if (targetSymbol) {
      setTargetSymbol(targetSymbol);
    }
    
    // Force transition to spinning down if currently spinning up or spinning
    if (currentStateRef.current === REEL_STATE_SPINNING_UP || 
        currentStateRef.current === REEL_STATE_SPINNING) {
      
      if (animeScope.current?.methods?.spinDown) {
        animeScope.current.methods.spinDown();
        return true;
      }
    }
    
    return false;
  };

  const setTargetSymbol = (symbol: number): boolean => {
    if (symbol < 1 || symbol > 6) return false;
    
    targetSymbolRef.current = symbol;
    targetDetectedRef.current = false; // Reset detection flag for new target
    
    // Clear all locks for new target
    lockedTargetPositionRef.current = null;
    masterLockEngagedRef.current = false;
    lockedTargetSymbolRef.current = null;
    
    console.log(`🎯 Reel ${reelIndex}: Target set to ${symbol}, locks cleared`);
    
    // Auto-transition to deceleration if spinning
    if (currentStateRef.current === REEL_STATE_SPINNING) {
      console.log(`🎯 Reel ${reelIndex}: Auto-transitioning to spinDown because state is ${currentStateRef.current}`);
      if (animeScope.current?.methods?.spinDown) {
        animeScope.current.methods.spinDown();
      }
    } else {
      console.log(`🎯 Reel ${reelIndex}: NOT transitioning to spinDown because state is ${currentStateRef.current}`);
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
           currentStateRef.current === REEL_STATE_SETTLING;
  };

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