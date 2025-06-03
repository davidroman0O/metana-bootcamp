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
  // UI state
  displayLCD: string;
  betAmount: string;
  
  // Transaction IDs (only used in real mode)
  buyChipTransactionID: string | null;
  approveTransactionID: string | null;
  spinTransactionID: string | null;
  
  // Game results
  lastResult: {
    symbols: number[];
    payout: number;
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

export function useSlotMachine(chainId: number | undefined) {
  const { address: account, isConnected } = useAccount();
  const { isRealMode, isManualMode } = useAppMode();
  
  // State management
  const [state, setState] = useState<SlotMachineState>({
    displayLCD: isManualMode ? "Manual mode - Ready to play!" : (isConnected ? "Ready to play!" : "Connect wallet to play"),
    betAmount: '1000',
    buyChipTransactionID: null,
    approveTransactionID: null,
    spinTransactionID: null,
    lastResult: null
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
        displayLCD: "Manual mode - Ready to play!"
      }));
    } else {
      setState(prev => ({
        ...prev,
        displayLCD: isConnected ? "Ready to play!" : "Connect wallet to play"
      }));
    }
  }, [isManualMode, isConnected]);

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

  // Handle spin results in real mode
  useEffect(() => {
    if (!isRealMode || !spinSuccess || !state.spinTransactionID) return;
    
    // In real mode, the actual result would come from the contract event
    // For now, we'll simulate it
    const mockResult = {
      symbols: [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ],
      payout: 0,
      payoutType: 'LOSE'
    };
    
    // Simple win calculation
    if (mockResult.symbols[0] === mockResult.symbols[1] && mockResult.symbols[1] === mockResult.symbols[2]) {
      mockResult.payout = mockResult.symbols[0] * 1000;
      mockResult.payoutType = 'TRIPLE';
    }
    
    setState(prev => ({
      ...prev,
      lastResult: mockResult,
      displayLCD: mockResult.payout > 0 ? `WIN! ${mockResult.payout} CHIPS!` : "Try again!",
      spinTransactionID: null
    }));

    // Reset message after delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        displayLCD: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
      }));
    }, 3000);
  }, [spinSuccess, state.spinTransactionID, isRealMode]);

  // Spin function for real mode
  const performRealSpin = useCallback(async (): Promise<number[] | null> => {
    if (!isConnected) {
      setState(prev => ({ ...prev, displayLCD: "Connect wallet first!" }));
      return null;
    }

    if (!state.betAmount || parseFloat(state.betAmount) <= 0) {
      setState(prev => ({ ...prev, displayLCD: "Enter bet amount first!" }));
      toast.error('Please enter a valid bet amount');
      return null;
    }

    if (!chipBalance || chipBalance < parseEther(state.betAmount)) {
      setState(prev => ({ ...prev, displayLCD: "Insufficient CHIP balance!" }));
      toast.error('Insufficient CHIP balance');
      return null;
    }

    // Check if approval is needed
    const needsApproval = !chipAllowance || chipAllowance < parseEther(state.betAmount);
    if (needsApproval) {
      setState(prev => ({ ...prev, displayLCD: "Approve CHIPS first!" }));
      toast.error('Please approve CHIPS first');
      return null;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        displayLCD: "Submitting spin..."
      }));

      await spinSlots({
        address: addresses.DEGEN_SLOTS,
        abi: DegenSlotsABI,
        functionName: 'spin',
        args: [parseEther(state.betAmount)],
      });

      toast.success('Spin requested!');
      return null; // Real result comes from contract event
    } catch (error) {
      console.error('Spin error:', error);
      setState(prev => ({ 
        ...prev, 
        displayLCD: "Spin failed. Try again!"
      }));
      toast.error('Failed to spin');
      return null;
    }
  }, [isConnected, state.betAmount, chipBalance, chipAllowance, addresses, spinSlots]);

  // Manual spin function
  const performManualSpin = useCallback(async (): Promise<number[] | null> => {
    // Generate random targets for manual mode
    const targets = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    
    console.log(`🎮 Manual mode spin with targets: [${targets.join(', ')}]`);
    
    // Update display
    setState(prev => ({ ...prev, displayLCD: "Manual spin started..." }));
    
    return targets;
  }, []);

  // Main spin callback
  const callbackOnLever = useCallback(async (): Promise<number[] | null> => {
    if (isRealMode) {
      return await performRealSpin();
    } else {
      return await performManualSpin();
    }
  }, [isRealMode, performRealSpin, performManualSpin]);

  // Result handler
  const handleSlotResult = useCallback((symbols: number[], payout: number, payoutType: string) => {
    console.log(`🎰 Slot result: [${symbols.join(', ')}], payout: ${payout}, type: ${payoutType}`);
    
    setState(prev => ({
      ...prev,
      lastResult: { symbols, payout, payoutType },
      displayLCD: payout > 0 ? `${payoutType}! ${payout} CHIPS!` : "No win this time..."
    }));
    
    // Reset message after delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        displayLCD: isRealMode ? "Ready for next spin!" : "Manual mode - Ready to play!"
      }));
    }, 3000);
  }, [isRealMode]);

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
    handleSlotResult,
    approveChipsForPlay,
    buyChipsWithETH,
    setBetAmount: (amount: string) => setState(prev => ({ ...prev, betAmount: amount })),
    
    // Utils
    refetchChipBalance,
  };
} 