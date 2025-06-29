import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { useReadContract } from 'wagmi';

import SlotMachine, { SlotMachineRef } from './SlotMachine';
import PhoneHelpLine from './PhoneHelpLine';
import PoolStats from './PoolStats';

import { useWallet } from '../hooks/useWallet';
import { useNetworks } from '../hooks/useNetworks';
import { useCasinoContract } from '../hooks/useCasinoContract';
import { useSlotAnimator } from '../hooks/useSlotAnimator';
import { usePoolData } from '../hooks/usePoolData';

import { QuoteManager } from '../utils/quotes';

import { CasinoSlotABI } from '../config/contracts/CasinoSlotABI';

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
  onSwitchToMainnet: () => void;
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
            {/* Network (Connected only) */}
            {isConnected && currentChain && (
              <div className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
                isSupported ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <span>{currentChain.name}</span>
                {!isSupported && (
                  <button onClick={onSwitchToLocal} disabled={isSwitchPending} className="ml-1 px-2 py-1 bg-blue-600 rounded text-white">
                    Fix
                  </button>
                )}
              </div>
            )}

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
                  onClick={onDisconnect}
                  className="bg-red-500/30 hover:bg-red-500/50 text-red-300 hover:text-white rounded-lg px-3 py-2 text-sm font-medium transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={connecting}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg px-4 py-2 text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
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

  // Get chainId from currentNetwork
  const chainId = currentNetwork?.chainId;

  // Pool data hook for proper loading states
  const poolData = usePoolData(chainId);

  // Casino contract hook - for connected mode
  const {
    // Data states
    playerStats,
    gameStats,
    spinCosts,
    isLoadingData,
    latestSpinResult,
    
    // Transaction states
    buyChipsState,
    spinState,
    withdrawState,
    
    // Spin management
    selectedReelCount,
    setSelectedReelCount,
    currentAllowance,
    
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
  } = useCasinoContract();

  // Slot animation system for disconnected users
  const {
    slotMachineRef: animatedSlotRef,
    stopAnimation,
  } = useSlotAnimator({
    reelCount: 3, // Always use 3 reels for disconnected demo
    autoStart: true, // Auto-start the animation automatically
    cyclePause: 4000 // Slightly longer pause between cycles
  });

  // Local UI state
  const [gamePhase, setGamePhase] = useState<'idle' | 'selecting' | 'approving' | 'ready' | 'spinning' | 'result'>('idle');
  const [ethAmount, setEthAmount] = useState<string>('0.1');

  // Chip insert tease popup state
  const [showChipTease, setShowChipTease] = useState(false);
  const [chipTeaseMessage, setChipTeaseMessage] = useState('');

  // Stop animation when user connects
  useEffect(() => {
    if (isConnected) {
      stopAnimation();
    }
  }, [isConnected, stopAnimation]);

  // Add page protection during spinning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gamePhase === 'spinning') {
        e.preventDefault();
        e.returnValue = 'You have a spin in progress! Are you sure you want to leave?';
        return 'You have a spin in progress! Are you sure you want to leave?';
      }
    };

    if (gamePhase === 'spinning') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gamePhase]);

  // Refs
  const slotMachineRef = useRef<SlotMachineRef>(null);

  // Reel configs - removed static USD pricing since we now have dynamic VRF pricing
  const reelConfigs = [
    { count: 3, cost: formatEther(spinCosts.reels3), name: 'Classic', color: 'bg-green-600' },
    { count: 4, cost: formatEther(spinCosts.reels4), name: 'Extended', color: 'bg-blue-600' },
    { count: 5, cost: formatEther(spinCosts.reels5), name: 'Premium', color: 'bg-purple-600' },
    { count: 6, cost: formatEther(spinCosts.reels6), name: 'High Roller', color: 'bg-red-600' },
    { count: 7, cost: formatEther(spinCosts.reels7), name: 'Whale Mode', color: 'bg-yellow-600' },
  ];

  // Handle chip insert when disconnected - show funny popup
  const handleChipInsertTease = () => {
    const teaseMessage = QuoteManager.getChipInsertTeaseQuote();
    setChipTeaseMessage(teaseMessage);
    setShowChipTease(true);
    
    // Hide popup after 4 seconds
    setTimeout(() => {
      setShowChipTease(false);
    }, 4000);
  };

  // Phase 2: Insert chips (approve spending)
  const handleChipInsert = useCallback(async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    const cost = getCurrentSpinCost();
    
    // Check if user has enough chips
    if (playerStats.chipBalance < cost) {
      toast.error('Insufficient CHIPS! Buy more or use credit.');
      return;
    }

    // Check if already approved
    if (currentAllowance >= cost) {
      setGamePhase('ready');
      slotMachineRef.current?.lcd.setMessage("Ready to spin! Pull the lever!");
      return;
    }

    // Need approval
    setGamePhase('approving');
    slotMachineRef.current?.lcd.setMessage("Approving CHIPS spending...");
    
    const hash = await approveChips(cost);
    if (hash) {
      setGamePhase('ready');
      slotMachineRef.current?.lcd.setMessage("CHIPS approved! Pull the lever!");
    } else {
      setGamePhase('selecting');
      slotMachineRef.current?.lcd.setMessage("Approval failed. Try again.");
    }
  }, [isConnected, getCurrentSpinCost, playerStats.chipBalance, currentAllowance, approveChips]);

  // Phase 3: Pull lever (execute spin)
  const handleLeverPull = useCallback(async () => {
    if (!canSpin()) {
      toast.error('Cannot spin - check CHIPS balance and approval');
      return;
    }

    setGamePhase('spinning');
    slotMachineRef.current?.lcd.setMessage("Spinning... Waiting for VRF...");
    
    // Start slot machine animation
    slotMachineRef.current?.startSpin();
    
    // Execute blockchain transaction
    const hash = await spinReels(selectedReelCount);
    
    if (hash) {
      // Transaction successful - VRF will eventually call back via event.
      // We no longer need the mock result timeout.
      console.log('Spin transaction sent:', hash);
    } else {
      setGamePhase('selecting');
      slotMachineRef.current?.lcd.setMessage("Spin failed. Try again.");
    }
  }, [canSpin, spinReels, selectedReelCount]);

  // Helper function to determine quote type based on payout amount
  const getQuoteTypeForPayout = (payoutAmount: number, symbols: number[]) => {
    if (payoutAmount === 0) {
      return QuoteManager.getStateQuote('losing');
    }
    
    // Analyze the symbol pattern
    const analysis = QuoteManager.analyzeResult(symbols);
    
    // Map payout ranges to excitement levels
    if (payoutAmount >= 10000) {
      // Huge wins (10k+ CHIPS) = Jackpot level excitement
      return QuoteManager.getCombinationQuote(selectedReelCount, 'jackpot');
    } else if (payoutAmount >= 1000) {
      // Big wins (1k+ CHIPS) = High excitement
      return QuoteManager.getCombinationQuote(selectedReelCount, analysis.type === 'jackpot' ? 'jackpot' : 'matching');
    } else if (payoutAmount >= 100) {
      // Medium wins (100+ CHIPS) = Moderate excitement
      return QuoteManager.getCombinationQuote(selectedReelCount, 'matching');
    } else {
      // Small wins = Encouraging
      return QuoteManager.getStateQuote('winning');
    }
  };

  // Phase 4: Handle spin result
  const handleSpinResult = useCallback((symbols: number[], payout: bigint, payoutType: number) => {
    setGamePhase('result');

    // Update slot machine with result
    slotMachineRef.current?.setAllReelTargets(symbols);
    
    const payoutAmount = Number(formatEther(payout));
    
    if (payout > 0n) {
      // Get appropriate message based on payout amount and symbols
      const resultQuote = getQuoteTypeForPayout(payoutAmount, symbols);
      
      // Set LCD message to celebratory quote
      slotMachineRef.current?.lcd.setMessage(resultQuote);
      
      // Only show toast notifications in connected mode
      if (isConnected) {
        toast.success(`🎉 ${resultQuote} Won ${formatEther(payout)} CHIPS!`);
      }
    } else {
      // Get encouraging message for losses
      const loseQuote = QuoteManager.getStateQuote('losing');
      slotMachineRef.current?.lcd.setMessage(loseQuote);
      
      // No toast for losses in any mode
    }
    
    // Auto-reset after showing result
    setTimeout(() => {
      setGamePhase('idle');
      slotMachineRef.current?.lcd.setIdlePattern();
      if (isConnected) {
        refreshAllData(); // Only refresh data when connected
      }
    }, 3000);
  }, [selectedReelCount, refreshAllData, isConnected]);

  // This effect handles the spin result from the contract event
  useEffect(() => {
    if (latestSpinResult && gamePhase === 'spinning') {
      console.log("New spin result from contract:", latestSpinResult);
      handleSpinResult(latestSpinResult.symbols, latestSpinResult.payout, latestSpinResult.payoutType);
    }
  }, [latestSpinResult, gamePhase, handleSpinResult]);

  // Event handlers for quotes
  const handleSlotResultWrapper = (symbols: number[], payout: number, payoutType: string) => {
    handleSpinResult(symbols, BigInt(payout), typeof payoutType === 'string' ? 0 : payoutType);
    
    // Show result quote in connected mode only
    if (isConnected && slotMachineRef.current?.lcd) {
      const resultQuote = QuoteManager.getResultQuote(symbols);
      setTimeout(() => {
        slotMachineRef.current?.lcd?.setMessage(resultQuote);
      }, 1000);
    }
  };

  const handleSlotStateChange = (state: string) => {
    // Show state-appropriate quotes in connected mode
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
      toast.success('Winnings withdrawn successfully!');
    }
  }, [withdrawWinnings]);

  // Network switching handlers
  const handleSwitchToLocal = () => switchToNetwork('hardhat');
  const handleSwitchToSepolia = () => switchToNetwork('sepolia');
  const handleSwitchToMainnet = () => switchToNetwork('mainnet');

  // Format player stats
  const playerBalance = formatEther(playerStats.chipBalance);
  const playerWinnings = formatEther(playerStats.winnings);
  const totalSpins = Number(playerStats.totalSpins);
  const totalWon = formatEther(playerStats.totalWon);

  // Format game stats - use the connected mode data
  const formattedPoolETH = isConnected ? formatEther(gameStats.prizePool) : poolData.poolETH;
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

  // Check if currently spinning - this will disable ALL buttons
  const isSpinning = gamePhase === 'spinning';
  const isLeverDisabled = !canSpin() || isSpinning;

  // Disconnected mode
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            {/* Pool info display integrated into main content */}
            <div className="flex justify-center mb-6">
              <PoolStats
                poolETH={poolData.poolETH}
                ethPrice={poolData.ethPrice}
                chipRate={poolData.chipRate}
                isLoading={poolData.isLoading}
                error={poolData.error}
                layout="horizontal"
                showLabels={true}
                className="bg-black/40 rounded-xl px-6 py-3 border border-gray-600"
              />
            </div>

            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-600 bg-clip-text text-transparent">
              🎰 The Leverage Lounge
            </h1>
            <p className="text-xl text-gray-300">Provably Fair Degen Slot Machine</p>
            <p className="text-lg text-yellow-400">Watch the magic happen... then connect for the real deal!</p>

            {/* Animated Slot Machine */}
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

            {/* Connect Wallet CTA */}
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
              
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-black font-bold text-lg px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                {connecting ? '🔄 Connecting...' : '🦊 Connect Wallet & Play!'}
              </button>
            </div>

            {/* Payout Information */}
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="bg-yellow-600 px-3 py-1 rounded-full">🐵 Jackpot: 666x</span>
              <span className="bg-purple-600 px-3 py-1 rounded-full">🚀🚀🚀 Ultra: 555x</span>
              <span className="bg-blue-600 px-3 py-1 rounded-full">💎💎💎 Mega: 444x</span>
              <span className="bg-green-600 px-3 py-1 rounded-full">📈📈📈 Big: 333x</span>
            </div>

            {/* Feature Highlights */}
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

  // Connected mode - Always use the beautiful stacked layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <GameHeader
        isConnected={true} account={account} balance={balance} connecting={connecting}
        onConnect={connectWallet} onDisconnect={disconnectWallet} chainId={chainId}
        currentChain={currentNetwork} isSupported={isNetworkSupported} 
        onSwitchToLocal={handleSwitchToLocal}
        onSwitchToMainnet={handleSwitchToMainnet} 
        onSwitchToSepolia={handleSwitchToSepolia}
        isSwitchPending={switchingNetwork}
        poolData={poolData}
      />

      {/* Loading Overlay */}
      {isLoadingData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading casino data...</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-4">
        {/* Stacked layout with slot machine in center - Compact for single page */}
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
              
              {/* Current Selection */}
              <div className="mt-2 p-2 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Selected:</div>
                  <div className="text-lg font-bold text-yellow-400">
                    🪙 {formatEther(getCurrentSpinCost())} CHIPS
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
              
              {/* Wallet info */}
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
              
              {/* Status & limits */}
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
              
              {/* Withdraw Winnings Button */}
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
              
              {/* House info */}
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
              onResult={(symbols, payout, payoutType) => {
                // Convert number payout to bigint for our handler
                handleSpinResult(symbols, BigInt(payout), typeof payoutType === 'string' ? 0 : payoutType);
              }}
              onStateChange={(state) => {
                console.log('Slot machine state:', state);
              }}
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
              
              {/* Transaction Status Display */}
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
                        <span className="text-blue-400 hover:text-blue-300 font-mono text-xs bg-gray-800/50 px-2 py-1 rounded">
                          {buyChipsState.hash.slice(0, 8)}...{buyChipsState.hash.slice(-6)}
                        </span>
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
                      const maxETH = parseFloat(balance) - 0.01; // Leave 0.01 ETH for gas
                      // Cap input to max available ETH
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
                      const maxETH = (parseFloat(balance) - 0.01).toFixed(3); // Leave 0.01 ETH for gas
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
              
              {/* Current Selection Info */}
              <div className="bg-gray-800/50 rounded-lg p-2 mb-2 border border-gray-600">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Selected Game:</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {selectedReelCount} Reels
                  </div>
                  <div className="text-xs text-gray-400">
                    Cost: {formatEther(getCurrentSpinCost())} CHIPS
                  </div>
                </div>
              </div>

              {/* Game Phase Display */}
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Current Phase:</div>
                  <div className={`text-lg font-bold ${
                    gamePhase === 'idle' ? 'text-gray-400' :
                    gamePhase === 'selecting' ? 'text-blue-400' :
                    gamePhase === 'approving' ? 'text-orange-400' :
                    gamePhase === 'ready' ? 'text-yellow-400' :
                    gamePhase === 'spinning' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {gamePhase === 'idle' && '🎰 Ready to Play'}
                    {gamePhase === 'selecting' && '🎯 Select Stakes'}
                    {gamePhase === 'approving' && '🔄 Approving CHIPS'}
                    {gamePhase === 'ready' && '🎯 Ready to Spin'}
                    {gamePhase === 'spinning' && '⚡ Spinning...'}
                    {gamePhase === 'result' && '🎉 Result!'}
                  </div>
                </div>

                {/* Quick Stats */}
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
                      {formatEther(currentAllowance).slice(0, 6)}
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
            </div>
          </div>
        </div>
      </main>

      <PhoneHelpLine isConnected={isConnected} />
    </div>
  );
};

export default GamePage; 