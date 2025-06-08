import React, { useRef, useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Wallet, Network, LogOut, Zap } from 'lucide-react';
import type { Address } from 'viem';

// Config imports
import { DegenSlotsABI } from '../config/contracts/DegenSlotsABI';
import { CONTRACT_ADDRESSES } from '../config/wagmi';

// Contexts
import { useAppMode } from '../contexts/AppModeContext';

// Components - Import only what we need
import SlotMachine from './SlotMachine';
import PhoneHelpLine from './PhoneHelpLine';

// Hooks
import { useWallet } from '../hooks/useWallet';
import { useNetworks } from '../hooks/useNetworks';
import { useSlotMachine } from '../hooks/useSlotMachine';
import { useSlotAnimator } from '../hooks/useSlotAnimator';

// Inline GameHeader component to avoid import issues
const GameHeader: React.FC<{
  isConnected: boolean;
  account: Address | undefined;
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
  poolETH?: string;
  ethPrice?: string;
  chipRate?: string;
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
  poolETH,
  ethPrice,
  chipRate,
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
              <div className="flex items-center space-x-4 bg-black/40 rounded-xl px-4 py-2 border border-gray-600">
                <div className="text-center">
                  <div className="text-sm font-bold text-blue-400">{poolETH || '0'} ETH</div>
                  <div className="text-xs text-gray-500">Pool</div>
                </div>
                <div className="w-px h-6 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-sm font-bold text-green-400">{ethPrice || '$0'}</div>
                  <div className="text-xs text-gray-500">ETH</div>
                </div>
                <div className="w-px h-6 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-sm font-bold text-yellow-400">{chipRate || '0'}</div>
                  <div className="text-xs text-gray-500">Rate</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-green-400">🎰 21.8% Win Rate</span>
                <span className="text-yellow-400">🔒 Provably Fair</span>
                <span className="text-purple-400">⚡ VRF Powered</span>
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
                <Network size={12} />
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
                  <LogOut size={14} className="inline mr-2" />
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
          <Zap size={16} className="inline mr-2" />
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
  // Separate hooks like the working module-3 examples
  const {
    // Wallet state
    account, isConnected, connecting, balance,
    // Actions
    connectWallet, disconnectWallet,
  } = useWallet();

  const {
    // Network state  
    currentNetwork, isNetworkSupported, switchingNetwork,
    // Actions
    switchToNetwork,
  } = useNetworks();

  // Get chainId from currentNetwork
  const chainId = currentNetwork?.chainId;

  const {
    displayLCD, betAmount, needsApproval, chipBalance, isApproving, isSpinningTx,
    callbackOnLever, handleSlotResult, approveChipsForPlay, buyChipsWithETH, setBetAmount,
  } = useSlotMachine(chainId);

  // Slot animation system for disconnected users
  const {
    slotMachineRef: animatedSlotRef,
    stopAnimation,
  } = useSlotAnimator({
    reelCount: 3, // Always use 3 reels for disconnected demo
    autoStart: true, // Auto-start the animation automatically
    cyclePause: 4000 // Slightly longer pause between cycles
  });

  const slotMachineRef = useRef<any>(null);
  const [selectedReelCount, setSelectedReelCount] = useState<number>(3);
  
  // Chip insert tease popup state
  const [showChipTease, setShowChipTease] = useState(false);
  const [chipTeaseMessage, setChipTeaseMessage] = useState('');

  // Stop animation when user connects
  useEffect(() => {
    if (isConnected) {
      stopAnimation();
    }
  }, [isConnected, stopAnimation]);

  // Contract data with improved error handling and debugging
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};
  
  console.log('🔍 Contract Debug Info:', {
    chainId,
    currentNetwork: currentNetwork?.name,
    addresses,
    degenSlotsAddress: addresses.DEGEN_SLOTS
  });

  // First, let's check if the contract exists by trying to get its code
  const { data: contractCode } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: [],
    functionName: 'getPoolStats', // This will fail but tell us if contract exists
    query: { 
      enabled: false, // Disabled for now
    },
  });

  // Let's try a simple view call first to see if contract exists
  const { 
    data: poolStats, 
    error: poolStatsError, 
    isLoading: poolStatsLoading,
    isSuccess: poolStatsSuccess 
  } = useReadContract({
    address: addresses.DEGEN_SLOTS, 
    abi: DegenSlotsABI, 
    functionName: 'getPoolStats',
    query: { 
      enabled: !!addresses.DEGEN_SLOTS,
      retry: 3,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const { 
    data: chipsFromETH, 
    error: chipsFromETHError, 
    isLoading: chipsFromETHLoading,
    isSuccess: chipsFromETHSuccess 
  } = useReadContract({
    address: addresses.DEGEN_SLOTS, 
    abi: DegenSlotsABI, 
    functionName: 'calculateChipsFromETH',
    args: [BigInt(1e18)], // 1 ETH
    query: { 
      enabled: !!addresses.DEGEN_SLOTS,
      retry: 3,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Enhanced debug logging
  console.log('📊 Contract Data Debug:', {
    contractAddress: addresses.DEGEN_SLOTS,
    poolStats: poolStats ? poolStats : 'null/empty',
    poolStatsError: poolStatsError?.message || 'none',
    poolStatsLoading,
    poolStatsSuccess,
    chipsFromETH: chipsFromETH ? chipsFromETH : 'null/empty',
    chipsFromETHError: chipsFromETHError?.message || 'none',
    chipsFromETHLoading,
    chipsFromETHSuccess
  });

  if (poolStatsError) {
    console.error('❌ Pool Stats Error Details:', poolStatsError);
  }
  if (chipsFromETHError) {
    console.error('❌ Chips From ETH Error Details:', chipsFromETHError);
  }

  if (poolStats) {
    console.log('🎰 Pool Stats Raw Data:', poolStats);
  }
  if (chipsFromETH) {
    console.log('🪙 Chips from ETH Raw Data:', chipsFromETH);
  }

  // Format data with better error handling
  const formattedPoolETH = (() => {
    try {
      if (!poolStats || !Array.isArray(poolStats)) return '0.0';
      const poolAmount = poolStats[0] as bigint;
      return parseFloat(formatEther(poolAmount)).toFixed(2);
    } catch (error) {
      console.error('Error formatting pool ETH:', error);
      return '0.0';
    }
  })();

  const ethPrice = (() => {
    try {
      if (!poolStats || !Array.isArray(poolStats)) return '$0';
      if (!poolStats[2]) return '$0';
      const priceInCents = Number(poolStats[2] as bigint);
      return `$${(priceInCents / 100).toFixed(0)}`;
    } catch (error) {
      console.error('Error formatting ETH price:', error);
      return '$0';
    }
  })();

  const chipRate = (() => {
    try {
      if (!chipsFromETH) return '0';
      const chipsAmount = parseFloat(formatEther(chipsFromETH as bigint));
      return chipsAmount.toFixed(0);
    } catch (error) {
      console.error('Error formatting chip rate:', error);
      return '0';
    }
  })();

  // Show loading states in UI
  const displayPoolETH = poolStatsLoading ? 'Loading...' : formattedPoolETH;
  const displayEthPrice = poolStatsLoading ? 'Loading...' : ethPrice;
  const displayChipRate = chipsFromETHLoading ? 'Loading...' : chipRate;

  // Reel configs
  const reelConfigs = [
    { count: 3, cost: 1, price: '$0.20', name: 'Classic', color: 'bg-green-600' },
    { count: 4, cost: 10, price: '$2.00', name: 'Extended', color: 'bg-blue-600' },
    { count: 5, cost: 100, price: '$20', name: 'Premium', color: 'bg-purple-600' },
    { count: 6, cost: 500, price: '$100', name: 'High Roller', color: 'bg-red-600' },
    { count: 7, cost: 1000, price: '$200', name: 'Whale Mode', color: 'bg-yellow-600' },
  ];

  // Event handlers
  const handleSlotResultWrapper = (symbols: number[], payout: number, payoutType: string) => {
    handleSlotResult(symbols, payout, payoutType);
    
    // Show result quote in connected mode
    if (isConnected && slotMachineRef.current?.lcd) {
      const { QuoteManager } = require('../utils/quotes');
      const resultQuote = QuoteManager.getResultQuote(symbols);
      setTimeout(() => {
        slotMachineRef.current?.lcd?.setMessage(resultQuote);
      }, 1000);
    }
  };

  const handleSlotStateChange = (state: string) => {
    // Show state-appropriate quotes in connected mode
    if (isConnected && slotMachineRef.current?.lcd) {
      const { QuoteManager } = require('../utils/quotes');
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

  // Handle chip insert when disconnected - show funny popup
  const handleChipInsertTease = () => {
    const { QuoteManager } = require('../utils/quotes');
    const teaseMessage = QuoteManager.getChipInsertTeaseQuote();
    setChipTeaseMessage(teaseMessage);
    setShowChipTease(true);
    
    // Hide popup after 4 seconds
    setTimeout(() => {
      setShowChipTease(false);
    }, 4000);
  };

  // Disconnected mode
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            {/* Pool info display integrated into main content */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-4 bg-black/40 rounded-xl px-6 py-3 border border-gray-600">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{displayPoolETH || '0'} ETH</div>
                  <div className="text-xs text-gray-500">Pool</div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{displayEthPrice || '$0'}</div>
                  <div className="text-xs text-gray-500">ETH Price</div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">{displayChipRate || '0'}</div>
                  <div className="text-xs text-gray-500">CHIPS/ETH</div>
                </div>
              </div>
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
        onSwitchToLocal={() => switchToNetwork('hardhat')}
        onSwitchToMainnet={() => switchToNetwork('mainnet')} 
        onSwitchToSepolia={() => switchToNetwork('sepolia')}
        isSwitchPending={switchingNetwork}
      />

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
                    onClick={() => setSelectedReelCount(config.count)}
                    className={`p-2 rounded-lg text-white font-medium transition-all text-sm ${
                      selectedReelCount === config.count ? config.color : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {config.count} Reels • {config.cost} CHIPS • {config.price}
                  </button>
                ))}
              </div>
              
              {/* Current Selection */}
              <div className="mt-2 p-2 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Selected:</div>
                  <div className="text-lg font-bold text-yellow-400">
                    🪙 {reelConfigs.find(c => c.count === selectedReelCount)?.cost || 0} CHIPS
                  </div>
                </div>
              </div>
            </div>

            {/* Your Balance */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-green-400 mb-2">💰 Your Balance</h3>
              <div className="text-center mb-2">
                <div className="text-2xl font-bold text-green-400">
                  🪙 {chipBalance ? parseFloat(formatEther(chipBalance)).toFixed(2) : '0.00'}
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
                  <span className="text-green-400 font-medium">~$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <span className="text-purple-400 font-medium">Hardhat</span>
                </div>
              </div>
              
              {/* Status & limits */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-yellow-400 font-medium">Ready to Play</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily Limit:</span>
                  <span className="text-orange-400 font-medium">1000 CHIPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Today Used:</span>
                  <span className="text-red-400 font-medium">0 CHIPS</span>
                </div>
              </div>
            </div>

            {/* Pool Stats */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-blue-400 mb-2">📊 Pool Stats</h3>
              <div className="space-y-1 text-xs mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Prize Pool:</span>
                  <span className="text-blue-400 font-medium">{displayPoolETH} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ETH Price:</span>
                  <span className="text-green-400 font-medium">{displayEthPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CHIPS/ETH:</span>
                  <span className="text-yellow-400 font-medium">{displayChipRate}</span>
                </div>
              </div>
              
              {/* Live stats */}
              <div className="space-y-1 text-xs mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Online Now:</span>
                  <span className="text-purple-400 font-medium">87 Players</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume:</span>
                  <span className="text-orange-400 font-medium">12.4 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Spins:</span>
                  <span className="text-cyan-400 font-medium">2,341</span>
                </div>
              </div>
              
              {/* House info */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">House Edge:</span>
                  <span className="text-red-400 font-medium">2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">RTP:</span>
                  <span className="text-green-400 font-medium">97.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Winner:</span>
                  <span className="text-yellow-400 font-medium">5K CHIPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Slot Machine (Featured) */}
          <div className="flex justify-center bg-black/20 rounded-xl p-3">
            <SlotMachine
              key={`slot-machine-${selectedReelCount}`}
              ref={slotMachineRef} onResult={handleSlotResultWrapper} onStateChange={handleSlotStateChange}
              isConnected={isConnected} reelCount={selectedReelCount}
            />
          </div>

          {/* Bottom Row - Actions in horizontal layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Buy CHIPS */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-green-400 mb-2">💎 Buy CHIPS</h3>
              <div className="space-y-2">
                <input
                  type="number" placeholder="0.1" defaultValue="0.1"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
                <button onClick={() => buyChipsWithETH('0.1')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-sm">
                  Buy CHIPS
                </button>
                <div className="text-xs text-gray-400">Expected: ~{displayChipRate} CHIPS per ETH</div>
              </div>
            </div>

            {/* Credit/Loan Quick Access */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-red-400 mb-2">💳 Credit & Leverage</h3>
              
              {/* CHIPS Balance - Compact */}
              <div className="bg-gray-800/50 rounded-lg p-2 mb-2 border border-gray-600">
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">
                    {chipBalance ? parseFloat(formatEther(chipBalance)).toFixed(2) : '0.00'}
                  </div>
                  <div className="text-xs text-gray-400">CHIPS Balance</div>
                </div>
              </div>

              {/* Credit Stats - Compact */}
              <div className="space-y-1 mb-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Collateral:</span>
                  <span className="text-green-400 font-medium">0.00 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Power:</span>
                  <span className="text-blue-400 font-medium">0 CHIPS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 rounded-lg text-xs transition-colors">
                  💰 Deposit
                </button>
                <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-1 rounded-lg text-xs transition-colors">
                  🚀 Borrow
                </button>
              </div>
            </div>

            {/* Player Stats */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-purple-400 mb-2">🏆 Your Stats</h3>
              <div className="space-y-1 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="text-green-400 font-medium">26.9%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Spins:</span>
                  <span className="text-blue-400 font-medium">156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Biggest Win:</span>
                  <span className="text-yellow-400 font-medium">15K CHIPS</span>
                </div>
              </div>
              
              {/* Additional stats */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Wagered:</span>
                  <span className="text-orange-400 font-medium">2.1K CHIPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Net P&L:</span>
                  <span className="text-red-400 font-medium">-180 CHIPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Streak:</span>
                  <span className="text-purple-400 font-medium">3 Losses</span>
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