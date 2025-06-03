import { useState, useCallback, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import toast from 'react-hot-toast';
import type { Address } from 'viem';
import { useAppMode } from '../contexts/AppModeContext';

// Config imports
import { CONTRACT_ADDRESSES } from '../config/wagmi';
import { DegenSlotsABI } from '../config/contracts/DegenSlotsABI';
import { ChipTokenABI } from '../config/contracts/ChipTokenABI';

interface SlotMachineState {
  // Reel states
  spin1: boolean;
  spin2: boolean;
  spin3: boolean;
  
  // UI states
  lockLever: boolean;
  animationSpin: boolean;
  displayLCD: string;
  
  // Transaction IDs (only used in real mode)
  buyChipTransactionID: string | null;
  approveTransactionID: string | null;
  depositCollateralTransactionID: string | null;
  borrowChipTransactionID: string | null;
  repayLoanTransactionID: string | null;
  withdrawETHTransactionID: string | null;
  cashOutTransactionID: string | null;
  spinTransactionID: string | null;
  
  // Game state
  reels: number[];
  lastResult: any;
  betAmount: string;
  
  // Manual mode state
  manualResult: {
    reel1: number;
    reel2: number;
    reel3: number;
    payout: string;
    payoutType: string;
  } | null;
}

const MOTIVATIONAL_QUOTES = [
  "The next spin could be THE ONE!",
  "Fortune favors the bold!",
  "Your luck is about to change...",
  "One more spin to victory!",
  "The jackpot is calling your name!",
  "This could be your lucky moment!",
  "Keep spinning, keep winning!"
];

// Improve the manual mode result generator to ensure more variety
const generateRandomResult = () => {
  // Force true randomness with a timestamp seed
  const seed = Date.now();
  
  // More random generation for each reel - add timestamp to ensure uniqueness
  const reel1 = Math.floor(Math.random() * 6) + 1;
  const reel2 = Math.floor(Math.random() * 6) + 1;
  const reel3 = Math.floor(Math.random() * 6) + 1;
  
  console.log(`🎲 [TIME:${seed}] TRULY Generated random reels: [${reel1}, ${reel2}, ${reel3}]`);
  
  // Simple winning logic for demo
  let payout = '0';
  let payoutType = 'LOSE';
  
  if (reel1 === reel2 && reel2 === reel3) {
    // Triple match
    switch (reel1) {
      case 6: // JACKPOT
        payout = '6660';
        payoutType = 'JACKPOT';
        break;
      case 5: // ROCKET
        payout = '5550';
        payoutType = 'ULTRA WIN';
        break;
      case 4: // DIAMOND
        payout = '4440';
        payoutType = 'MEGA WIN';
        break;
      case 3: // PUMP
        payout = '3330';
        payoutType = 'BIG WIN';
        break;
      case 2: // COPE
        payout = '2220';
        payoutType = 'MEDIUM WIN';
        break;
      case 1: // DUMP
        payout = '1110';
        payoutType = 'SMALL WIN';
        break;
    }
  } else if (reel1 === 5 && reel2 === 5) {
    // Special ROCKET pair
    payout = '1000';
    payoutType = 'ROCKET SPECIAL';
  } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
    // Pair match
    payout = '500';
    payoutType = 'PAIR WIN';
  }
  
  return { reel1, reel2, reel3, payout, payoutType };
};

