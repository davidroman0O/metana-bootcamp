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
  borrowedAmount: bigint;
  accountLiquidity: bigint;
  userCollateralETH: bigint;
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

interface CompoundPosition {
  contractCEthBalance: bigint;
  exchangeRate: bigint;
  underlyingETH: bigint;
  totalCollateralETH: bigint;
  collateralFactor: bigint;
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
    borrowedAmount: 0n,
    accountLiquidity: 0n,
    userCollateralETH: 0n,
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

  const [compoundPosition, setCompoundPosition] = useState<CompoundPosition>({
    contractCEthBalance: 0n,
    exchangeRate: 0n,
    underlyingETH: 0n,
    totalCollateralETH: 0n,
    collateralFactor: 0n,
  });
  
  // Transaction states
  const [buyChipsState, setBuyChipsState] = useState<TransactionState>({ status: 'idle' });
  const [spinState, setSpinState] = useState<TransactionState>({ status: 'idle' });
  const [withdrawState, setWithdrawState] = useState<TransactionState>({ status: 'idle' });
  const [depositCollateralState, setDepositCollateralState] = useState<TransactionState>({ status: 'idle' });
  const [borrowChipsState, setBorrowChipsState] = useState<TransactionState>({ status: 'idle' });
  const [repayLoanState, setRepayLoanState] = useState<TransactionState>({ status: 'idle' });
  const [withdrawCollateralState, setWithdrawCollateralState] = useState<TransactionState>({ status: 'idle' });
  
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
      }) as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
      
      // Get user's collateral balance
      const userCollateral = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'userCollateralETH',
        args: [address],
      }) as bigint;
      
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

      // Get compound position
      const compoundPos = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getCompoundPosition',
      }) as readonly [bigint, bigint, bigint];

      // Get total collateral and collateral factor
      const totalCollateral = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'totalCollateralETH',
      }) as bigint;

      const collateralFactor = await publicClient.readContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'collateralFactor',
      }) as bigint;
      
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
        borrowedAmount: stats[4],
        accountLiquidity: stats[5],
        userCollateralETH: userCollateral,
      });
      
      setGameStats({
        prizePool: gameStatsResult[0],
        houseEdge: gameStatsResult[1],
        ethPrice: `$${(Number(poolStats[2]) / 100).toFixed(0)}`,
        chipRate: (Number(poolStats[2]) * 5).toFixed(0), // 5 CHIPS per USD
      });

      setCompoundPosition({
        contractCEthBalance: compoundPos[0],
        exchangeRate: compoundPos[1],
        underlyingETH: compoundPos[2],
        totalCollateralETH: totalCollateral,
        collateralFactor: collateralFactor,
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
  
  // Compound integration functions
  
  // Deposit collateral
  const depositCollateral = useCallback(async (ethAmount: string) => {
    const ethValue = parseEther(ethAmount);
    
    return executeTransaction(
      setDepositCollateralState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'depositCollateral',
          value: ethValue,
        });
      },
      `Deposited ${ethAmount} ETH as collateral`
    );
  }, [executeTransaction, walletClient]);
  
  // Borrow CHIPS
  const borrowChips = useCallback(async (ethAmount: string) => {
    const ethValue = parseEther(ethAmount);
    
    return executeTransaction(
      setBorrowChipsState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'borrowChips',
          args: [ethValue],
        });
      },
      `Borrowed CHIPS equivalent to ${ethAmount} ETH`
    );
  }, [executeTransaction, walletClient]);
  
  // Repay loan with CHIPS
  const repayLoan = useCallback(async (chipAmount: string) => {
    const chipValue = parseEther(chipAmount);
    
    return executeTransaction(
      setRepayLoanState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'repayLoan',
          args: [chipValue],
        });
      },
      `Repaid ${chipAmount} CHIPS`
    );
  }, [executeTransaction, walletClient]);
  
  // Repay loan with ETH directly
  const repayLoanWithETH = useCallback(async (ethAmount: string) => {
    const ethValue = parseEther(ethAmount);
    
    return executeTransaction(
      setRepayLoanState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'repayLoanWithETH',
          value: ethValue,
        });
      },
      `Repaid ${ethAmount} ETH`
    );
  }, [executeTransaction, walletClient]);

  // NEW: Withdraw collateral (must repay loans first)
  const withdrawCollateral = useCallback(async (ethAmount: string) => {
    const ethValue = parseEther(ethAmount);
    
    return executeTransaction(
      setWithdrawCollateralState,
      async () => {
        return await walletClient!.writeContract({
          address: CASINO_SLOT_ADDRESS,
          abi: CasinoSlotABI,
          functionName: 'withdrawCollateral',
          args: [ethValue],
        });
      },
      `Withdrew ${ethAmount} ETH collateral`
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

  // NEW: Check if user can withdraw collateral (no outstanding loans)
  const canWithdrawCollateral = useCallback(() => {
    return playerStats.borrowedAmount === 0n && playerStats.userCollateralETH > 0n;
  }, [playerStats.borrowedAmount, playerStats.userCollateralETH]);

  // NEW: Calculate collateralization ratio
  const getCollateralizationRatio = useCallback(() => {
    if (playerStats.userCollateralETH === 0n || playerStats.borrowedAmount === 0n) {
      return 0;
    }
    const collateralValue = Number(formatEther(playerStats.userCollateralETH));
    const debtValue = Number(formatEther(playerStats.borrowedAmount));
    return (collateralValue / debtValue) * 100;
  }, [playerStats.userCollateralETH, playerStats.borrowedAmount]);

  // NEW: Get liquidation risk level
  const getLiquidationRisk = useCallback(() => {
    const ratio = getCollateralizationRatio();
    if (ratio === 0) return { level: 'NONE', color: 'text-gray-400', percentage: 0 };
    if (ratio < 120) return { level: 'CRITICAL', color: 'text-red-400', percentage: 95 };
    if (ratio < 150) return { level: 'HIGH', color: 'text-orange-400', percentage: 75 };
    if (ratio < 200) return { level: 'MEDIUM', color: 'text-yellow-400', percentage: 50 };
    return { level: 'LOW', color: 'text-green-400', percentage: 25 };
  }, [getCollateralizationRatio]);
  
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
    compoundPosition,
    isLoadingData,
    isRefreshing,
    
    // Transaction states
    buyChipsState,
    spinState,
    withdrawState,
    depositCollateralState,
    borrowChipsState,
    repayLoanState,
    withdrawCollateralState,
    
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
    
    // Compound functions
    depositCollateral,
    borrowChips,
    repayLoan,
    repayLoanWithETH,
    withdrawCollateral,
    
    // Helper functions
    canSpin,
    getCurrentSpinCost,
    calculateExpectedChips,
    setChipsForCurrentSpin,
    canWithdrawCollateral,
    getCollateralizationRatio,
    getLiquidationRisk,
    refreshAllData,
    
    // Connection state
    isConnected,
    address,
  };
} 