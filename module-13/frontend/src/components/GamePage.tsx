import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { formatEther, parseEther, type Address, decodeEventLog } from 'viem';
import toast from 'react-hot-toast';
import { useAccount, usePublicClient, useWalletClient, useBalance, useReadContract, useChainId, useWriteContract, useWatchContractEvent } from 'wagmi';

import SlotMachine, { SlotMachineRef } from './SlotMachine';
import PhoneHelpLine from './PhoneHelpLine';
import PoolStats from './PoolStats';
import NetworkSwitcher from './NetworkSwitcher';
import SmartConnectButton from './SmartConnectButton';

import { useWallet } from '../hooks/useWallet';
import { useNetworks } from '../hooks/useNetworks';
import { useSlotAnimator } from '../hooks/useSlotAnimator';
import { usePoolData } from '../hooks/usePoolData';

import { CasinoSlotABI, getDeployment } from '../config/contracts';
import { QuoteManager } from '../utils/quotes';

// GameHeader component remains the same
const GameHeader: React.FC<{
  isConnected: boolean;
  account: any;
  balance: string;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  chainId: number | undefined;
  currentChain: any;
  isSupported: boolean;
  onSwitchToLocal: () => void;
  onSwitchToSepolia: () => void;
  isSwitchPending: boolean;
  poolData: {
    poolETH: string | null;
    ethPrice: string | null;
    chipRate: string | null;
    isLoading: boolean;
    error: string | null;
  };
}> = ({
  isConnected,
  account,
  balance,
  connecting,
  onConnect,
  onDisconnect,
  currentChain,
  isSupported,
  onSwitchToLocal,
  onSwitchToSepolia,
  isSwitchPending,
  poolData,
}) => {
  const formatAddress = (address?: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-black/30 backdrop-blur-md border-b border-white/20">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🦧</span>
            <div>
              <h1 className="text-xl font-bold text-white">The Leverage Lounge</h1>
              <div className="text-xs text-gray-400">Provably Fair • Chainlink VRF</div>
            </div>
          </div>

          {/* Center - Pool Info (Disconnected) or Game Stats (Connected) */}
          <div className="hidden md:flex items-center space-x-4">
            {!isConnected ? (
              <PoolStats
                poolETH={poolData.poolETH}
                ethPrice={poolData.ethPrice}
                chipRate={poolData.chipRate}
                isLoading={poolData.isLoading}
                error={poolData.error}
                layout="horizontal"
                showLabels={false}
                className="bg-black/40 rounded-xl px-4 py-2 border border-gray-600"
              />
            ) : (
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-green-400">🎰 Provably Fair</span>
                <span className="text-yellow-400">🔒 VRF Powered</span>
                <span className="text-purple-400">⚡ Instant Payouts</span>
              </div>
            )}
          </div>

          {/* Right - Wallet & Network */}
          <div className="flex items-center space-x-3">
            {/* Network Switcher */}
            <NetworkSwitcher
              currentChain={currentChain}
              isSupported={isSupported}
              isSwitchPending={isSwitchPending}
              onSwitchToLocal={onSwitchToLocal}
              onSwitchToSepolia={onSwitchToSepolia}
              isConnected={isConnected}
            />

            {/* Wallet */}
            {isConnected && account ? (
              <div className="flex items-center space-x-2">
                <div className="bg-white/10 rounded px-2 py-1 text-xs">
                  {parseFloat(balance).toFixed(3)} ETH
                </div>
                <div className="bg-white/10 rounded px-2 py-1 text-xs">
                  {formatAddress(account)}
                </div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Disconnect button clicked');
                    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
                      onDisconnect();
                    }
                  }}
                  className="bg-red-500/30 hover:bg-red-500/50 text-red-300 hover:text-white rounded-lg px-3 py-2 text-sm font-medium transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <SmartConnectButton
                connecting={connecting}
                onConnect={onConnect}
                onSwitchToLocal={onSwitchToLocal}
                onSwitchToSepolia={onSwitchToSepolia}
                variant="default"
              />
            )}
          </div>
        </div>
      </div>

      {/* Network Warning */}
      {isConnected && !isSupported && (
        <div className="bg-yellow-500/90 text-black p-2 text-center text-sm">
          Switch to a supported network to play
          <button onClick={onSwitchToLocal} className="ml-2 bg-black/20 px-2 py-1 rounded">
            Switch to Local
          </button>
        </div>
      )}
    </header>
  );
};

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

// New simplified spin tracking state
interface SpinTracker {
  pendingRequestId: string | null;
  isWaitingForResult: boolean;
}