export function useSlotMachine(chainId: number | undefined) {
  const { address: account, isConnected } = useAccount();
  const { isRealMode, isManualMode } = useAppMode();
  
  // State management
  const [state, setState] = useState<SlotMachineState>({
    spin1: false,
    spin2: false,
    spin3: false,
    lockLever: false,
    animationSpin: false,
    displayLCD: isManualMode ? "Manual mode - Ready to play!" : (isConnected ? "Ready to play!" : "Connect wallet to play"),
    buyChipTransactionID: null,
    approveTransactionID: null,
    depositCollateralTransactionID: null,
    borrowChipTransactionID: null,
    repayLoanTransactionID: null,
    withdrawETHTransactionID: null,
    cashOutTransactionID: null,
    spinTransactionID: null,
    reels: [1, 2, 3],
    lastResult: null,
    betAmount: '1000',
    manualResult: null
  });

  // Contract addresses (only used in real mode)
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};

  // Contract reads (only active in real mode)
  const { data: chipBalance, refetch: refetchChipBalance } = useReadContract({
    address: addresses.CHIP_TOKEN,
    abi: ChipTokenABI,
    functionName: 'balanceOf',
    args: [account!],
    query: { enabled: !!account && !!addresses.CHIP_TOKEN && isRealMode },
  });

  const { data: chipAllowance } = useReadContract({
    address: addresses.CHIP_TOKEN,
    abi: ChipTokenABI,
    functionName: 'allowance',
    args: [account!, addresses.DEGEN_SLOTS],
    query: { enabled: !!account && !!addresses.CHIP_TOKEN && isRealMode },
  });

  // Contract writes (only used in real mode)
  const { writeContract: approveChips, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: buyChips, data: buyHash, isPending: isBuying } = useWriteContract();
  const { writeContract: spinSlots, data: spinHash, isPending: isSpinning } = useWriteContract();

  // Transaction receipts (only used in real mode)
  const { isLoading: approveTxLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: buyTxLoading, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyHash });
  const { isLoading: spinTxLoading, isSuccess: spinSuccess } = useWaitForTransactionReceipt({ hash: spinHash });

  // Update LCD display based on mode
  useEffect(() => {
    if (isManualMode) {
      setState(prev => ({
        ...prev,
        displayLCD: prev.spin1 || prev.spin2 || prev.spin3 ? prev.displayLCD : "Manual mode - Ready to play!"
      }));
    } else {
      setState(prev => ({
        ...prev,
        displayLCD: isConnected ? "Ready to play!" : "Connect wallet to play"
      }));
    }
  }, [isManualMode, isConnected]);

  // Update the manual mode spin sequence to ensure different results each time
  const performManualSpin = useCallback(async () => {
    if (state.lockLever) return;

    // Generate a truly random result using current timestamp as seed
    const seed = Date.now() % 10000;
    console.log(`🎲 Manual spin with FORCED RANDOM seed: ${seed}`);
    
    // Generate random result RIGHT HERE, not in a variable that might be reused
    const result = {
      reel1: Math.floor(Math.random() * 6) + 1,
      reel2: Math.floor(Math.random() * 6) + 1,
      reel3: Math.floor(Math.random() * 6) + 1,
      payout: '0',
      payoutType: 'LOSE'
    };
    
    // Calculate payout based on the result
    if (result.reel1 === result.reel2 && result.reel2 === result.reel3) {
      // Triple match
      switch (result.reel1) {
        case 6: // JACKPOT
          result.payout = '6660';
          result.payoutType = 'JACKPOT';
          break;
        case 5: // ROCKET
          result.payout = '5550';
          result.payoutType = 'ULTRA WIN';
          break;
        case 4: // DIAMOND
          result.payout = '4440';
          result.payoutType = 'MEGA WIN';
          break;
        case 3: // PUMP
          result.payout = '3330';
          result.payoutType = 'BIG WIN';
          break;
        case 2: // COPE
          result.payout = '2220';
          result.payoutType = 'MEDIUM WIN';
          break;
        case 1: // DUMP
          result.payout = '1110';
          result.payoutType = 'SMALL WIN';
          break;
      }
    } else if (result.reel1 === 5 && result.reel2 === 5) {
      // Special ROCKET pair
      result.payout = '1000';
      result.payoutType = 'ROCKET SPECIAL';
    } else if (result.reel1 === result.reel2 || result.reel2 === result.reel3 || result.reel1 === result.reel3) {
      // Pair match
      result.payout = '500';
      result.payoutType = 'PAIR WIN';
    }
    
    console.log(`🎮 SPIN START with new random values: [${result.reel1}, ${result.reel2}, ${result.reel3}]`);
    
    // IMMEDIATELY update the reels property so the component gets the new values
    setState(prev => ({
      ...prev,
      lockLever: true,
      spin1: true,
      spin2: true,
      spin3: true,
      reels: [result.reel1, result.reel2, result.reel3], // CRUCIAL UPDATE HERE
      displayLCD: "Spinning...",
      manualResult: result
    }));

    // Stop reel 1 after 1 second
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        spin1: false,
        displayLCD: "Reel 1 stopped..."
      }));
    }, 1000);

    // Stop reel 2 after 2 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        spin2: false,
        displayLCD: "Reel 2 stopped..."
      }));
    }, 2000);

    // Stop reel 3 after 3 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        spin3: false,
        displayLCD: `${result.payoutType}! ${result.payout} CHIPS`,
        lastResult: {
          reels: [result.reel1, result.reel2, result.reel3],
          payout: result.payout,
          payoutType: result.payoutType
        }
      }));

      // Show result for 3 seconds, then reset
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          lockLever: false,
          displayLCD: "Ready for next spin!",
          manualResult: null
        }));
      }, 3000);
    }, 3000);

  }, [state.lockLever]);

  // Handle transaction states (only in real mode)
  useEffect(() => {
    if (!isRealMode) return;
    
    if (approveHash) {
      setState(prev => ({ ...prev, approveTransactionID: approveHash }));
    }
  }, [approveHash, isRealMode]);

  useEffect(() => {
    if (!isRealMode) return;
    
    if (buyHash) {
      setState(prev => ({ ...prev, buyChipTransactionID: buyHash }));
    }
  }, [buyHash, isRealMode]);

  useEffect(() => {
    if (!isRealMode) return;
    
    if (spinHash) {
      setState(prev => ({ ...prev, spinTransactionID: spinHash }));
    }
  }, [spinHash, isRealMode]);

  // Improve the real mode simulation to ensure different results each time
  useEffect(() => {
    if (!isRealMode || !spinSuccess || !state.spinTransactionID) return;
    
    // Generate truly random reels right now
    const randomReels = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    
    console.log(`🎮 REAL MODE: Generated fresh random reels: [${randomReels.join(', ')}]`);
    
    // IMMEDIATELY update the reels in state so component sees them
    setState(prev => ({
      ...prev,
      reels: randomReels,
      spin1: true,
      spin2: true,
      spin3: true,
      lockLever: true,
      displayLCD: "Spinning..."
    }));

    // Simulate VRF delay and reel stopping sequence
    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        spin1: false,
        displayLCD: "Reel 1 stopped..." 
      }));
    }, 1000);

    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        spin2: false,
        displayLCD: "Reel 2 stopped..." 
      }));
    }, 2000);

    setTimeout(() => {
      // After state update, read the latest state for result calculation
      setTimeout(() => {
        setState(prev => {
          // Calculate result based on reels
          const resultReels = prev.reels;
          
          // Check for wins
          let isWin = false;
          let payout = '0';
          let payoutType = 'LOSE';
          
          // Triple match
          if (resultReels[0] === resultReels[1] && resultReels[1] === resultReels[2]) {
            isWin = true;
            
            switch (resultReels[0]) {
              case 6: // JACKPOT
                payout = '6660';
                payoutType = 'JACKPOT';
                break;
              case 5: // ROCKET
                payout = '5550';
                payoutType = 'ULTRA WIN';
                break;
              case 4: // DIAMOND
                payout = '4440';
                payoutType = 'MEGA WIN';
                break;
              case 3: // PUMP
                payout = '3330';
                payoutType = 'BIG WIN';
                break;
              case 2: // COPE
                payout = '2220';
                payoutType = 'MEDIUM WIN';
                break;
              case 1: // DUMP
                payout = '1110';
                payoutType = 'SMALL WIN';
                break;
            }
          } 
          // Rocket special
          else if (resultReels[0] === 5 && resultReels[1] === 5) {
            isWin = true;
            payout = '1000';
            payoutType = 'ROCKET SPECIAL';
          }
          // Any pair
          else if (resultReels[0] === resultReels[1] || resultReels[1] === resultReels[2] || resultReels[0] === resultReels[2]) {
            isWin = true;
            payout = '500';
            payoutType = 'PAIR WIN';
          }
          
          return {
            ...prev,
            spin3: false,
            lockLever: false,
            displayLCD: isWin ? `${payoutType}! ${payout} CHIPS` : "Try again!",
            lastResult: {
              reels: resultReels,
              payout: payout,
              payoutType: payoutType
            }
          };
        });
      }, 100);

      // Reset after showing result
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          displayLCD: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
          spinTransactionID: null
        }));
      }, 3000);
    }, 3000);
  }, [spinSuccess, state.spinTransactionID, isRealMode]);

  // Lever callback function with improved randomization
  const callbackOnLever = useCallback(async () => {
    // Generate new random values right away to ensure freshness
    const freshRandomValues = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    
    console.log(`🎮 LEVER CALLBACK: Generated fresh random values: [${freshRandomValues.join(', ')}]`);
    
    // First update reels immediately to ensure values change
    setState(prev => ({
      ...prev,
      reels: freshRandomValues
    }));
    
    // In manual mode, perform manual spin
    if (isManualMode) {
      await performManualSpin();
      return;
    }

    // Real mode logic (existing smart contract logic)
    if (!isConnected) {
      setState(prev => ({ ...prev, displayLCD: "Connect wallet first!" }));
      return;
    }

    if (state.lockLever) {
      setState(prev => ({ ...prev, displayLCD: "Please wait..." }));
      return;
    }

    if (!state.betAmount || parseFloat(state.betAmount) <= 0) {
      setState(prev => ({ ...prev, displayLCD: "Enter bet amount first!" }));
      toast.error('Please enter a valid bet amount');
      return;
    }

    if (!chipBalance || chipBalance < parseEther(state.betAmount)) {
      setState(prev => ({ ...prev, displayLCD: "Insufficient CHIP balance!" }));
      toast.error('Insufficient CHIP balance');
      return;
    }

    // Check if approval is needed
    const needsApproval = !chipAllowance || chipAllowance < parseEther(state.betAmount);
    if (needsApproval) {
      setState(prev => ({ ...prev, displayLCD: "Approve CHIPS first!" }));
      toast.error('Please approve CHIPS first');
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        lockLever: true,
        displayLCD: "Submitting spin..."
      }));

      await spinSlots({
        address: addresses.DEGEN_SLOTS,
        abi: DegenSlotsABI,
        functionName: 'spin',
        args: [parseEther(state.betAmount)],
      });

      toast.success('Spin requested!');
    } catch (error) {
      console.error('Spin error:', error);
      setState(prev => ({ 
        ...prev, 
        lockLever: false,
        displayLCD: "Spin failed. Try again!"
      }));
      toast.error('Failed to spin');
    }
  }, [isManualMode, performManualSpin, isConnected, state.lockLever, state.betAmount, chipBalance, chipAllowance, addresses, spinSlots]);

  // Approve chips function (only in real mode)
  const approveChipsForPlay = useCallback(async () => {
    if (!isConnected || !isRealMode) return;

    try {
      await approveChips({
        address: addresses.CHIP_TOKEN,
        abi: ChipTokenABI,
        functionName: 'approve',
        args: [addresses.DEGEN_SLOTS, parseEther('999999999')], // Max approval
      });
      
      setState(prev => ({ ...prev, displayLCD: "Approving CHIPS..." }));
      toast.success('Approving CHIPS...');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve CHIPS');
    }
  }, [isConnected, isRealMode, addresses, approveChips]);

  // Buy chips function (only in real mode)
  const buyChipsWithETH = useCallback(async (ethAmount: string) => {
    if (!isConnected || !ethAmount || !isRealMode) return;

    try {
      await buyChips({
        address: addresses.DEGEN_SLOTS,
        abi: DegenSlotsABI,
        functionName: 'buyChips',
        value: parseEther(ethAmount),
      });
      
      setState(prev => ({ ...prev, displayLCD: "Buying CHIPS..." }));
      toast.success('Buying CHIPS...');
    } catch (error) {
      console.error('Buy chips error:', error);
      toast.error('Failed to buy CHIPS');
    }
  }, [isConnected, isRealMode, addresses, buyChips]);

  return {
    // State
    ...state,
    
    // Computed values
    isSpinning: state.spin1 || state.spin2 || state.spin3,
    needsApproval: isRealMode ? (!chipAllowance || (state.betAmount && chipAllowance < parseEther(state.betAmount))) : false,
    hasChips: isRealMode ? (chipBalance && chipBalance > 0n) : true, // Always true in manual mode
    
    // Contract data (only meaningful in real mode)
    chipBalance: isRealMode ? chipBalance : BigInt(10000), // Mock balance in manual mode
    chipAllowance: isRealMode ? chipAllowance : BigInt(999999999), // Mock allowance in manual mode
    
    // Loading states
    isApproving: isRealMode ? (isApproving || approveTxLoading) : false,
    isBuying: isRealMode ? (isBuying || buyTxLoading) : false,
    isSpinningTx: isRealMode ? (isSpinning || spinTxLoading) : false,
    
    // Actions
    callbackOnLever,
    approveChipsForPlay,
    buyChipsWithETH,
    setBetAmount: (amount: string) => setState(prev => ({ ...prev, betAmount: amount })),
    
    // Utils
    refetchChipBalance,
    
    // Manual mode specific
    performManualSpin,
    manualResult: state.manualResult,
  };
} 