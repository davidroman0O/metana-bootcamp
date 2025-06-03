import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import SlotMachineLever from './Lever';
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

// Enums - exactly like original Karma Slots
const STATE_REST = 0;
const STATE_SPINUP = 1;
const STATE_SPINDOWN = 2;
const STATE_REWARD = 3;

// Config - precisely calibrated based on Karma Slots
const REEL_COUNT = 3;
const REEL_POSITIONS = 32;
const SYMBOL_SIZE = 100; // Our symbol size
const REEL_PIXEL_LENGTH = REEL_POSITIONS * SYMBOL_SIZE;
const ROW_COUNT = 3;

// Critical parameters for realistic animation
const STOPPING_DISTANCE = 528 * (SYMBOL_SIZE / 32); // Proportional to original
const MAX_REEL_SPEED = SYMBOL_SIZE; // = 100, matching symbol_size for smooth movement
const SPINUP_ACCELERATION = 2 * (SYMBOL_SIZE / 32); // Scaled from original
const SPINDOWN_ACCELERATION = 1 * (SYMBOL_SIZE / 32); // Scaled from original
const REWARD_DELAY = 3;
const REWARD_DELAY_GRAND = 1;
const REWARD_GRAND_THRESHOLD = 25;

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

// Reel area dimensions - matching original proportions
const REEL_AREA_LEFT = 25;
const REEL_AREA_TOP = 25;
const REEL_AREA_WIDTH = 300; // 3 reels * 100px = 300px
const REEL_AREA_HEIGHT = 300; // Show 3 full symbols

// Set up reels - Boomer's pattern - identical structure to original Karma Slots
// We'll define this as a constant outside the component
const DEFAULT_REELS = [
  [2,1,5,1,2,5,6,5,3,6,1,6,1,5,3,4,3,2,4,5,1,6,6,5,6,5,4,3,1,5,5,4],
  [6,1,6,3,6,5,5,2,5,2,3,1,5,2,1,6,4,5,4,4,5,6,1,1,5,6,3,1,5,5,5,4],
  [1,4,2,5,5,6,4,6,5,5,2,1,6,4,6,1,5,6,3,1,5,5,2,3,5,3,5,6,1,4,1,3]
];

interface SlotMachineProps {
  displayLCD: string;
  reels: number[];
  reel1: number;
  reel2: number;
  reel3: number;
  spin1: boolean;
  spin2: boolean;
  spin3: boolean;
  lockLever: boolean;
  animation: boolean;
  onLever: () => void;
  onCoinInsert?: (ethAmount: string) => Promise<void>;
  isConnected?: boolean;
}

interface SlotMachineRef {
  spin: () => void;
  getState: () => number;
}