const GamePage: React.FC = () => {
    // Wallet and network hooks
    const {
        account,
        isConnected,
        connecting,
        balance,
        connectWallet,
        disconnectWallet,
    } = useWallet();

    const {
        currentNetwork,
        isNetworkSupported,
        switchingNetwork,
        switchToNetwork,
    } = useNetworks();
    
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const poolData = usePoolData(chainId);



    function getContractAddress(chainId: number | undefined): Address | undefined {
        if (!chainId) return undefined;
        const networkName = chainId === 11155111 ? 'sepolia' : chainId === 31337 ? 'hardhat' : 'hardhat';
        try {
            return getDeployment(networkName, 'dev').addresses.CASINO_SLOT as Address;
        } catch (error) {
            console.error(`Failed to get contract address for chainId ${chainId}`, error);
            return undefined;
        }
    }

    const CASINO_SLOT_ADDRESS = getContractAddress(chainId);
    
    // Transaction states
    const [buyChipsState, setBuyChipsState] = useState<TransactionState>({ status: 'idle' });
    const [spinState, setSpinState] = useState<TransactionState>({ status: 'idle' });
    const [withdrawState, setWithdrawState] = useState<TransactionState>({ status: 'idle' });
    const [swapChipsState, setSwapChipsState] = useState<TransactionState>({ status: 'idle' });
    
    // Simplified spin tracking
    const [spinTracker, setSpinTracker] = useState<SpinTracker>({
        pendingRequestId: null,
        isWaitingForResult: false
    });
    
    // UI states
    const [selectedReelCount, setSelectedReelCount] = useState<3 | 4 | 5 | 6 | 7>(3);
    const [ethAmount, setEthAmount] = useState<string>('0.1');
    const [chipsAmount, setChipsAmount] = useState<string>('100');
    const [showChipTease, setShowChipTease] = useState(false);
    const [chipTeaseMessage, setChipTeaseMessage] = useState('');
    
    // Refs
    const refreshTimeoutRef = useRef<NodeJS.Timeout>();
    const processedRequestIds = useRef(new Set<string>());
    const slotMachineRef = useRef<SlotMachineRef>(null);

    const { data: ethBalanceResult } = useBalance({ address: account });

    // Contract Reads
    const { data: playerStatsResult, refetch: refetchPlayerStats } = useReadContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getPlayerStats',
        args: [account!],
        query: { enabled: !!account && !!CASINO_SLOT_ADDRESS },
    });

    const { data: gameStatsResult, refetch: refetchGameStats } = useReadContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getGameStats',
        query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS },
    });

    const { data: poolStatsResult, refetch: refetchPoolStats } = useReadContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'getPoolStats',
        query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS },
    });

    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        functionName: 'allowance',
        args: [account!, CASINO_SLOT_ADDRESS!],
        query: { enabled: !!account && !!CASINO_SLOT_ADDRESS },
    });

    const { data: spinCosts3, refetch: refetchSpinCost3 } = useReadContract({ address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [3], query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS } });
    const { data: spinCosts4, refetch: refetchSpinCost4 } = useReadContract({ address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [4], query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS } });
    const { data: spinCosts5, refetch: refetchSpinCost5 } = useReadContract({ address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [5], query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS } });
    const { data: spinCosts6, refetch: refetchSpinCost6 } = useReadContract({ address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [6], query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS } });
    const { data: spinCosts7, refetch: refetchSpinCost7 } = useReadContract({ address: CASINO_SLOT_ADDRESS, abi: CasinoSlotABI, functionName: 'getSpinCost', args: [7], query: { enabled: isConnected && !!CASINO_SLOT_ADDRESS } });

    const spinCosts: SpinCosts = useMemo(() => ({
        reels3: spinCosts3 ?? 0n,
        reels4: spinCosts4 ?? 0n,
        reels5: spinCosts5 ?? 0n,
        reels6: spinCosts6 ?? 0n,
        reels7: spinCosts7 ?? 0n,
    }), [spinCosts3, spinCosts4, spinCosts5, spinCosts6, spinCosts7]);

    const playerStats: PlayerStats = useMemo(() => ({
        chipBalance: playerStatsResult?.[0] ?? 0n,
        ethBalance: ethBalanceResult?.value ?? 0n,
        winnings: playerStatsResult?.[1] ?? 0n,
        totalSpins: playerStatsResult?.[2] ?? 0n,
        totalWon: playerStatsResult?.[3] ?? 0n,
        totalBet: playerStatsResult?.[4] ?? 0n,
    }),[playerStatsResult, ethBalanceResult]);

    const gameStats: GameStats = useMemo(()=> ({
        prizePool: gameStatsResult?.[0] ?? 0n,
        houseEdge: gameStatsResult?.[1] ?? 0n,
        ethPrice: poolStatsResult ? `$${(Number(poolStatsResult[2]) / 100).toFixed(0)}` : '$0',
        chipRate: poolStatsResult ? (Number(poolStatsResult[2]) * 5).toFixed(0) : '0',
    }), [gameStatsResult, poolStatsResult]);
    
    const isLoadingData = !playerStatsResult || !gameStatsResult || !poolStatsResult;

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

    // Slot animation system for disconnected users
    const {
        slotMachineRef: animatedSlotRef,
        stopAnimation,
    } = useSlotAnimator({
        reelCount: 3,
        autoStart: true,
        cyclePause: 4000
    });

    // Stop animation when user connects
    useEffect(() => {
        if (isConnected) {
            stopAnimation();
        }
    }, [isConnected, stopAnimation]);

    // Helper function to format CHIPS amount properly
    const formatChipsAmount = useCallback((value: bigint | string): string => {
        let amount: number;
        
        if (typeof value === 'string') {
            amount = parseFloat(value);
        } else {
            amount = Number(formatEther(value));
        }
        
        if (amount === 0) return "0";
        
        // For small amounts, show up to 4 decimals
        if (amount < 1) {
            return parseFloat(amount.toFixed(4)).toString();
        }
        // For larger amounts, show up to 2 decimals
        return parseFloat(amount.toFixed(2)).toString();
    }, []);

    // Helper function to determine quote type based on payout amount
    const getQuoteTypeForPayout = (payoutAmount: number, symbols: number[]) => {
        if (payoutAmount === 0) {
            return QuoteManager.getStateQuote('losing');
        }
        
        const analysis = QuoteManager.analyzeResult(symbols);
        
        if (payoutAmount >= 10000) {
            return QuoteManager.getCombinationQuote(selectedReelCount, 'jackpot');
        } else if (payoutAmount >= 1000) {
            return QuoteManager.getCombinationQuote(selectedReelCount, analysis.type === 'jackpot' ? 'jackpot' : 'matching');
        } else if (payoutAmount >= 100) {
            return QuoteManager.getCombinationQuote(selectedReelCount, 'matching');
        } else {
            return QuoteManager.getStateQuote('winning');
        }
    };

    // Simplified spin result handler
    const handleSpinResult = useCallback((symbols: number[], payout: bigint, payoutType: number) => {
        console.log(`🎰 handleSpinResult called - Symbols: [${symbols.join(', ')}], Payout: ${formatEther(payout)} CHIPS`);
        
        // Update slot machine with result
        slotMachineRef.current?.setAllReelTargets(symbols);
        
        const payoutAmount = Number(formatEther(payout));
        
        if (payout > 0n) {
            const resultQuote = getQuoteTypeForPayout(payoutAmount, symbols);
            slotMachineRef.current?.lcd.setMessage(resultQuote);
            
            if (isConnected) {
                toast.success(`🎉 ${resultQuote} Won!`);
            }
        } else {
            const loseQuote = QuoteManager.getStateQuote('losing');
            slotMachineRef.current?.lcd.setMessage(loseQuote);
        }
        
        // Auto-reset after showing result
        setTimeout(() => {
            slotMachineRef.current?.lcd.setIdlePattern();
            if (isConnected) {
                refreshAllData();
            }
        }, 3000);
    }, [selectedReelCount, refreshAllData, isConnected, formatChipsAmount]);

    // Simplified spin result handler
    const handleSpinResultEvents = useCallback((logs: any[]) => {
        if (!account) {
            console.log('No address available, ignoring SpinResult events');
            return;
        }
        
        console.log(`SpinResult event(s) received: ${logs.length} logs`);
        
        for (const log of logs) {
            if (!log.args) continue;
            const { requestId, player, reelCount, reels, payoutType, payout } = log.args as any;
            
            if (player?.toLowerCase() !== account.toLowerCase()) {
                continue;
            }
            
            const requestIdStr = requestId.toString();
            
            // Check if we've already processed this request
            if (processedRequestIds.current.has(requestIdStr)) {
                console.log(`Skipping duplicate result for requestId ${requestIdStr}`);
                continue;
            }
            
            console.log('✅ Processing spin result for current user:', log.args);
            
            // Mark as processed
            processedRequestIds.current.add(requestIdStr);
            
            // Process the result immediately if we're waiting for it
            if (spinTracker.isWaitingForResult) {
                const symbols = Array.isArray(reels) ? reels.map((r: bigint) => Number(r)) : [];
                console.log(`🎰 Applying spin result - Symbols: [${symbols.join(', ')}], Payout: ${formatEther(payout)} CHIPS`);
                
                // Apply the result to the slot machine
                handleSpinResult(symbols, payout, Number(payoutType));
                
                // Clear the waiting state
                setSpinTracker({
                    pendingRequestId: null,
                    isWaitingForResult: false
                });
                
                // Update transaction state
                setSpinState({ status: 'success' });
                
                // Refresh data after a short delay
                if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = setTimeout(() => {
                    console.log('Refreshing data after spin result...');
                    refreshAllData();
                }, 500);
            }
        }
    }, [account, spinTracker.isWaitingForResult, refreshAllData, handleSpinResult]);
    
    useWatchContractEvent({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        eventName: 'SpinCompleted',
        onLogs: handleSpinResultEvents,
        enabled: !!account && !!CASINO_SLOT_ADDRESS,
        pollingInterval: 1000,
    });

    // Watch for ChipsTransacted events (specifically swaps)
    const handleChipsTransactedEvents = useCallback((logs: any[]) => {
        if (!account) {
            console.log('No address available, ignoring ChipsTransacted events');
            return;
        }
        
        console.log(`ChipsTransacted event(s) received: ${logs.length} logs`);
        
        for (const log of logs) {
            if (!log.args) continue;
            const { player, transactionType, chipsAmount, ethValue } = log.args as any;
            
            // Only process swap transactions for the current user
            if (player?.toLowerCase() !== account.toLowerCase() || transactionType !== 'swap') {
                continue;
            }
            
            console.log('✅ Processing chips swap for current user:', log.args);
            
            // Show success message with transaction details
            const chipsFormatted = formatChipsAmount(chipsAmount);
            const ethFormatted = formatEther(ethValue);
            toast.success(`🎉 Swapped ${chipsFormatted} CHIPS for ${parseFloat(ethFormatted).toFixed(6)} ETH!`);
            
            // Refresh data after swap
            setTimeout(() => {
                console.log('Refreshing data after chips swap...');
                refreshAllData();
            }, 1000);
        }
    }, [account, refreshAllData, formatChipsAmount]);
    
    useWatchContractEvent({
        address: CASINO_SLOT_ADDRESS,
        abi: CasinoSlotABI,
        eventName: 'ChipsTransacted',
        onLogs: handleChipsTransactedEvents,
        enabled: !!account && !!CASINO_SLOT_ADDRESS,
        pollingInterval: 1000,
    });
    
    const executeTransaction = useCallback(async (
        setTxState: (state: TransactionState) => void,
        operation: () => Promise<`0x${string}`>,
        successMessage: string = 'Transaction successful'
    ) => {
        if (!walletClient || !account) {
            toast.error('Wallet not connected');
            return null;
        }
        
        try {
            setTxState({ status: 'pending' });
            const hash = await operation();
            setTxState({ status: 'pending', hash });
            
            const receipt = await publicClient?.waitForTransactionReceipt({ 
                hash,
                timeout: 300_000
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
    }, [walletClient, account, publicClient, refreshAllData]);
    
    const buyChips = useCallback(async (ethAmount: string) => {
        if (!CASINO_SLOT_ADDRESS) return null;
        const ethValue = parseEther(ethAmount);
        return executeTransaction(setBuyChipsState, () => 
            walletClient!.writeContract({
                address: CASINO_SLOT_ADDRESS,
                abi: CasinoSlotABI,
                functionName: 'buyChips',
                value: ethValue,
            }),
            `Successfully bought CHIPS with ${ethAmount} ETH`
        );
    }, [executeTransaction, walletClient, CASINO_SLOT_ADDRESS]);
    
    const approveChips = useCallback(async (amount: bigint) => {
        if (!CASINO_SLOT_ADDRESS) return null;
        return executeTransaction(setSpinState, () => 
            walletClient!.writeContract({
                address: CASINO_SLOT_ADDRESS,
                abi: CasinoSlotABI,
                functionName: 'approve',
                args: [CASINO_SLOT_ADDRESS, amount],
            }),
            `Approved ${formatChipsAmount(amount)} CHIPS for spending`
        );
    }, [executeTransaction, walletClient, CASINO_SLOT_ADDRESS, formatChipsAmount]);

    const spinReels = useCallback(async (reelCount: 3 | 4 | 5 | 6 | 7) => {
        if (!walletClient || !publicClient || !CASINO_SLOT_ADDRESS) return null;
        
        if (spinTracker.isWaitingForResult) {
            toast.error('A spin is already in progress. Please wait.');
            return null;
        }
        
        setSpinState({ status: 'pending' });
        
        try {
            console.log(`🎮 Sending spinReels(${reelCount}) transaction...`);
            
            const hash = await walletClient.writeContract({
                address: CASINO_SLOT_ADDRESS,
                abi: CasinoSlotABI,
                functionName: 'spinReels',
                args: [reelCount],
            });
            
            setSpinState({ status: 'pending', hash });
            console.log(`📝 Transaction sent with hash: ${hash}`);
            console.log(`⏳ Waiting for transaction receipt...`);
            
            const receipt = await publicClient.waitForTransactionReceipt({ 
                hash,
                timeout: 300_000
            });
            
            console.log(`✅ Transaction receipt received:`, receipt);

            if (receipt.status === 'success') {
                // Extract requestId from the receipt
                let requestId: string | null = null;
                
                for (const log of receipt.logs) {
                    try {
                        const decodedLog = decodeEventLog({ abi: CasinoSlotABI, data: log.data, topics: log.topics });
                        if (decodedLog.eventName === 'SpinInitiated') {
                            const { requestId: id } = decodedLog.args as any;
                            requestId = id.toString();
                            console.log(`ℹ️ Spin initiated with ID: ${requestId}`);
                            break;
                        }
                    } catch (e) {
                        // Ignore decoding errors
                    }
                }
                
                // Set waiting state
                setSpinTracker({
                    pendingRequestId: requestId,
                    isWaitingForResult: true
                });
                
                toast.success(`🚀 Spin submitted! Waiting for result...`);
                return hash;
            } else {
                console.error(`❌ Transaction failed with status: ${receipt.status}`);
                throw new Error('Spin transaction failed on-chain');
            }
        } catch (error: any) {
            console.error('❌ Spin transaction error:', error);
            const errorMessage = error.message || 'Spin failed';
            
            setSpinState({ status: 'error', error: errorMessage });
            
            // Reset waiting state
            setSpinTracker({
                pendingRequestId: null,
                isWaitingForResult: false
            });
            
            if (error.message?.includes('rejected')) {
                toast.error('Transaction was rejected by wallet');
            } else {
                toast.error(`Spin failed: ${errorMessage}`);
            }
            return null;
        }
    }, [walletClient, publicClient, spinTracker.isWaitingForResult, CASINO_SLOT_ADDRESS]);
    
    const withdrawWinnings = useCallback(async () => {
        if (!CASINO_SLOT_ADDRESS) return null;
        return executeTransaction(setWithdrawState, () =>
            walletClient!.writeContract({
                address: CASINO_SLOT_ADDRESS,
                abi: CasinoSlotABI,
                functionName: 'withdrawWinnings',
            }),
            'Winnings withdrawn successfully'
        );
    }, [executeTransaction, walletClient, CASINO_SLOT_ADDRESS]);
    
    const swapChipsToETH = useCallback(async (chipsAmount: string) => {
        if (!CASINO_SLOT_ADDRESS) return null;
        
        if (!walletClient || !account) {
            toast.error('Wallet not connected');
            return null;
        }
        
        try {
            setSwapChipsState({ status: 'pending' });
            const chipsValue = parseEther(chipsAmount);
            
            const hash = await walletClient.writeContract({
                address: CASINO_SLOT_ADDRESS,
                abi: CasinoSlotABI,
                functionName: 'swapChipsToETH',
                args: [chipsValue],
            });
            
            setSwapChipsState({ status: 'pending', hash });
            
            const receipt = await publicClient?.waitForTransactionReceipt({
                hash,
                timeout: 300_000
            });
            
            if (receipt?.status === 'success') {
                setSwapChipsState({ status: 'success', hash });
                toast.success(`Successfully swapped ${chipsAmount} CHIPS to ETH`);
                setTimeout(() => refreshAllData(), 1000);
                return hash;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error: any) {
            console.error('Swap transaction error:', error);
            
            // Check for the exact contract error string you specified
            const errorString = JSON.stringify(error);
            console.log('Full error string:', errorString);
            
            let errorMessage = 'Transaction failed';
            
            if (errorString.includes('Insufficient contract ETH balance')) {
                errorMessage = 'CASINO HAS INSUFFICIENT ETH LIQUIDITY - Please try a smaller amount or contact support';
            } else if (errorString.includes('Insufficient CHIPS balance')) {
                errorMessage = 'Insufficient CHIPS balance - Withdraw your winnings first';
            } else if (errorString.includes('rejected')) {
                errorMessage = 'Transaction was rejected by wallet';
            } else if (error.shortMessage) {
                errorMessage = error.shortMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setSwapChipsState({ status: 'error', error: errorMessage });
            toast.error(errorMessage);
            return null;
        }
    }, [walletClient, account, publicClient, refreshAllData, CASINO_SLOT_ADDRESS]);
    
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
            if(isNaN(eth)) return 0;
            const ethPriceUSD = parseFloat(gameStats.ethPrice.replace('$', ''));
            return Math.floor(eth * ethPriceUSD * 5);
        } catch {
            return 0;
        }
    }, [gameStats.ethPrice]);

    const calculateExpectedETH = useCallback((chipsAmount: string) => {
        try {
            const chips = parseFloat(chipsAmount);
            if(isNaN(chips)) return 0;
            const ethPriceUSD = parseFloat(gameStats.ethPrice.replace('$', ''));
            const ethValue = (chips * 0.20) / ethPriceUSD;
            return ethValue;
        } catch {
            return 0;
        }
    }, [gameStats.ethPrice]);

    // Handle chip insert when disconnected - show funny popup
    const handleChipInsertTease = () => {
        const teaseMessage = QuoteManager.getChipInsertTeaseQuote();
        setChipTeaseMessage(teaseMessage);
        setShowChipTease(true);
        
        setTimeout(() => {
            setShowChipTease(false);
        }, 4000);
    };

    // Handle chip insert (approve spending)
    const handleChipInsert = useCallback(async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet');
            return;
        }

        const cost = getCurrentSpinCost();
        
        if (playerStats.chipBalance < cost) {
            toast.error('Insufficient CHIPS! Buy more or use credit.');
            return;
        }

        if (currentAllowance && currentAllowance >= cost) {
            slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('idle'));
            return;
        }

        slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('evaluating'));
        
        const hash = await approveChips(cost);
        if (hash) {
            slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('idle'));
        } else {
            slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('losing'));
        }
    }, [isConnected, getCurrentSpinCost, playerStats.chipBalance, currentAllowance, approveChips]);

    // Handle lever pull (execute spin)
    const handleLeverPull = useCallback(async () => {
        if (!canSpin()) {
            toast.error('Cannot spin - check CHIPS balance and approval');
            return;
        }

        // Start the animation first
        slotMachineRef.current?.startSpin();
        slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('spinning'));
        
        // Execute blockchain transaction
        const hash = await spinReels(selectedReelCount);
        
        if (!hash) {
            // Transaction failed - stop the slot machine
            console.log('Spin transaction failed - stopping slot machine');
            slotMachineRef.current?.reset();
            slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('losing'));
        }
    }, [canSpin, spinReels, selectedReelCount]);

    // Handle spin state errors
    useEffect(() => {
        if (spinState.status === 'error' && spinTracker.isWaitingForResult) {
            console.log('Spin state error detected - stopping slot machine');
            setSpinTracker({
                pendingRequestId: null,
                isWaitingForResult: false
            });
            slotMachineRef.current?.reset();
            slotMachineRef.current?.lcd.setMessage(QuoteManager.getStateQuote('losing'));
        }
    }, [spinState.status, spinTracker.isWaitingForResult]);

    // Event handlers for quotes
    const handleSlotResultWrapper = (symbols: number[], payout: number, payoutType: string) => {
        handleSpinResult(symbols, BigInt(payout), typeof payoutType === 'string' ? 0 : payoutType);
    };

    const handleSlotStateChange = (state: string) => {
        if (isConnected && slotMachineRef.current?.lcd) {
            let quote = '';
            
            switch (state) {
                case 'spinning':
                    quote = QuoteManager.getStateQuote('spinning');
                    break;
                case 'idle':
                    quote = QuoteManager.getStateQuote('idle');
                    break;
                case 'evaluating_result':
                    quote = QuoteManager.getStateQuote('evaluating');
                    break;
                default:
                    quote = QuoteManager.getMotivationalQuote();
            }
            
            if (quote) {
                slotMachineRef.current.lcd.setMessage(quote);
            }
        }
    };

    // Buy chips handler
    const handleBuyChips = useCallback(async () => {
        const hash = await buyChips(ethAmount);
        if (hash) {
            toast.success('CHIPS purchased successfully!');
        }
    }, [buyChips, ethAmount]);

    // Withdraw winnings handler
    const handleWithdrawWinnings = useCallback(async () => {
        const hash = await withdrawWinnings();
        if (hash) {
            // toast.success('Winnings withdrawn successfully!');
        }
    }, [withdrawWinnings]);

    // Swap chips handler
    const handleSwapChips = useCallback(async () => {
        const hash = await swapChipsToETH(chipsAmount);
        // Success message is already handled in swapChipsToETH function
        if (hash) {
            toast.success('CHIPS swapped to ETH successfully!');
        }
    }, [swapChipsToETH, chipsAmount]);

    // Network switching handlers
    const handleSwitchToLocal = () => switchToNetwork('hardhat');
    const handleSwitchToSepolia = () => switchToNetwork('sepolia');

    // Helper function to get block explorer URL for transaction
    const getBlockExplorerUrl = (txHash: string) => {
        if (chainId === 11155111) {
            return `https://sepolia.etherscan.io/tx/${txHash}`;
        } else if (chainId === 1) {
            return `https://etherscan.io/tx/${txHash}`;
        } else {
            return `#${txHash}`;
        }
    };

    // Format player stats
    const playerBalance = formatChipsAmount(playerStats.chipBalance);
    const playerWinnings = formatChipsAmount(playerStats.winnings);
    const totalSpins = Number(playerStats.totalSpins);
    const totalWon = formatChipsAmount(playerStats.totalWon);

    // Format game stats
    const formattedPoolETH = isConnected ? formatChipsAmount(gameStats.prizePool) : poolData.poolETH;
    const ethPrice = isConnected ? gameStats.ethPrice : poolData.ethPrice;
    const chipRate = isConnected ? gameStats.chipRate : poolData.chipRate;

    const chipCostInEth = useMemo(() => {
        if (!gameStats.ethPrice) return '...';
        try {
            const ethPriceNum = parseFloat(gameStats.ethPrice.replace('$', '').replace(',', ''));
            if (ethPriceNum > 0) {
                const cost = 0.20 / ethPriceNum;
                return cost.toFixed(6);
            }
            return '...';
        } catch {
            return '...';
        }
    }, [gameStats.ethPrice]);

    // Calculate USD value of CHIPS balance
    const chipBalanceUSD = (() => {
        try {
            const chipsBalance = parseFloat(playerBalance);
            return (chipsBalance * 0.20).toFixed(2);
        } catch (error) {
            return '0.00';
        }
    })();

    // Check if currently spinning
    const isSpinning = spinTracker.isWaitingForResult;
    const isLeverDisabled = !canSpin() || isSpinning;

    // Reel configs
    const reelConfigs = [
        { count: 3, cost: formatChipsAmount(spinCosts.reels3), name: 'Classic', color: 'bg-green-600' },
        { count: 4, cost: formatChipsAmount(spinCosts.reels4), name: 'Extended', color: 'bg-blue-600' },
        { count: 5, cost: formatChipsAmount(spinCosts.reels5), name: 'Premium', color: 'bg-purple-600' },
        { count: 6, cost: formatChipsAmount(spinCosts.reels6), name: 'High Roller', color: 'bg-red-600' },
        { count: 7, cost: formatChipsAmount(spinCosts.reels7), name: 'Whale Mode', color: 'bg-yellow-600' },
    ];

    // Simple game phase derivation from state
    const gamePhase = useMemo(() => {
        if (isSpinning) return 'spinning';
        if (spinState.status === 'pending' && !isSpinning) return 'approving';
        if (canSpin()) return 'ready';
        return 'idle';
    }, [isSpinning, spinState.status, canSpin]);

    // Disconnected mode (same as before)
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center space-y-6">
                        <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-600 bg-clip-text text-transparent">
                            🎰 The Leverage Lounge
                        </h1>
                        <p className="text-xl text-gray-300">Provably Fair Degen Slot Machine</p>
                        <p className="text-lg text-yellow-400">Watch the magic happen... then connect for the real deal!</p>

                        <div className="flex justify-center mb-6">
                            <SlotMachine
                                key="slot-machine-animated-demo"
                                ref={animatedSlotRef}
                                onResult={handleSlotResultWrapper}
                                onStateChange={handleSlotStateChange}
                                isConnected={false}
                                reelCount={3}
                                onCoinInsert={handleChipInsertTease}
                                showChipPopup={showChipTease}
                                chipPopupMessage={chipTeaseMessage}
                            />
                        </div>

                        <div className="bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-pink-500/20 rounded-xl p-6 border border-yellow-500/30 max-w-2xl mx-auto">
                            <h3 className="text-2xl font-bold text-yellow-400 mb-3">🔥 Ready for the Real Deal?</h3>
                            <p className="text-lg text-gray-300 mb-4">
                                This is just a taste! Connect your wallet to play with real CHIPS and win real rewards!
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                                <div className="bg-black/40 rounded-lg p-3 border border-green-500/30">
                                    <div className="text-green-400 font-bold">🎰 Real Gameplay</div>
                                    <div className="text-gray-300">Play with actual CHIPS tokens</div>
                                </div>
                                <div className="bg-black/40 rounded-lg p-3 border border-blue-500/30">
                                    <div className="text-blue-400 font-bold">🏆 Real Rewards</div>
                                    <div className="text-gray-300">Win real ETH and CHIPS</div>
                                </div>
                                <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
                                    <div className="text-purple-400 font-bold">⚡ VRF Powered</div>
                                    <div className="text-gray-300">Provably fair randomness</div>
                                </div>
                            </div>
                            
                            <div className="flex justify-center">
                                <SmartConnectButton
                                    connecting={connecting}
                                    onConnect={connectWallet}
                                    onSwitchToLocal={handleSwitchToLocal}
                                    onSwitchToSepolia={handleSwitchToSepolia}
                                    variant="hero"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 text-sm">
                            <span className="bg-yellow-600 px-3 py-1 rounded-full">🐵 Jackpot: 666x</span>
                            <span className="bg-purple-600 px-3 py-1 rounded-full">🚀🚀🚀 Ultra: 555x</span>
                            <span className="bg-blue-600 px-3 py-1 rounded-full">💎💎💎 Mega: 444x</span>
                            <span className="bg-green-600 px-3 py-1 rounded-full">📈📈📈 Big: 333x</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
                            <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
                                <div className="text-2xl mb-2">⚡</div>
                                <div className="text-sm font-bold text-yellow-400">Instant Payouts</div>
                                <div className="text-xs text-gray-400">Win and withdraw immediately</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
                                <div className="text-2xl mb-2">🔒</div>
                                <div className="text-sm font-bold text-green-400">Provably Fair</div>
                                <div className="text-xs text-gray-400">Chainlink VRF powered</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
                                <div className="text-2xl mb-2">💎</div>
                                <div className="text-sm font-bold text-blue-400">Multiple Stakes</div>
                                <div className="text-xs text-gray-400">3-7 reels, your choice</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
                                <div className="text-2xl mb-2">🚀</div>
                                <div className="text-sm font-bold text-purple-400">DeFi Integrated</div>
                                <div className="text-xs text-gray-400">Leverage & lending options</div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Connected mode UI (same as before, just simplified phase display)
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <GameHeader
                isConnected={true} account={account} balance={balance} connecting={connecting}
                onConnect={connectWallet} onDisconnect={disconnectWallet} chainId={chainId}
                currentChain={currentNetwork} isSupported={isNetworkSupported} 
                onSwitchToLocal={handleSwitchToLocal}
                onSwitchToSepolia={handleSwitchToSepolia}
                isSwitchPending={switchingNetwork}
                poolData={poolData}
            />

            {isLoadingData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white/10 rounded-2xl p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-white text-lg">Loading casino data...</p>
                    </div>
                </div>
            )}

            <main className="container mx-auto px-4 py-4">
                <div className="space-y-3 max-w-6xl mx-auto">
                    {/* Top Row - Controls in horizontal layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Stakes Selection */}
                        <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
                            <h3 className="text-lg font-bold text-yellow-400 mb-2">🎰 Choose Stakes</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {reelConfigs.map((config) => (
                                    <button
                                        key={config.count}
                                        onClick={() => setSelectedReelCount(config.count as 3 | 4 | 5 | 6 | 7)}
                                        disabled={isSpinning}
                                        className={`p-2 rounded-lg text-white font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                            selectedReelCount === config.count ? config.color : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                    >
                                        {config.count} Reels • {config.cost} CHIPS
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-2 p-2 bg-gray-800/50 rounded-lg border border-gray-600">
                                <div className="text-center">
                                    <div className="text-sm text-gray-400">Selected:</div>
                                    <div className="text-lg font-bold text-yellow-400">
                                        🪙 {formatChipsAmount(getCurrentSpinCost())} CHIPS
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Your Balance */}
                        <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
                            <h3 className="text-lg font-bold text-green-400 mb-2">💰 Your Balance</h3>
                            <div className="text-center mb-2">
                                <div className="text-2xl font-bold text-green-400">
                                    🪙 {playerBalance}
                                </div>
                                <div className="text-sm text-gray-400">CHIPS Available</div>
                            </div>
                            
                            <div className="space-y-1 text-xs mb-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">ETH Balance:</span>
                                    <span className="text-blue-400 font-medium">{parseFloat(balance).toFixed(3)} ETH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">USD Value:</span>
                                    <span className="text-green-400 font-medium">~${chipBalanceUSD}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Network:</span>
                                    <span className="text-purple-400 font-medium">{currentNetwork?.name || 'Unknown'}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className="text-yellow-400 font-medium">{canSpin() ? 'Ready to Play' : 'Need CHIPS/Approval'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Pending Wins:</span>
                                    <span className="text-orange-400 font-medium">{playerWinnings} CHIPS</span>
                                </div>
                            </div>
                            
                            {parseFloat(playerWinnings) > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={handleWithdrawWinnings}
                                        disabled={withdrawState.status === 'pending' || isSpinning}
                                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg text-sm transition-colors"
                                    >
                                        {withdrawState.status === 'pending' ? (
                                            <>🔄 Withdrawing...</>
                                        ) : isSpinning ? (
                                            <>🎰 Spinning - Please Wait...</>
                                        ) : (
                                            <>🏆 Withdraw {playerWinnings} CHIPS</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Pool Stats */}
                        <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
                            <h3 className="text-lg font-bold text-blue-400 mb-2">📊 Pool Stats</h3>
                            <div className="space-y-1 text-xs mb-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Prize Pool:</span>
                                    <span className="text-blue-400 font-medium">{formattedPoolETH || '-.--'} ETH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">ETH Price:</span>
                                    <span className="text-green-400 font-medium">{ethPrice || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">CHIPS/ETH:</span>
                                    <span className="text-yellow-400 font-medium">{chipRate || '---'}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">House Edge:</span>
                                    <span className="text-red-400 font-medium">5.0%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">RTP:</span>
                                    <span className="text-green-400 font-medium">95.0%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center - Slot Machine (Featured) */}
                    <div className="flex justify-center bg-black/20 rounded-xl p-3">
                        <SlotMachine
                            key={`slot-machine-${selectedReelCount}`}
                            ref={slotMachineRef}
                            onResult={handleSlotResultWrapper}
                            onStateChange={handleSlotStateChange}
                            isConnected={isConnected}
                            reelCount={selectedReelCount}
                            onCoinInsert={handleChipInsert}
                            onLeverPull={handleLeverPull}
                            disabled={isLeverDisabled}
                        />
                    </div>

                    {/* Bottom Row - Actions in horizontal layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Buy CHIPS */}
                        <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
                            <h3 className="text-lg font-bold text-green-400 mb-2">💎 Buy CHIPS</h3>
                            
                            {buyChipsState.status === 'pending' && (
                                <div className="mb-3 p-3 rounded-lg border bg-orange-500/20 border-orange-500/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm font-bold text-orange-300">
                                            🔄 CHIPS Purchase in Progress
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Amount:</span>
                                            <span className="text-orange-300 font-bold">{ethAmount} ETH</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Status:</span>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                                <span className="text-orange-300 font-medium">Confirming...</span>
                                            </div>
                                        </div>
                                        
                                        {buyChipsState.hash && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Transaction:</span>
                                            <a 
                                                href={getBlockExplorerUrl(buyChipsState.hash)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 font-mono text-xs bg-gray-800/50 px-2 py-1 rounded cursor-pointer transition-colors hover:bg-gray-700/50"
                                            >
                                                {buyChipsState.hash.slice(0, 8)}...{buyChipsState.hash.slice(-6)}
                                            </a>
                                        </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="number" 
                                        placeholder="0.1" 
                                        value={ethAmount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const maxETH = parseFloat(balance) - 0.01;
                                            if (value === '' || (parseFloat(value) <= maxETH)) {
                                                setEthAmount(value);
                                            }
                                        }}
                                        min="0"
                                        step="0.01"
                                        disabled={buyChipsState.status === 'pending' || isSpinning}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-16 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={() => {
                                            const maxETH = (parseFloat(balance) - 0.01).toFixed(3);
                                            setEthAmount(maxETH);
                                        }}
                                        disabled={buyChipsState.status === 'pending' || parseFloat(balance) <= 0.01 || isSpinning}
                                        className="absolute right-12 top-1/2 -translate-y-1/2 bg-blue-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-blue-400 disabled:text-gray-500 text-xs font-bold px-1 py-0.5 rounded select-none"
                                        style={{ transform: 'translateY(-50%)', position: 'absolute', right: '48px', top: '50%' }}
                                    >
                                        MAX
                                    </button>
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 font-bold text-sm">
                                        ETH
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleBuyChips}
                                    disabled={!isConnected || !ethAmount || parseFloat(ethAmount) <= 0 || buyChipsState.status === 'pending' || isSpinning}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm transition-colors"
                                >
                                    {buyChipsState.status === 'pending' ? (
                                        <>🔄 Purchase in Progress...</>
                                    ) : isSpinning ? (
                                        <>🎰 Spinning - Please Wait...</>
                                    ) : (
                                        <>💰 Buy CHIPS with ETH</>
                                    )}
                                </button>
                                
                                <div className="text-xs text-gray-400 text-center mt-2 space-y-1">
                                    <div>
                                        Send {ethAmount || '0'} ETH → Get ~{calculateExpectedChips(ethAmount).toString()} CHIPS
                                    </div>
                                    <div className="text-gray-500">
                                        (1 CHIP ≈ $0.20 / ~{chipCostInEth} ETH)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Game Actions */}
                        <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
                            <h3 className="text-lg font-bold text-purple-400 mb-2">🎮 Game Actions</h3>
                            
                            <div className="bg-gray-800/50 rounded-lg p-2 mb-2 border border-gray-600">
                                <div className="text-center">
                                    <div className="text-sm text-gray-400">Selected Game:</div>
                                    <div className="text-lg font-bold text-yellow-400">
                                        {selectedReelCount} Reels
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Cost: {formatChipsAmount(getCurrentSpinCost())} CHIPS
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-center">
                                    <div className="text-sm text-gray-400">Current Phase:</div>
                                    <div className={`text-lg font-bold ${
                                        gamePhase === 'idle' ? 'text-gray-400' :
                                        gamePhase === 'approving' ? 'text-orange-400' :
                                        gamePhase === 'ready' ? 'text-yellow-400' :
                                        gamePhase === 'spinning' ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        {gamePhase === 'idle' && '🎰 Ready to Play'}
                                        {gamePhase === 'approving' && '🔄 Approving CHIPS'}
                                        {gamePhase === 'ready' && '🎯 Ready to Spin'}
                                        {gamePhase === 'spinning' && '⚡ Spinning...'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-center p-2 bg-gray-800/30 rounded">
                                        <div className="text-gray-400">Can Spin?</div>
                                        <div className={canSpin() ? 'text-green-400' : 'text-red-400'}>
                                            {canSpin() ? 'YES' : 'NO'}
                                        </div>
                                    </div>
                                    <div className="text-center p-2 bg-gray-800/30 rounded">
                                        <div className="text-gray-400">Allowance</div>
                                        <div className="text-blue-400">
                                            {formatChipsAmount(currentAllowance ?? 0n)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Player Stats */}
                        <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
                            <h3 className="text-lg font-bold text-purple-400 mb-2">🏆 Your Stats</h3>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Spins:</span>
                                    <span className="text-blue-400 font-medium">{totalSpins}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Winnings:</span>
                                    <span className="text-yellow-400 font-medium">{totalWon} CHIPS</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Pending Wins:</span>
                                    <span className="text-green-400 font-medium">{playerWinnings} CHIPS</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Win Rate:</span>
                                    <span className="text-purple-400 font-medium">
                                        {totalSpins > 0 ? ((Number(totalWon) / totalSpins) * 100).toFixed(1) : '0'}%
                                    </span>
                                </div>
                            </div>
                            
                            {/* Swap CHIPS to ETH Form */}
                            <div className="mt-3 pt-3 border-t border-gray-600">
                                <h4 className="text-md font-bold text-orange-400 mb-2">💸 Swap CHIPS to ETH</h4>
                                
                                {parseFloat(playerWinnings) > 0 && (
                                    <div className="mb-2 p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
                                        <div className="text-xs text-yellow-300">
                                            ⚠️ You have {playerWinnings} CHIPS in winnings. Withdraw them first to swap to ETH.
                                        </div>
                                    </div>
                                )}
                                
                                {swapChipsState.status === 'pending' && (
                                    <div className="mb-3 p-3 rounded-lg border bg-orange-500/20 border-orange-500/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-sm font-bold text-orange-300">
                                                🔄 CHIPS Swap in Progress
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-300">Amount:</span>
                                                <span className="text-orange-300 font-bold">{chipsAmount} CHIPS</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-300">Status:</span>
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                                    <span className="text-orange-300 font-medium">Confirming...</span>
                                                </div>
                                            </div>
                                            
                                            {swapChipsState.hash && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-300">Transaction:</span>
                                                <a
                                                    href={getBlockExplorerUrl(swapChipsState.hash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 font-mono text-xs bg-gray-800/50 px-2 py-1 rounded cursor-pointer transition-colors hover:bg-gray-700/50"
                                                >
                                                    {swapChipsState.hash.slice(0, 8)}...{swapChipsState.hash.slice(-6)}
                                                </a>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="100"
                                            value={chipsAmount}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Allow empty string or valid numbers within balance
                                                if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                    setChipsAmount(value);
                                                }
                                            }}
                                            min="0"
                                            step="1"
                                            disabled={swapChipsState.status === 'pending' || isSpinning}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-20 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <button
                                            onClick={() => {
                                                // Use slightly less than max to avoid precision issues
                                                const maxChips = parseFloat(formatChipsAmount(playerStats.chipBalance));
                                                // Subtract a small amount to ensure we're always under the limit
                                                const safeMaxChips = Math.max(0, maxChips - 0.01);
                                                setChipsAmount(safeMaxChips.toString());
                                            }}
                                            disabled={swapChipsState.status === 'pending' || parseFloat(playerBalance) <= 0 || isSpinning}
                                            className="absolute right-16 top-1/2 -translate-y-1/2 bg-blue-600/30 disabled:bg-gray-600/30 disabled:cursor-not-allowed text-blue-400 disabled:text-gray-500 text-xs font-bold px-1 py-0.5 rounded select-none"
                                        >
                                            MAX
                                        </button>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-400 font-bold text-sm">
                                            CHIPS
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={handleSwapChips}
                                        disabled={!isConnected || !chipsAmount || parseFloat(chipsAmount) <= 0 || parseEther(chipsAmount) > playerStats.chipBalance || swapChipsState.status === 'pending' || isSpinning}
                                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm transition-colors"
                                    >
                                        {swapChipsState.status === 'pending' ? (
                                            <>🔄 Swap in Progress...</>
                                        ) : isSpinning ? (
                                            <>🎰 Spinning - Please Wait...</>
                                        ) : parseFloat(chipsAmount) > parseFloat(playerBalance) ? (
                                            <>❌ Insufficient CHIPS Balance</>
                                        ) : (
                                            <>💸 Swap CHIPS to ETH</>
                                        )}
                                    </button>
                                    
                                    <div className="text-xs text-gray-400 text-center mt-2 space-y-1">
                                        <div>
                                            Swap {chipsAmount || '0'} CHIPS → Get ~{calculateExpectedETH(chipsAmount).toFixed(6)} ETH
                                        </div>
                                        <div className="text-gray-500">
                                            (1 CHIP ≈ $0.20 / ~{chipCostInEth} ETH)
                                        </div>
                                        <div className="text-gray-500 mt-1">
                                            Available: {playerBalance} CHIPS | Winnings: {playerWinnings} CHIPS
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <PhoneHelpLine isConnected={isConnected} />
        </div>
    );
};

export default GamePage;
