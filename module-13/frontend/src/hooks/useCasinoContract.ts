import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useBalance, useReadContract, useChainId, useWriteContract, useWatchContractEvent } from 'wagmi';
import { formatEther, parseEther, type Address, decodeEventLog } from 'viem';
import { CasinoSlotABI, getDeployment } from '../config/contracts';
import toast from 'react-hot-toast';

// Helper to get contract address based on current network
function getContractAddress(chainId: number | undefined): Address {
  if (chainId === 11155111) {
    // Sepolia
    return getDeployment('sepolia', 'dev').addresses.CASINO_SLOT as Address;
  } else if (chainId === 31337) {
    // Hardhat local
    return getDeployment('hardhat', 'dev').addresses.CASINO_SLOT as Address;
  } else {
    // Default to hardhat for unsupported chains
    return getDeployment('hardhat', 'dev').addresses.CASINO_SLOT as Address;
  }
}

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
  totalBet: bigint;
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
  player: Address;
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
  const chainId = useChainId();
  const CASINO_SLOT_ADDRESS = getContractAddress(chainId);
  
  // Transaction states
  const [buyChipsState, setBuyChipsState] = useState<TransactionState>({ status: 'idle' });
  const [spinState, setSpinState] = useState<TransactionState>({ status: 'idle' });
  const [withdrawState, setWithdrawState] = useState<TransactionState>({ status: 'idle' });
  
  // Spin tracking
  const [latestSpinResult, setLatestSpinResult] = useState<SpinResult | null>(null);
  
  // Approval states
  const [selectedReelCount, setSelectedReelCount] = useState<3 | 4 | 5 | 6 | 7>(3);
  
  // Refs for preventing duplicate calls
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const processedRequestIds = useRef(new Set<string>());

  const { data: ethBalanceResult } = useBalance({ address });

  // #region Contract Reads
  const { data: playerStatsResult, refetch: refetchPlayerStats } = useReadContract({
    address: CASINO_SLOT_ADDRESS,
    abi: CasinoSlotABI,
    functionName: 'getPlayerStats',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: gameStatsResult, refetch: refetchGameStats } = useReadContract({
    address: CASINO_SLOT_ADDRESS,
    abi: CasinoSlotABI,
    functionName: 'getGameStats',
    query: { enabled: isConnected },
  });

  const { data: poolStatsResult, refetch: refetchPoolStats } = useReadContract({
    address: CASINO_SLOT_ADDRESS,
    abi: CasinoSlotABI,
    functionName: 'getPoolStats',
    query: { enabled: isConnected },
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: CASINO_SLOT_ADDRESS,
    abi: CasinoSlotABI,
    functionName: 'allowance',
    args: [address!, CASINO_SLOT_ADDRESS],
    query: { enabled: !!address },
  });

  const { data: spinCosts3, refetch: refetchSpinCost3 } = useReadContract({
    address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [3], query: { enabled: isConnected },
  });
  const { data: spinCosts4, refetch: refetchSpinCost4 } = useReadContract({
    address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [4], query: { enabled: isConnected },
  });
  const { data: spinCosts5, refetch: refetchSpinCost5 } = useReadContract({
    address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [5], query: { enabled: isConnected },
  });
  const { data: spinCosts6, refetch: refetchSpinCost6 } = useReadContract({
    address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [6], query: { enabled: isConnected },
  });
  const { data: spinCosts7, refetch: refetchSpinCost7 } = useReadContract({
    address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [7], query: { enabled: isConnected },
  });

  const spinCosts: SpinCosts = {
    reels3: spinCosts3 ?? 0n,
    reels4: spinCosts4 ?? 0n,
    reels5: spinCosts5 ?? 0n,
    reels6: spinCosts6 ?? 0n,
    reels7: spinCosts7 ?? 0n,
  };

  const playerStats: PlayerStats = {
    chipBalance: playerStatsResult?.[0] ?? 0n,
    ethBalance: ethBalanceResult?.value ?? 0n,
    winnings: playerStatsResult?.[1] ?? 0n,
    totalSpins: playerStatsResult?.[2] ?? 0n,
    totalWon: playerStatsResult?.[3] ?? 0n,
    totalBet: playerStatsResult?.[4] ?? 0n,
  };

  const gameStats: GameStats = {
    prizePool: gameStatsResult?.[0] ?? 0n,
    houseEdge: gameStatsResult?.[1] ?? 0n,
    ethPrice: poolStatsResult ? `$${(Number(poolStatsResult[2]) / 100).toFixed(0)}` : '$0',
    chipRate: poolStatsResult ? (Number(poolStatsResult[2]) * 5).toFixed(0) : '0',
  };
  // #endregion

  const refreshAllData = useCallback(() => {
    refetchPlayerStats();
    refetchGameStats();
    refetchPoolStats();
    refetchAllowance();
    refetchSpinCost3();
    refetchSpinCost4();
    refetchSpinCost5();
    refetchSpinCost6();
    refetchSpinCost7();
  }, [refetchPlayerStats, refetchGameStats, refetchPoolStats, refetchAllowance, refetchSpinCost3, refetchSpinCost4, refetchSpinCost5, refetchSpinCost6, refetchSpinCost7]);

  // Handle SpinResult events with useWatchContractEvent hook
  const handleSpinResultEvents = useCallback((logs: any[]) => {
    if (!address) {
      console.log('No address available, ignoring SpinResult events');
      return;
    }

    console.log(`SpinResult event(s) received: ${logs.length} logs`);

    for (const log of logs) {
      // The log object from wagmi's watcher should have args pre-parsed
      if (!log.args) continue;

      const { requestId, player, reelCount, reels, payoutType, payout } = log.args as any;

      // Filter to current player only
      if (player?.toLowerCase() !== address.toLowerCase()) {
        continue;
      }

      // Use a Set to track processed request IDs for robust duplicate detection.
      const requestIdStr = requestId.toString();
      if (processedRequestIds.current.has(requestIdStr)) {
        console.log(`Skipping duplicate result for requestId ${requestIdStr}`);
        continue;
      }

      console.log('✅ Processing spin result for current user:', log.args);

      const result: SpinResult = {
        requestId,
        player,
        reelCount: Number(reelCount),
        symbols: Array.isArray(reels) ? reels.map((r: bigint) => Number(r)) : [],
        payoutType: Number(payoutType),
        payout,
      };

      // Store last processed id to avoid duplicates
      processedRequestIds.current.add(requestIdStr);

      // Update state with result
      setLatestSpinResult(result);
      
      // Reset spin state to success
      setSpinState({ status: 'success' });

      // Debounce the data refresh to avoid spamming RPC on multiple events
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Refreshing data after spin result...');
        refreshAllData();
      }, 500);
      
      // Do not break; process all logs in the batch.
    }
  }, [address, refreshAllData]);
  
  // Set up event listener using wagmi hook
  useWatchContractEvent({
    address: CASINO_SLOT_ADDRESS,
    abi: CasinoSlotABI,
    eventName: 'SpinResult',
    onLogs: handleSpinResultEvents,
    // Always enable the event listener when connected
    enabled: !!address,
    // Increase polling interval for better event detection
    pollingInterval: 1000,
  });
  
  // Generic transaction executor (for non-spin transactions)
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
      
      const receipt = await publicClient?.waitForTransactionReceipt({ 
        hash,
        timeout: 300_000 // Increased to 5 minutes to account for network delays
      });
      
      if (receipt?.status === 'success') {
        setTxState({ status: 'success', hash });
        toast.success(successMessage);
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
  }, [walletClient, address, publicClient, refreshAllData]);
  
  // Buy CHIPS with ETH
  const buyChips = useCallback(async (ethAmount: string) => {
    const ethValue = parseEther(ethAmount);
    return executeTransaction(setBuyChipsState, () => 
      walletClient!.writeContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'buyChips',
        value: ethValue,
        // Let wallet handle gas estimation automatically
      }),
      `Successfully bought CHIPS with ${ethAmount} ETH`
    );
  }, [executeTransaction, walletClient]);
  
  // Approve CHIPS spending
  const approveChips = useCallback(async (amount: bigint) => {
    return executeTransaction(setSpinState, () => 
      walletClient!.writeContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'approve',
        args: [CASINO_SLOT_ADDRESS, amount],
        // Let wallet handle gas estimation automatically
      }),
      `Approved ${formatEther(amount)} CHIPS for spending`
    );
  }, [executeTransaction, walletClient]);
  
  // Spin reels - custom logic to get requestId
  const spinReels = useCallback(async (reelCount: 3 | 4 | 5 | 6 | 7) => {
    if (!walletClient || !publicClient) return null;
    
    // Prevent multiple concurrent spins
    if (spinState.status === 'pending') {
      toast.error('A spin is already in progress. Please wait.');
      return null;
    }

    const functionName = `spin${reelCount}Reels` as const;
    setSpinState({ status: 'pending' });
    try {
      console.log(`🎮 Sending ${functionName} transaction...`);
      
      const hash = await walletClient.writeContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName,
        // Let wallet handle gas estimation automatically
      });
      setSpinState({ status: 'pending', hash });
      console.log(`📝 Transaction sent with hash: ${hash}`);

      // Wait for transaction receipt to know it's submitted
      console.log(`⏳ Waiting for transaction receipt...`);
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 300_000 // 5 minutes for slower networks
      });
      console.log(`✅ Transaction receipt received:`, receipt);

      if (receipt.status === 'success') {
        // Keep state as 'pending' and hash. The event listener will handle the final 'success' state.
        setSpinState({ status: 'pending', hash }); 
        toast.success(`🚀 Spin submitted! Waiting for result...`);

        // Log the request ID from the event for debugging purposes
        for (const log of receipt.logs) {
          try {
            const decodedLog = decodeEventLog({ abi: CasinoSlotABI, data: log.data, topics: log.topics });
            if (decodedLog.eventName === 'SpinRequested') {
              const { requestId } = decodedLog.args as any;
              console.log(`ℹ️ Spin requested with ID: ${requestId}`);
              break; // Found it, no need to check other logs
            }
          } catch (e) {
            // Not the event we're looking for
          }
        }

        return hash;
      } else {
        console.error(`❌ Transaction failed with status: ${receipt.status}`);
        throw new Error('Spin transaction failed on-chain');
      }
    } catch (error: any) {
      console.error('❌ Spin transaction error:', error);
      const errorMessage = error.message || 'Spin failed';
      
      setSpinState({ status: 'error', error: errorMessage });
      
      if (error.message?.includes('rejected')) {
        toast.error('Transaction was rejected by wallet');
      } else {
        toast.error(`Spin failed: ${errorMessage}`);
      }
      return null;
    }
  }, [walletClient, publicClient, spinState.status, CASINO_SLOT_ADDRESS]);
  
  // Withdraw winnings
  const withdrawWinnings = useCallback(async () => {
    return executeTransaction(setWithdrawState, () =>
      walletClient!.writeContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'withdrawWinnings',
        // Let wallet handle gas estimation automatically
      }),
      'Winnings withdrawn successfully'
    );
  }, [executeTransaction, walletClient]);
  
  // Helper functions
  const canSpin = useCallback(() => {
    if (!spinCosts) return false;
    const cost = spinCosts[`reels${selectedReelCount}` as keyof SpinCosts] ?? 0n;
    return playerStats.chipBalance >= cost && (currentAllowance ?? 0n) >= cost;
  }, [playerStats.chipBalance, currentAllowance, spinCosts, selectedReelCount]);
  
  const getCurrentSpinCost = useCallback(() => {
    if (!spinCosts) return 0n;
    return spinCosts[`reels${selectedReelCount}` as keyof SpinCosts] ?? 0n;
  }, [spinCosts, selectedReelCount]);
  
  const calculateExpectedChips = useCallback((ethAmount: string) => {
    try {
      const eth = parseFloat(ethAmount);
      const ethPriceUSD = parseFloat(gameStats.ethPrice.replace('$', ''));
      return Math.floor(eth * ethPriceUSD * 5); // 5 CHIPS per USD
    } catch {
      return 0;
    }
  }, [gameStats.ethPrice]);
  

  
  return {
    // Data states
    playerStats,
    gameStats,
    spinCosts,
    isLoadingData: false,
    
    // Transaction states
    buyChipsState,
    spinState,
    withdrawState,
    
    // Spin management
    selectedReelCount,
    setSelectedReelCount,
    currentAllowance: currentAllowance ?? 0n,
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
    refreshAllData,
    
    // Connection state
    isConnected,
    address,
  };
}
