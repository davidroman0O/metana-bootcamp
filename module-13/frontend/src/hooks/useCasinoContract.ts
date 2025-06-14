import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useBalance } from 'wagmi';
import { formatEther, parseEther, type Address } from 'viem';
import { CasinoSlotABI, getDeployment } from '../config/contracts';
import toast from 'react-hot-toast';

// Get contract address for hardhat dev environment
const CASINO_SLOT_ADDRESS = getDeployment('hardhat', 'dev').addresses.CASINO_SLOT as Address;

// Types
interface TransactionState {
  hash?: `0x${string}`;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
}

interface PlayerStats {
  chipBalance: bigint;
  ethBalance: bigint;
  winnings: bigint;
  totalSpins: bigint;
  totalWon: bigint;
}

interface GameStats {
  prizePool: bigint;
  houseEdge: bigint;
  ethPrice: string;
  chipRate: string;
}

interface SpinCosts {
  reels3: bigint;
  reels4: bigint;
  reels5: bigint;
  reels6: bigint;
  reels7: bigint;
}

interface SpinResult {
  requestId: bigint;
  reelCount: number;
  symbols: number[];
  payoutType: number;
  payout: bigint;
}

// Main hook
export function useCasinoContract() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Core states
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    chipBalance: 0n,
    ethBalance: 0n,
    winnings: 0n,
    totalSpins: 0n,
    totalWon: 0n,
  });
  
  const [gameStats, setGameStats] = useState<GameStats>({
    prizePool: 0n,
    houseEdge: 0n,
    ethPrice: '$0',
    chipRate: '0',
  });
  
  const [spinCosts, setSpinCosts] = useState<SpinCosts>({
    reels3: 0n,
    reels4: 0n,
    reels5: 0n,
    reels6: 0n,
    reels7: 0n,
  });
  
  // Transaction states
  const [buyChipsState, setBuyChipsState] = useState<TransactionState>({ status: 'idle' });
  const [spinState, setSpinState] = useState<TransactionState>({ status: 'idle' });
  const [withdrawState, setWithdrawState] = useState<TransactionState>({ status: 'idle' });
  
  // Spin tracking
  const [pendingSpins, setPendingSpins] = useState<Map<bigint, { reelCount: number; betAmount: bigint }>>(new Map());
  const [latestSpinResult, setLatestSpinResult] = useState<SpinResult | null>(null);
  
  // Approval states
  const [selectedReelCount, setSelectedReelCount] = useState<3 | 4 | 5 | 6 | 7>(3);
  const [chipsToApprove, setChipsToApprove] = useState<bigint>(0n);
  const [currentAllowance, setCurrentAllowance] = useState<bigint>(0n);
  
  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refs for preventing duplicate calls
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Helper function to handle transaction execution
  const executeTransaction = useCallback(async (
    setTxState: (state: TransactionState) => void,
    operation: () => Promise<`0x${string}`>,
    successMessage: string = 'Transaction successful'
  ) => {
    if (!walletClient || !address) {
      toast.error('Wallet not connected');
      return null;
    }
    
    try {
      setTxState({ status: 'pending' });
      
      const hash = await operation();
      setTxState({ status: 'pending', hash });
      
      // Wait for transaction receipt
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      
      if (receipt?.status === 'success') {
        setTxState({ status: 'success', hash });
        toast.success(successMessage);
        
        // Refresh data after successful transaction
        setTimeout(() => refreshAllData(), 1000);
        
        return hash;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Transaction error:', error);
      const errorMessage = error.message || 'Transaction failed';
      setTxState({ status: 'error', error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [walletClient, address, publicClient]);
  
  // Fetch all contract data
  const refreshAllData = useCallback(async () => {
    if (!publicClient || !isConnected || !address) return;
    
    setIsRefreshing(true);
    
    try {
      // Get player stats
      const stats = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getPlayerStats',
        args: [address],
      }) as readonly [bigint, bigint, bigint, bigint];
      
      // Get game stats  
      const gameStatsResult = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getGameStats',
      }) as readonly [bigint, bigint, Address];
      
      // Get pool stats for rates
      const poolStats = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getPoolStats',
      }) as readonly [bigint, bigint, bigint];
      
      // Get ETH balance
      const ethBalance = await publicClient.getBalance({ address });
      
      // Get current allowance
      const allowance = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'allowance',
        args: [address, CASINO_SLOT_ADDRESS],
      }) as bigint;
      
      // Update states
      setPlayerStats({
        chipBalance: stats[0],
        ethBalance,
        winnings: stats[1],
        totalSpins: stats[2],
        totalWon: stats[3],
      });
      
      setGameStats({
        prizePool: gameStatsResult[0],
        houseEdge: gameStatsResult[1],
        ethPrice: `$${(Number(poolStats[2]) / 100).toFixed(0)}`,
        chipRate: (Number(poolStats[2]) * 5).toFixed(0), // 5 CHIPS per USD
      });
      
      setCurrentAllowance(allowance);
      
    } catch (error) {
      console.error('Error fetching contract data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, isConnected, address]);
  
  // Get spin costs
  const refreshSpinCosts = useCallback(async () => {
    if (!publicClient) return;
    
    try {
      const costs = await Promise.all([
        publicClient.readContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'getSpinCost',
          args: [3],
        }),
        publicClient.readContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'getSpinCost',
          args: [4],
        }),
        publicClient.readContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'getSpinCost',
          args: [5],
        }),
        publicClient.readContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'getSpinCost',
          args: [6],
        }),
        publicClient.readContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'getSpinCost',
          args: [7],
        }),
      ]) as bigint[];
      
      setSpinCosts({
        reels3: costs[0],
        reels4: costs[1],
        reels5: costs[2],
        reels6: costs[3],
        reels7: costs[4],
      });
    } catch (error) {
      console.error('Error fetching spin costs:', error);
    }
  }, [publicClient]);
  
  // Contract interaction functions
  
  // Buy CHIPS with ETH
  const buyChips = useCallback(async (ethAmount: string) => {
    const ethValue = parseEther(ethAmount);
    
    return executeTransaction(
      setBuyChipsState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'buyChips',
          value: ethValue,
        });
      },
      `Successfully bought CHIPS with ${ethAmount} ETH`
    );
  }, [executeTransaction, walletClient]);
  
  // Approve CHIPS spending
  const approveChips = useCallback(async (amount: bigint) => {
    return executeTransaction(
      setSpinState, // Use spin state since approval is part of spin flow
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'approve',
          args: [CASINO_SLOT_ADDRESS, amount],
        });
      },
      `Approved ${formatEther(amount)} CHIPS for spending`
    );
  }, [executeTransaction, walletClient]);
  
  // Spin reels
  const spinReels = useCallback(async (reelCount: 3 | 4 | 5 | 6 | 7) => {
    const functionName = `spin${reelCount}Reels` as const;
    
    return executeTransaction(
      setSpinState,
      async () => {
        const hash = await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName,
        });
        
        // Track pending spin
        const cost = spinCosts[`reels${reelCount}` as keyof SpinCosts];
        
        // Note: We'll get the actual requestId from the event logs
        // For now, just track by hash
        
        return hash;
      },
      `Started ${reelCount}-reel spin!`
    );
  }, [executeTransaction, walletClient, spinCosts]);
  
  // Withdraw winnings
  const withdrawWinnings = useCallback(async () => {
    return executeTransaction(
      setWithdrawState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'withdrawWinnings',
        });
      },
      'Winnings withdrawn successfully'
    );
  }, [executeTransaction, walletClient]);
  
  // Helper functions
  
  // Check if user can spin with current reel count
  const canSpin = useCallback(() => {
    const cost = spinCosts[`reels${selectedReelCount}` as keyof SpinCosts];
    return playerStats.chipBalance >= cost && currentAllowance >= cost;
  }, [playerStats.chipBalance, currentAllowance, selectedReelCount, spinCosts]);
  
  // Get current spin cost
  const getCurrentSpinCost = useCallback(() => {
    return spinCosts[`reels${selectedReelCount}` as keyof SpinCosts];
  }, [selectedReelCount, spinCosts]);
  
  // Calculate expected CHIPS from ETH
  const calculateExpectedChips = useCallback((ethAmount: string) => {
    try {
      const eth = parseFloat(ethAmount);
      const ethPriceUSD = parseFloat(gameStats.ethPrice.replace('$', ''));
      return Math.floor(eth * ethPriceUSD * 5); // 5 CHIPS per USD
    } catch {
      return 0;
    }
  }, [gameStats.ethPrice]);
  
  // Set chips to approve for selected reel count
  const setChipsForCurrentSpin = useCallback(() => {
    const cost = getCurrentSpinCost();
    setChipsToApprove(cost);
  }, [getCurrentSpinCost]);

  // Initial data loading
  useEffect(() => {
    if (isConnected && address) {
      setIsLoadingData(true);
      Promise.all([
        refreshAllData(),
        refreshSpinCosts(),
      ]).finally(() => {
        setIsLoadingData(false);
      });
    }
  }, [isConnected, address, refreshAllData, refreshSpinCosts]);
  
  // Auto-refresh on interval
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      refreshAllData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, refreshAllData]);
  
  // Event listener for spin results (simplified for now)
  useEffect(() => {
    if (!publicClient || !isConnected) return;
    
    // TODO: Set up event listeners for SpinResult events
    // This would update latestSpinResult when VRF completes
    
  }, [publicClient, isConnected]);
  
  return {
    // Data states
    playerStats,
    gameStats,
    spinCosts,
    isLoadingData,
    isRefreshing,
    
    // Transaction states
    buyChipsState,
    spinState,
    withdrawState,
    
    // Spin management
    selectedReelCount,
    setSelectedReelCount,
    chipsToApprove,
    setChipsToApprove,
    currentAllowance,
    latestSpinResult,
    
    // Contract functions
    buyChips,
    approveChips,
    spinReels,
    withdrawWinnings,
    
    // Helper functions
    canSpin,
    getCurrentSpinCost,
    calculateExpectedChips,
    setChipsForCurrentSpin,
    refreshAllData,
    
    // Connection state
    isConnected,
    address,
  };
} 