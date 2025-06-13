import { useState, useCallback, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import toast from 'react-hot-toast';
import type { Address } from 'viem';
import { useAppMode } from '../contexts/AppModeContext';
import { useTransactionTracker } from './useTransactionTracker';

// Config imports
import { CONTRACT_ADDRESSES } from '../config/wagmi';
import { CasinoSlotABI } from '../config/contracts/CasinoSlotABI';

interface SlotMachineState {
  // UI state
  displayLCD: string;
  betAmount: string;
  
  // Transaction IDs (only used in real mode)
  approveTransactionID: string | null;
  spinTransactionID: string | null;
  
  // Buy chips tracking
  lastBuyEthAmount?: string;
  
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
  
  // Transaction tracking for buy chips
  const {
    hasActiveBuyTransaction,
    isWaitingForReceipt,
    addTransaction,
    currentTransaction,
    currentTransactionEthAmount,
    currentTransactionHash,
    currentTransactionStatus,
    clearTransaction,
    retryTransaction
  } = useTransactionTracker(account, chainId);
  
  // State management
  const [state, setState] = useState<SlotMachineState>({
    displayLCD: isManualMode ? "Manual mode - Ready to play!" : (isConnected ? "Ready to play!" : "Connect wallet to play"),
    betAmount: '1000',
    approveTransactionID: null,
    spinTransactionID: null,
    lastResult: null
  });

  // Contract addresses (only used in real mode)
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};

  // Contract reads (only active in real mode)
  const { data: chipBalance, refetch: refetchChipBalance, error: chipBalanceError, isLoading: chipBalanceLoading } = useReadContract({
    address: addresses.CASINO_SLOT,
    abi: CasinoSlotABI,
    functionName: 'balanceOf',
    args: [account!],
    query: { enabled: !!account && !!addresses.CASINO_SLOT },
  });

  const { data: chipAllowance } = useReadContract({
    address: addresses.CASINO_SLOT,
    abi: CasinoSlotABI,
    functionName: 'allowance',
    args: [account!, addresses.CASINO_SLOT],
    query: { enabled: !!account && !!addresses.CASINO_SLOT },
  });

  // Debug chipBalance hook
  useEffect(() => {
    console.log('🪙 CHIPS Balance Debug:', {
      account,
      contractAddress: addresses.CASINO_SLOT,
      chipBalance: chipBalance ? chipBalance.toString() : 'null/undefined',
      chipBalanceError: chipBalanceError?.message || 'none',
      chipBalanceLoading,
      enabled: !!account && !!addresses.CASINO_SLOT
    });
  }, [chipBalance, chipBalanceError, chipBalanceLoading, account, addresses.CASINO_SLOT]);

  // Contract writes (only used in real mode)
  const { writeContract: approveChips, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: spinSlots, data: spinHash, isPending: isSpinning } = useWriteContract();
  const { writeContract: buyChips, data: buyChipsHash, isPending: isBuyingTransaction } = useWriteContract();

  // Transaction receipts (only used in real mode for non-buy transactions)
  const { isLoading: approveTxLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: spinTxLoading, isSuccess: spinSuccess } = useWaitForTransactionReceipt({ hash: spinHash });

  // Auto-refresh balance when transaction succeeds
  useEffect(() => {
    if (currentTransactionStatus === 'success') {
      console.log('🔄 Transaction successful! Refreshing CHIPS balance...');
      refetchChipBalance?.();
    }
  }, [currentTransactionStatus, refetchChipBalance]);

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
    if (approveHash) {
      setState(prev => ({ ...prev, approveTransactionID: approveHash }));
    }
  }, [approveHash]);

  useEffect(() => {
    if (spinHash) {
      setState(prev => ({ ...prev, spinTransactionID: spinHash }));
    }
  }, [spinHash]);

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

  // Handle buy chips transaction hash when it becomes available
  useEffect(() => {
    if (buyChipsHash && !hasActiveBuyTransaction) {
      // Add the transaction to tracker when hash becomes available
      const ethAmountFromLastCall = state.lastBuyEthAmount;
      if (ethAmountFromLastCall) {
        const transaction = addTransaction(buyChipsHash, ethAmountFromLastCall);
        if (transaction) {
          setState(prev => ({ 
            ...prev, 
            displayLCD: `Transaction submitted: ${buyChipsHash.slice(0, 10)}...`,
            lastBuyEthAmount: undefined 
          }));
          toast.success('CHIPS purchase submitted! Waiting for confirmation...');
        }
      }
    }
  }, [buyChipsHash, hasActiveBuyTransaction, addTransaction, state.lastBuyEthAmount]);

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
        address: addresses.CASINO_SLOT,
        abi: CasinoSlotABI,
        functionName: 'spin3Reels',
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
    if (!isConnected) return;

    try {
      await approveChips({
        address: addresses.CASINO_SLOT,
        abi: CasinoSlotABI,
        functionName: 'approve',
        args: [addresses.CASINO_SLOT, parseEther('999999999')], // Max approval
      });
      
      setState(prev => ({ ...prev, displayLCD: "Approving CHIPS..." }));
      toast.success('Approving CHIPS...');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve CHIPS');
    }
  }, [isConnected, addresses, approveChips]);

  // Buy chips function with transaction tracking
  const buyChipsWithETH = useCallback(async (ethAmount: string) => {
    if (!isConnected || !ethAmount) {
      console.log('❌ Buy chips conditions not met:', { isConnected, ethAmount });
      return;
    }

    if (hasActiveBuyTransaction) {
      toast.error('A CHIPS purchase is already in progress. Please wait...');
      return;
    }

    console.log('🪙 Attempting to buy CHIPS:', { ethAmount, contractAddress: addresses.CASINO_SLOT });

    try {
      setState(prev => ({ 
        ...prev, 
        displayLCD: "Submitting transaction...",
        lastBuyEthAmount: ethAmount 
      }));
      
      console.log('📝 Calling buyChips contract function...');
      
      // Submit the transaction - buyChips() takes no parameters, uses msg.value
      await buyChips({
        address: addresses.CASINO_SLOT as Address,
        abi: CasinoSlotABI,
        functionName: 'buyChips',
        value: parseEther(ethAmount), // ETH amount goes in value, not as parameter
      });
      
      console.log('✅ Buy CHIPS transaction request submitted');
      // Transaction hash will be available in buyChipsHash and handled by useEffect
      
    } catch (error) {
      console.error('❌ Buy chips error:', error);
      setState(prev => ({ 
        ...prev, 
        displayLCD: "Transaction failed!",
        lastBuyEthAmount: undefined 
      }));
      toast.error(`Failed to buy CHIPS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [isConnected, addresses, buyChips, hasActiveBuyTransaction]);

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
    isApproving: isApproving || approveTxLoading,
    isSpinningTx: isSpinning || spinTxLoading,
    isBuying: isBuyingTransaction || hasActiveBuyTransaction,
    
    // Transaction tracking
    hasActiveBuyTransaction,
    isWaitingForReceipt,
    currentTransaction,
    currentTransactionEthAmount,
    currentTransactionHash,
    currentTransactionStatus,
    clearTransaction,
    retryTransaction,
    
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