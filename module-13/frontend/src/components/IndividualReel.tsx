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

// Animation timing constants (now for Anime.js)
const SPINUP_DURATION = 800; // ms to reach max speed
const MAX_SPINNING_SPEED = 28*2; // pixels per frame (60fps) - FASTER, more exciting slot machine speed
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
  
  // Anime.js scope for proper React integration
  const animeScope = useRef<any>(null);
  
  // Animation state - now driven by Anime.js
  const reelAnimation = useRef({ 
    position: 0, 
    speed: 0,
    oscillation: 0 
  });
  
  // State management
  const currentStateRef = useRef<string>(REEL_STATE_IDLE);
  const targetSymbolRef = useRef<number | null>(null);
  const reelStripRef = useRef<number[]>([]);
  
  // Animation references - simplified
  const currentAnimationRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const isSpinningContinuouslyRef = useRef<boolean>(false);
  const targetDetectedRef = useRef<boolean>(false); // CRITICAL: Prevent multiple detections
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track result display timeout
  const operationLockRef = useRef<boolean>(false); // BULLETPROOF operation lock

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

  // Calculate the exact reel position needed to center the target symbol on the red line
  const calculateTargetPosition = (targetSymbol: number): number | null => {
    const currentReelIndex = Math.floor(reelAnimation.current.position / SYMBOL_SIZE);
    const symbolOffset = reelAnimation.current.position % SYMBOL_SIZE;
    
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
    
    // Calculate exact position to center this symbol
    const targetCurrentReelIndex = (targetSymbolStripIndex - 1 + REEL_POSITIONS) % REEL_POSITIONS;
    const targetReelPosition = targetCurrentReelIndex * SYMBOL_SIZE;
    
    return targetReelPosition;
  };

  // CLEAN target detection - simple and reliable
  const checkTargetSymbolCrossing = (targetSymbol: number): boolean => {
    const currentReelIndex = Math.floor(reelAnimation.current.position / SYMBOL_SIZE);
    const symbolOffset = reelAnimation.current.position % SYMBOL_SIZE;
    const FIXED_PAYLINE_CENTER = 150;
    
    // Check visible rows for target symbol
    for (let row = 0; row < ROW_COUNT + 2; row++) {
      let wrappedIndex = (currentReelIndex + row) % REEL_POSITIONS;
      if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
      
      if (reelStripRef.current[wrappedIndex] === targetSymbol) {
        const symbolScreenTop = row * SYMBOL_SIZE - symbolOffset;
        const symbolScreenCenter = symbolScreenTop + SYMBOL_CENTER_OFFSET;
        
        // Simple crossing check - symbol center at or past payline
        if (symbolScreenCenter >= FIXED_PAYLINE_CENTER) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Get current symbol closest to payline center
  const getCurrentSymbol = (): number => {
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

  // CLEAN state transition - atomic and predictable
  const transitionToState = (newState: string) => {
    const oldState = currentStateRef.current;
    currentStateRef.current = newState;
    
    console.log(`🎰 Reel ${reelIndex}: ${oldState} → ${newState}`);
    onStateChange?.(reelIndex, newState);
  };

  // CLEAN animation stop - no leaks
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

  // CLEAN state reset - internal use, preserves reel strip AND position
  const cleanReset = () => {
    stopAllAnimations();
    
    // Reset animation properties but KEEP current position
    reelAnimation.current.speed = 0;
    reelAnimation.current.oscillation = 0;
    // DON'T randomize position - keep the captured result visible!
    
    // Reset target and detection flag
    targetSymbolRef.current = null;
    targetDetectedRef.current = false;
    
    // DON'T regenerate reel strip - keep existing symbols!
    
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
    
    // Generate fresh reel strip for manual reset
    reelStripRef.current = generateRandomStrip();
    
    // Always end in idle
    transitionToState(REEL_STATE_IDLE);
    render();
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

  // Render the reel (called by Anime.js onUpdate)
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
      
      // Draw the symbol
      drawSymbol(symbolIndex, 0, y);
    }
    
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
    
    // NO oscillation during spinning - keep it perfectly smooth
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
      
      // Spin down phase - CLEAN deceleration with simple detection
      self.add('spinDown', () => {
        stopAllAnimations();
        transitionToState(REEL_STATE_SPINNING_DOWN);
        
        console.log(`🎯 Reel ${reelIndex}: Clean deceleration starting`);
        
        const animationState = { 
          speed: MAX_SPINNING_SPEED,
          position: reelAnimation.current.position 
        };
        
        currentAnimationRef.current = animate(animationState, {
          speed: 0.5,
          duration: 6000,
          ease: 'outQuint',
          onUpdate: () => {
            // Update position
            animationState.position -= animationState.speed;
            if (animationState.position < 0) {
              animationState.position += REEL_PIXEL_LENGTH;
            }
            
            reelAnimation.current.position = animationState.position;
            reelAnimation.current.speed = animationState.speed;
            reelAnimation.current.oscillation = 0;
            
            render();
            
            // FIXED: Use detection flag to prevent multiple triggers
            if (targetSymbolRef.current && 
                !targetDetectedRef.current &&
                checkTargetSymbolCrossing(targetSymbolRef.current)) {
              console.log(`🎯 Reel ${reelIndex}: Target ${targetSymbolRef.current} crossed - capturing`);
              targetDetectedRef.current = true; // STOP multiple detections
              self.methods.capture();
            } else if (targetSymbolRef.current) {
              // Debug logging to see what's happening
              const crossing = checkTargetSymbolCrossing(targetSymbolRef.current);
              if (crossing && targetDetectedRef.current) {
                console.log(`🚫 Reel ${reelIndex}: Target detected but flag already set`);
              }
            }
          },
          onComplete: () => {
            console.log(`⚠️ Reel ${reelIndex}: Deceleration timeout`);
            self.methods.capture();
          }
        });
      });
      
      // Capture phase - CLEAN snap to target
      self.add('capture', () => {
        console.log(`🔥 Reel ${reelIndex}: CAPTURE METHOD CALLED for target ${targetSymbolRef.current}`);
        stopAllAnimations();
        transitionToState(REEL_STATE_STOPPING);
        
        const targetPosition = calculateTargetPosition(targetSymbolRef.current!);
        
        if (targetPosition === null) {
          console.log(`⚠️ Reel ${reelIndex}: No target position - showing current`);
          self.methods.showResult();
          return;
        }
        
        console.log(`🎯 Reel ${reelIndex}: Capturing to position ${targetPosition.toFixed(1)}`);
        
        currentAnimationRef.current = animate(reelAnimation.current, {
          position: targetPosition,
          speed: 0,
          duration: 800,
          ease: 'outElastic',
          onUpdate: render,
          onComplete: () => {
            console.log(`✅ Reel ${reelIndex}: Capture complete`);
            self.methods.showResult();
          }
        });
      });
      
      // Settling phase - subtle bounce effect
      self.add('settle', () => {
        transitionToState(REEL_STATE_SETTLING);
        
        const referencePosition = reelAnimation.current.position;
        
        // Subtle bounce animation
        currentAnimationRef.current = animate(reelAnimation.current, {
          position: [
            { to: referencePosition + 8, duration: SETTLING_DURATION * 0.3 },
            { to: referencePosition - 4, duration: SETTLING_DURATION * 0.4 },
            { to: referencePosition, duration: SETTLING_DURATION * 0.3 }
          ],
          ease: 'outElastic(1, 0.5)',
          onUpdate: () => {
            render(); // Render on each update
          },
          onComplete: () => {
            self.methods.showResult();
          }
        });
      });
      
      // Result phase - CLEAN and immediate
      self.add('showResult', () => {
        transitionToState(REEL_STATE_SHOWING_RESULT);
        
        const finalSymbol = getCurrentSymbol();
        console.log(`🎯 Reel ${reelIndex}: Result = ${finalSymbol}`);
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
    console.log(`🎯 Reel ${reelIndex}: Target set to ${symbol}, detection flag reset to false`);
    
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