const SlotMachine = forwardRef<SlotMachineRef, SlotMachineProps>(({
  displayLCD,
  reels,
  reel1,
  reel2,
  reel3,
  spin1,
  spin2,
  spin3,
  lockLever,
  animation,
  onLever,
  onCoinInsert,
  isConnected = false
}, ref) => {
  const { isControlledMode, isAnimatedMode } = useAppMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leverRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  
  // State
  const [displayMessage, setDisplayMessage] = useState('Ready to play!');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  
  // Game state refs (mutable for animation loop)
  const gameStateRef = useRef(STATE_REST);
  const payoutRef = useRef(0);
  const rewardDelayCounterRef = useRef(0);
  
  // Add dynamic reels ref INSIDE the component
  const dynamicReelsRef = useRef<number[][]>(DEFAULT_REELS);
  
  // Reel state - exactly like Karma Slots implementation
  const reelPositionRef = useRef<number[]>([]);
  const reelSpeedRef = useRef<number[]>([0, 0, 0]);
  const stoppingPositionRef = useRef<number[]>([0, 0, 0]);
  const startSlowingRef = useRef<boolean[]>([false, false, false]);
  const resultRef = useRef<number[][]>(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(1)));
  
  // Canvas context
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Demo mode timer
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add a flag to track if the lever is usable
  const [leverDisabled, setLeverDisabled] = useState(false);

  // Initialize reel positions randomly just like Karma Slots does
  useEffect(() => {
    reelPositionRef.current = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      reelPositionRef.current[i] = Math.floor(Math.random() * REEL_POSITIONS) * SYMBOL_SIZE;
    }
  }, []);

  // Update how we initialize and handle reel values from props
  useEffect(() => {
    // Directly set local reels state to match props when they change
    if (reels && reels.length === 3) {
      console.log(`🔄 Updating displayed reels to: [${reels.join(', ')}]`);
      
      // Force redraw if we're in REST state
      if (gameStateRef.current === STATE_REST) {
        // Force a redraw to show the current symbols
        requestAnimationFrame(() => {
          render();
        });
      }
    }
  }, [reels]);

  // Handle lever callback to ensure it works on subsequent spins
  useEffect(() => {
    if (leverRef.current) {
      leverRef.current.setCallback(async () => {
        console.log(`🎮 LEVER PULLED - Machine state: ${gameStateRef.current}, current reels: [${reels.join(', ')}]`);
        
        if (gameStateRef.current !== STATE_REST) {
          console.log("⚠️ Machine is busy");
          return "Machine is busy!";
        }
        
        if (isControlledMode) {
          // In controlled mode, use the onLever callback from props
          console.log("🎮 CONTROLLED MODE - Triggering onLever callback");
          onLever();
          return "Spin triggered!";
        } else if (isAnimatedMode) {
          // In animated mode, start local spin
          console.log("🎮 ANIMATED MODE - Starting local spin");
          spin();
          return "Demo spin!";
        } else {
          // Handle any other mode
          console.log("🎮 OTHER MODE - Starting spin");
          spin();
        }
        
        return "Lever pulled!";
      });
    }
  }, [isControlledMode, isAnimatedMode, onLever, reels, gameStateRef.current]);

  // Initialize canvas and start animation loop
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Set canvas size to match reel area
    canvasRef.current.width = REEL_AREA_LEFT * 2 + REEL_AREA_WIDTH;
    canvasRef.current.height = REEL_AREA_TOP * 2 + REEL_AREA_HEIGHT;
    
    ctxRef.current = canvasRef.current.getContext('2d');
    
    // Start animation loop - just like Karma Slots
    const animate = () => {
      logic();
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Start demo mode if in animated mode
    if (isAnimatedMode) {
      startDemoMode();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
      }
    };
  }, [isAnimatedMode]);

  const startDemoMode = () => {
    if (!isAnimatedMode || gameStateRef.current !== STATE_REST) return;
    
    // Schedule next automatic spin
    demoTimerRef.current = setTimeout(() => {
      if (leverRef.current && gameStateRef.current === STATE_REST && isAnimatedMode) {
        leverRef.current.triggerPull(1.0);
      }
      if (isAnimatedMode) {
        startDemoMode(); // Schedule next
      }
    }, 5000);
  };

  const spin = () => {
    if (gameStateRef.current !== STATE_REST) {
      console.log("⚠️ Cannot spin, machine is not in REST state");
      return;
    }
    
    console.log("🎮 MANUAL SPIN TRIGGERED");
    
    // Clear log and update message
    setLogMessages([]);
    setDisplayMessage('Spinning...');
    
    // Reset all reel controls
    startSlowingRef.current = [false, false, false];
    reelSpeedRef.current = [0, 0, 0];
    
    // Start spinning
    gameStateRef.current = STATE_SPINUP;
  };

  // Draw a symbol at the given position - similar to Karma's implementation
  const drawSymbol = (symbolIndex: number, x: number, y: number) => {
    if (!ctxRef.current) return;
    
    const ctx = ctxRef.current;
    const symbol = SYMBOLS[symbolIndex - 1]; // Convert to 0-based index
    
    // Draw background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(x + REEL_AREA_LEFT, y + REEL_AREA_TOP, SYMBOL_SIZE, SYMBOL_SIZE);
    
    // Draw border
    ctx.strokeStyle = '#0055aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + REEL_AREA_LEFT, y + REEL_AREA_TOP, SYMBOL_SIZE, SYMBOL_SIZE);
    
    // Draw emoji with improved font settings for consistency
    ctx.font = `${SYMBOL_SIZE * 0.6}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = symbol.color;
    
    // More precise centering to account for emoji baseline inconsistencies
    const centerX = x + REEL_AREA_LEFT + SYMBOL_SIZE / 2;
    const centerY = y + REEL_AREA_TOP + SYMBOL_SIZE / 2;
    
    // Draw with explicit positioning for better emoji alignment
    ctx.fillText(symbol.emoji, centerX, centerY);
  };

  // Function to generate a completely new random reel strip
  const generateRandomStrip = () => {
    const newStrip = [];
    for (let i = 0; i < REEL_POSITIONS; i++) {
      // Random symbol between 1-6
      newStrip.push(Math.floor(Math.random() * 6) + 1);
    }
    return newStrip;
  };

  // Update the strip on each spin
  useEffect(() => {
    // If this is a new spin, regenerate ALL the reel strips completely
    if (spin1 && spin2 && spin3 && gameStateRef.current === STATE_REST) {
      // Generate completely new random reels for this spin
      const newReels = [
        generateRandomStrip(),
        generateRandomStrip(),
        generateRandomStrip()
      ];
      
      // Make sure our target symbols appear in the strips
      // Insert the target symbols into random positions in each strip
      if (reels && reels.length === 3) {
        for (let i = 0; i < 3; i++) {
          // Insert the target symbol at a random position that will be visible
          const insertPosition = Math.floor(Math.random() * (REEL_POSITIONS - 5)) + 1;
          newReels[i][insertPosition] = reels[i];
          
          // Make sure there are a few more occurrences for good measure
          const secondPosition = (insertPosition + 10) % REEL_POSITIONS;
          newReels[i][secondPosition] = reels[i];
        }
      }
      
      console.log("🎲 Generated completely new random reel strips for this spin!");
      console.log(`🎲 Target symbols [${reels.join(', ')}] inserted at random positions`);
      
      // Update the dynamic reels ref
      dynamicReelsRef.current = newReels;
    }
  }, [spin1, spin2, spin3, reels]);

  // Update renderReel to use dynamic reels
  const renderReel = () => {
    if (!ctxRef.current) return;
    
    const ctx = ctxRef.current;
    
    // Clear reel area
    ctx.fillStyle = '#0a1526';
    ctx.fillRect(REEL_AREA_LEFT, REEL_AREA_TOP, REEL_AREA_WIDTH, REEL_AREA_HEIGHT);
    
    // Set clipping area for reels
    ctx.save();
    ctx.beginPath();
    ctx.rect(REEL_AREA_LEFT, REEL_AREA_TOP, REEL_AREA_WIDTH, REEL_AREA_HEIGHT);
    ctx.clip();
    
    // Draw each reel (showing ROW_COUNT + 1 symbols for smooth scrolling)
    for (let i = 0; i < REEL_COUNT; i++) {
      // Calculate which symbol should be at the top
      const reelIndex = Math.floor(reelPositionRef.current[i] / SYMBOL_SIZE);
      const symbolOffset = reelPositionRef.current[i] % SYMBOL_SIZE;
      
      // Draw ROW_COUNT + 1 symbols vertically for smooth scrolling
      for (let j = 0; j < ROW_COUNT + 1; j++) {
        let wrappedIndex = (reelIndex + j) % REEL_POSITIONS;
        if (wrappedIndex < 0) wrappedIndex += REEL_POSITIONS;
        
        // Use the DYNAMIC reel strip for all positions
        const symbolIndex = dynamicReelsRef.current[i][wrappedIndex];
        
        // Calculate x position (horizontal)
        const x = i * SYMBOL_SIZE;
        
        // Calculate y position (vertical) with offset for smooth animation
        const y = j * SYMBOL_SIZE - symbolOffset;
        
        // Draw the symbol
        drawSymbol(symbolIndex, x, y);
      }
    }
    
    ctx.restore();
  };

  // Main render function
  const render = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    
    const ctx = ctxRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#0a1526';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Render reels
    if (gameStateRef.current === STATE_SPINUP || gameStateRef.current === STATE_SPINDOWN) {
      renderReel();
    } else {
      renderReel(); // Always render reels in all states for our implementation
    }
    
    // Draw payline
    const paylineY = canvasRef.current.height / 2;
    
    // Draw the main payline with glow effect
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, paylineY);
    ctx.lineTo(canvasRef.current.width, paylineY);
    ctx.stroke();
    
    // Remove shadow for other drawing operations
    ctx.shadowBlur = 0;
  };

  // Update the setStops function to use dynamic reels and ensure more randomness
  const setStops = () => {
    console.log("🎲 Generating random stop positions for dynamic reels");
    
    // First, generate a completely new set of reels for more variety
    const newReels = [
      generateRandomStrip(),
      generateRandomStrip(),
      generateRandomStrip()
    ];
    
    // Update our dynamic reels
    dynamicReelsRef.current = newReels;
    console.log("🎲 COMPLETELY NEW RANDOM REELS GENERATED FOR THIS SPIN");
    
    for (let i = 0; i < REEL_COUNT; i++) {
      startSlowingRef.current[i] = false;
      
      // Generate a more random stopIndex using a more sophisticated approach
      const stopIndex = Math.floor(Math.random() * REEL_POSITIONS);
      console.log(`🎲 Reel ${i} random stop index: ${stopIndex}`);
      
      // Direct copy of Karma Slots stopping logic
      stoppingPositionRef.current[i] = stopIndex * SYMBOL_SIZE;
      stoppingPositionRef.current[i] += STOPPING_DISTANCE;
      
      // Simple wrapping like original
      if (stoppingPositionRef.current[i] >= REEL_PIXEL_LENGTH) {
        stoppingPositionRef.current[i] -= REEL_PIXEL_LENGTH;
      }
      
      // Set result like original - the symbols that will be visible
      for (let j = 0; j < ROW_COUNT; j++) {
        let resultIndex = stopIndex + j;
        if (resultIndex >= REEL_POSITIONS) resultIndex -= REEL_POSITIONS;
        resultRef.current[i][j] = dynamicReelsRef.current[i][resultIndex];
      }
      
      console.log(`🎲 Reel ${i} final stopping position: ${stoppingPositionRef.current[i]}`);
      console.log(`🎲 Reel ${i} results will be: ${resultRef.current[i].join(', ')}`);
    }
  };

  // Move the reel exactly like Karma Slots
  const moveReel = (i: number) => {
    reelPositionRef.current[i] -= reelSpeedRef.current[i];
    
    // Wrap
    if (reelPositionRef.current[i] < 0) {
      reelPositionRef.current[i] += REEL_PIXEL_LENGTH;
    }
  };

  // Handle reels accelerating to full speed - improved to guarantee randomness
  const logicSpinup = () => {
    for (let i = 0; i < REEL_COUNT; i++) {
      moveReel(i);
      reelSpeedRef.current[i] += SPINUP_ACCELERATION;
      
      // Cap at max speed
      if (reelSpeedRef.current[i] > MAX_REEL_SPEED) {
        reelSpeedRef.current[i] = MAX_REEL_SPEED;
      }
    }
    
    // If reels at max speed, begin spindown
    if (reelSpeedRef.current[0] >= MAX_REEL_SPEED) {
      console.log(`🚀 MAX SPEED REACHED - Setting stops and moving to SPINDOWN`);
      
      if (isAnimatedMode) {
        // Force a new random seed each time by using current timestamp
        const seed = Date.now() % 10000;
        console.log(`🎲 Using random seed: ${seed}`);
        
        // Generate truly random stops each time
        setStops();
      }
      
      // For controlled mode, stops are set externally
      gameStateRef.current = STATE_SPINDOWN;
    }
  };

  // Fix the spin state handling to ensure reels stop correctly
  useEffect(() => {
    if (isControlledMode) {
      // Start spinning when all spin flags are true
      if (spin1 && spin2 && spin3 && gameStateRef.current === STATE_REST) {
        // Start spinning
        gameStateRef.current = STATE_SPINUP;
        reelSpeedRef.current = [0, 0, 0];
        startSlowingRef.current = [false, false, false];
        
        // Initialize any tracking variables
        for (let i = 0; i < REEL_COUNT; i++) {
          stoppingPositionRef.current[i] = 0;
        }
        
        setDisplayMessage("Spinning...");
        setLogMessages([]);
        console.log("SPIN START: All reels starting to spin");
      }
      
      // Handle individual reel stopping
      if (gameStateRef.current === STATE_SPINUP || gameStateRef.current === STATE_SPINDOWN) {
        // Only trigger stopping when speed has reached max (we're in full spin)
        if (reelSpeedRef.current[0] >= MAX_REEL_SPEED * 0.9) {
          const targetResult = [reel1, reel2, reel3];
          
          // Check each reel individually
          if (!spin1 && !startSlowingRef.current[0]) {
            console.log(`PROGRAMMATIC STOP: Reel 0 targeting symbol ${targetResult[0]}`);
            setReelStopTarget(0, targetResult[0]);
          }
          
          if (!spin2 && !startSlowingRef.current[1]) {
            console.log(`PROGRAMMATIC STOP: Reel 1 targeting symbol ${targetResult[1]}`);
            setReelStopTarget(1, targetResult[1]);
          }
          
          if (!spin3 && !startSlowingRef.current[2]) {
            console.log(`PROGRAMMATIC STOP: Reel 2 targeting symbol ${targetResult[2]}`);
            setReelStopTarget(2, targetResult[2]);
          }
          
          // If all reels are told to stop, ensure we're in SPINDOWN state
          if (!spin1 && !spin2 && !spin3) {
            if (gameStateRef.current !== STATE_SPINDOWN) {
              console.log("All reels commanded to stop - entering SPINDOWN state");
              gameStateRef.current = STATE_SPINDOWN;
            }
          }
        }
      }
    }
  }, [spin1, spin2, spin3, reel1, reel2, reel3, isControlledMode]);

  // Handle controlled mode stop with specific results - REMOVED IN FAVOR OF ABOVE APPROACH

  // Complete overhaul of the setReelStopTarget function to ensure smooth landing on target symbols
  const setReelStopTarget = (reelIndex: number, targetSymbol: number) => {
    if (startSlowingRef.current[reelIndex]) {
      return; // Already slowing
    }
    
    console.log(`🎯 Setting target symbol ${targetSymbol} for reel ${reelIndex}`);
    
    // Find ALL occurrences of the target symbol in the reel
    const symbolPositions: number[] = [];
    for (let i = 0; i < REEL_POSITIONS; i++) {
      if (dynamicReelsRef.current[reelIndex][i] === targetSymbol) {
        symbolPositions.push(i);
      }
    }
    
    if (symbolPositions.length === 0) {
      console.warn(`Target symbol ${targetSymbol} not found in reel ${reelIndex}, using position 0`);
      symbolPositions.push(0);
    }
    
    console.log(`🎯 Found ${symbolPositions.length} occurrences of symbol ${targetSymbol} in reel ${reelIndex}`);
    
    // Find current position in the strip
    const currentPosition = reelPositionRef.current[reelIndex];
    const currentIndex = Math.floor(currentPosition / SYMBOL_SIZE) % REEL_POSITIONS;
    
    // Find the next occurrence of the symbol after sufficient spinning
    // We want to ensure the reel spins at least 2 full rotations
    const minRotations = 2;
    const minDistance = minRotations * REEL_PIXEL_LENGTH;
    
    // Calculate distance to each occurrence and pick the best one
    let bestDistance = Infinity;
    let bestStopIndex = symbolPositions[0];
    
    for (const pos of symbolPositions) {
      // Calculate how far we need to travel to reach this occurrence
      // We need to ensure the symbol will be at the CENTER position (payline)
      let distance = 0;
      
      // We need to align the symbol with the CENTER position (index 1 in display)
      // This means the symbol must be 1 position down from the top of the visible area
      const targetTopIndex = (pos - 1 + REEL_POSITIONS) % REEL_POSITIONS;
      
      if (targetTopIndex >= currentIndex) {
        // Symbol is ahead of current position
        distance = (targetTopIndex - currentIndex) * SYMBOL_SIZE;
      } else {
        // Symbol is behind current position, need to go around
        distance = (REEL_POSITIONS - currentIndex + targetTopIndex) * SYMBOL_SIZE;
      }
      
      // Add minimum rotation distance
      distance += minDistance;
      
      // Find the closest occurrence that meets minimum spin requirement
      if (distance < bestDistance) {
        bestDistance = distance;
        bestStopIndex = pos;
      }
    }
    
    // Calculate the exact stopping position where the symbol will be at the CENTER
    // We need to align the top of the reel with the position that will place
    // our target symbol at the CENTER
    const topIndex = (bestStopIndex - 1 + REEL_POSITIONS) % REEL_POSITIONS;
    stoppingPositionRef.current[reelIndex] = topIndex * SYMBOL_SIZE;
    
    console.log(`🎯 Reel ${reelIndex}: Will spin ${bestDistance / SYMBOL_SIZE} symbols to align symbol ${targetSymbol} at position ${bestStopIndex}`);
    console.log(`🎯 Reel ${reelIndex}: Final stopping position = ${stoppingPositionRef.current[reelIndex]}`);
    
    // Mark this reel to start slowing when it approaches the target
    startSlowingRef.current[reelIndex] = false;
    
    // Pre-calculate and store the final result for reward calculation
    for (let j = 0; j < ROW_COUNT; j++) {
      let resultIndex = bestStopIndex - 1 + j; // -1 because we're aligning the top position
      if (resultIndex < 0) resultIndex += REEL_POSITIONS;
      if (resultIndex >= REEL_POSITIONS) resultIndex -= REEL_POSITIONS;
      resultRef.current[reelIndex][j] = dynamicReelsRef.current[reelIndex][resultIndex];
    }
    
    // Log the expected final visible result
    console.log(`🎯 Expected final visible symbols for reel ${reelIndex}: ${resultRef.current[reelIndex].join(", ")}`);
  };

  // Improved logicSpindown for smoother deceleration and stopping
  const logicSpindown = () => {
    // Check if all reels have stopped
    const allStopped = reelSpeedRef.current.every(speed => speed === 0);
    
    if (allStopped) {
      console.log("🏁 ALL REELS STOPPED - Moving to REWARD state");
      
      // Double-check final positions
      for (let i = 0; i < REEL_COUNT; i++) {
        // Calculate which symbol is at the center (payline)
        const reelIndex = Math.floor(reelPositionRef.current[i] / SYMBOL_SIZE) % REEL_POSITIONS;
        const centerIndex = (reelIndex + 1) % REEL_POSITIONS; // +1 because we're checking the center position
        const actualSymbol = dynamicReelsRef.current[i][centerIndex];
        
        // Log the actual vs. expected result
        console.log(`Final reel ${i}: symbol at payline = ${actualSymbol}, target was ${reels[i]}`);
      }
      
      // Calculate reward based on the actual visible results
      calcReward();
      gameStateRef.current = STATE_REWARD;
      return;
    }
    
    for (let i = 0; i < REEL_COUNT; i++) {
      // Always move the reel
      moveReel(i);
      
      // Determine if this reel should start slowing down
      if (!startSlowingRef.current[i]) {
        let checkPosition = false;
        if (i === 0) checkPosition = true;
        else if (startSlowingRef.current[i - 1]) checkPosition = true;
        
        if (checkPosition) {
          // Calculate distance to target
          const currentPos = reelPositionRef.current[i];
          const targetPos = stoppingPositionRef.current[i];
          
          // Distance calculation with wraparound
          let distance = 0;
          if (currentPos <= targetPos) {
            distance = targetPos - currentPos;
          } else {
            distance = REEL_PIXEL_LENGTH - currentPos + targetPos;
          }
          
          // Start slowing down at a carefully calibrated distance
          // This ensures smooth deceleration that lands exactly on the target
          if (distance <= STOPPING_DISTANCE) {
            console.log(`🎯 Reel ${i} starting to slow, distance to target: ${distance}px (${distance/SYMBOL_SIZE} symbols)`);
            startSlowingRef.current[i] = true;
          }
        }
      } else {
        // We're in slowing phase
        if (reelSpeedRef.current[i] > 0) {
          // Apply deceleration
          reelSpeedRef.current[i] = Math.max(0, reelSpeedRef.current[i] - SPINDOWN_ACCELERATION);
          
          // Check if we've stopped
          if (reelSpeedRef.current[i] <= 0) {
            reelSpeedRef.current[i] = 0;
            
            // Ensure we're exactly at the target position
            reelPositionRef.current[i] = stoppingPositionRef.current[i];
            
            // Calculate which symbol is at the center (payline)
            const reelIndex = Math.floor(reelPositionRef.current[i] / SYMBOL_SIZE) % REEL_POSITIONS;
            const centerIndex = (reelIndex + 1) % REEL_POSITIONS; // +1 because we're checking the center position
            
            console.log(`🛑 STOPPED Reel ${i} at position ${reelPositionRef.current[i]}, symbol at payline: ${dynamicReelsRef.current[i][centerIndex]}`);
          }
        }
      }
    }
  };

  // Handle reward animation - identical to Karma Slots
  const logicReward = () => {
    if (payoutRef.current === 0) {
      console.log(`🏆 REWARD COMPLETE - Moving to REST state`);
      
      // Full reset of machine state
      gameStateRef.current = STATE_REST;
      setDisplayMessage(isAnimatedMode ? '🎬 Demo complete!' : 'Ready to play!');
      
      // Make sure stopping positions are cleared for next spin
      stoppingPositionRef.current = [0, 0, 0];
      startSlowingRef.current = [false, false, false];
      reelSpeedRef.current = [0, 0, 0];
      
      // In animated mode, continue demo cycle
      if (isAnimatedMode) {
        setTimeout(() => {
          startDemoMode();
        }, 2000);
      }
      return;
    }
    
    // Don't tick up rewards each frame
    if (rewardDelayCounterRef.current > 0) {
      rewardDelayCounterRef.current--;
      return;
    }
    
    console.log(`🏆 REWARD TICK: payout ${payoutRef.current} → ${payoutRef.current - 1}`);
    payoutRef.current--;
    
    if (payoutRef.current < REWARD_GRAND_THRESHOLD) {
      rewardDelayCounterRef.current = REWARD_DELAY;
    } else {
      rewardDelayCounterRef.current = REWARD_DELAY_GRAND;
    }
  };

  // Main game logic loop - identical to Karma Slots
  const logic = () => {
    const currentState = gameStateRef.current;
    
    if (currentState === STATE_SPINUP) {
      logicSpinup();
    } else if (currentState === STATE_SPINDOWN) {
      logicSpindown();
    } else if (currentState === STATE_REWARD) {
      logicReward();
    }
    
    // Debug state changes with timing
    if (gameStateRef.current !== currentState) {
      const stateNames = ['REST', 'SPINUP', 'SPINDOWN', 'REWARD'];
      const timestamp = Date.now();
      console.log(`🔄 STATE CHANGE at ${timestamp}: ${stateNames[currentState]} → ${stateNames[gameStateRef.current]}`);
    }
  };

  // Calculate win amounts using the actual visible symbols
  const calcReward = () => {
    payoutRef.current = 0;
    const messages: string[] = [];
    let totalPayout = 0;
    
    // Get the actual visible symbols at the payline
    const visibleSymbols: number[] = [];
    
    // For each reel, get the symbol at the payline position
    for (let i = 0; i < REEL_COUNT; i++) {
      // Calculate which symbol is at the center (payline)
      const reelIndex = Math.floor(reelPositionRef.current[i] / SYMBOL_SIZE) % REEL_POSITIONS;
      const centerIndex = (reelIndex + 1) % REEL_POSITIONS; // +1 because we're checking the center position
      const symbol = dynamicReelsRef.current[i][centerIndex];
      visibleSymbols.push(symbol);
    }
    
    const s1 = visibleSymbols[0];
    const s2 = visibleSymbols[1];
    const s3 = visibleSymbols[2];
    
    console.log(`💰 Calculating reward for visible symbols: [${visibleSymbols.join(', ')}]`);
    
    // Perfect match
    if (s1 === s2 && s2 === s3) {
      const payout = MATCH_PAYOUT[s1] || 0;
      if (payout > 0) {
        const symbolName = SYMBOLS[s1 - 1].name;
        messages.push(`${symbolName} TRIPLE! ${payout} CHIPS!`);
        totalPayout += payout;
      }
    }
    // Special rocket pair (🚀🚀X)
    else if (s1 === 5 && s2 === 5) {
      messages.push(`ROCKET SPECIAL! ${PAYOUT_ROCKET_PAIR} CHIPS!`);
      totalPayout += PAYOUT_ROCKET_PAIR;
    }
    // Any pair
    else if (s1 === s2 || s2 === s3 || s1 === s3) {
      const pairPayout = 50;
      messages.push(`PAIR MATCH! ${pairPayout} CHIPS!`);
      totalPayout += pairPayout;
    }
    
    console.log(`💰 Total payout: ${totalPayout}`);
    
    payoutRef.current = totalPayout;
    setLogMessages(messages);
    
    if (totalPayout > 0) {
      setDisplayMessage(`WIN! ${totalPayout} CHIPS!`);
    } else {
      setDisplayMessage('No win this time...');
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    spin: () => spin(),
    getState: () => gameStateRef.current
  }));

  // Handle coin insert
  const handleCoin = async () => {
    if (!onCoinInsert) return;
    
    try {
      await onCoinInsert('0.1');
    } catch (error) {
      console.error('Error inserting coin:', error);
    }
  };

  // Update game state to reflect if the lever should be disabled
  useEffect(() => {
    // Lever should be disabled when the machine is busy (not in REST state)
    const shouldDisable = gameStateRef.current !== STATE_REST || lockLever;
    setLeverDisabled(shouldDisable);
  }, [gameStateRef.current, lockLever]);

  // Update the useEffect hook to process incoming reel values from props
  useEffect(() => {
    // Only log the incoming reels, don't force changes to the UI
    if (reels && reels.length === 3) {
      console.log(`📥 Received target reels for next spin: [${reels.join(', ')}]`);
    }
  }, [reels]);

  // Initialize reels with props values
  useEffect(() => {
    // Initialize reel positions randomly just like Karma Slots does
    reelPositionRef.current = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      reelPositionRef.current[i] = Math.floor(Math.random() * REEL_POSITIONS) * SYMBOL_SIZE;
    }
    
    // Also make sure to use the props values for initial display
    console.log(`🎮 Initializing with reel values: [${reels.join(', ')}]`);
  }, []);

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

        {/* Canvas for reels */}
        <div className="canvas-container">
          <canvas 
            ref={canvasRef} 
            width={350} 
            height={350}
            className="slot-canvas"
          />
        </div>

        {/* LCD display bar */}
        <div className="lcd-display-bar">
          <div className="display-screen">
            {isAnimatedMode ? "🎬 AUTO DEMO - Watch the magic happen!" : displayLCD}
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
            <div className={`status-light ${gameStateRef.current === STATE_REST ? 'ready' : 'busy'}`}></div>
            <span className="status-text">
              {gameStateRef.current === STATE_REST 
                ? 'READY TO SPIN' 
                : gameStateRef.current === STATE_SPINUP 
                  ? 'SPINNING UP' 
                  : gameStateRef.current === STATE_SPINDOWN 
                    ? 'SLOWING DOWN' 
                    : 'COUNTING REWARD'}
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