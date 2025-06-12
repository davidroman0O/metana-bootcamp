import React, { useState, useRef, useCallback } from 'react';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';

// Components
import SlotMachine, { SlotMachineRef } from './SlotMachine';
import PhoneHelpLine from './PhoneHelpLine';

// Hooks
import { useWallet } from '../hooks/useWallet';
import { useNetworks } from '../hooks/useNetworks';
import { useCasinoContract } from '../hooks/useCasinoContract';

// Inline GameHeader component to avoid import issues
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
    formatBalance,
  } = useWallet();

  const {
    currentNetwork,
    isNetworkSupported,
    switchingNetwork,
    switchToNetwork,
  } = useNetworks();

  // Casino contract hook - our main data source
  const {
    // Data states
    playerStats,
    gameStats,
    spinCosts,
    isLoadingData,
    
    // Transaction states
    buyChipsState,
    spinState,
    depositCollateralState,
    borrowChipsState,
    repayLoanState,
    
    // Spin management
    selectedReelCount,
    setSelectedReelCount,
    currentAllowance,
    
    // Contract functions
    buyChips,
    approveChips,
    spinReels,
    depositCollateral,
    borrowChips,
    repayLoan,
    repayLoanWithETH,
    
    // Helper functions
    canSpin,
    getCurrentSpinCost,
    calculateExpectedChips,
    refreshAllData,
  } = useCasinoContract();
  
  // Local UI state
  const [gamePhase, setGamePhase] = useState<'idle' | 'selecting' | 'approving' | 'spinning' | 'result'>('idle');
  const [ethAmount, setEthAmount] = useState<string>('0.1');

  // Credit/Loan UI state
  const [collateralAmount, setCollateralAmount] = useState<string>('0.5');
  const [borrowAmount, setBorrowAmount] = useState<string>('0.1');
  const [repayChipsAmount, setRepayChipsAmount] = useState<string>('');
  const [repayETHAmount, setRepayETHAmount] = useState<string>('');
  
  // Refs
  const slotMachineRef = useRef<SlotMachineRef>(null);

  // Reel configs
  const reelConfigs = [
    { count: 3, cost: formatEther(spinCosts.reels3), price: '$0.20', name: 'Classic', color: 'bg-green-600' },
    { count: 4, cost: formatEther(spinCosts.reels4), price: '$2.00', name: 'Extended', color: 'bg-blue-600' },
    { count: 5, cost: formatEther(spinCosts.reels5), price: '$20', name: 'Premium', color: 'bg-purple-600' },
    { count: 6, cost: formatEther(spinCosts.reels6), price: '$100', name: 'High Roller', color: 'bg-red-600' },
    { count: 7, cost: formatEther(spinCosts.reels7), price: '$200', name: 'Whale Mode', color: 'bg-yellow-600' },
  ];

  // Demo mode for disconnected users
  const startDemoSpin = useCallback(() => {
    if (!slotMachineRef.current) return;
    
    const demoSymbols = Array(selectedReelCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
    slotMachineRef.current.startSpin(demoSymbols);
    
    setTimeout(() => {
      slotMachineRef.current?.lcd.setMessage("DEMO MODE - Connect wallet to play for real!");
    }, 3000);
  }, [selectedReelCount]);

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
      setGamePhase('spinning');
      slotMachineRef.current?.lcd.setMessage("Ready to spin! Pull the lever!");
      return;
    }

    // Need approval
    setGamePhase('approving');
    slotMachineRef.current?.lcd.setMessage("Approving CHIPS spending...");
    
    const hash = await approveChips(cost);
    if (hash) {
      setGamePhase('spinning');
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
      // Transaction successful - VRF will eventually call back
      setTimeout(() => {
        // In real implementation, this would come from VRF callback
        const mockResult = Array(selectedReelCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
        handleSpinResult(mockResult, 0n, 0);
      }, 5000);
    } else {
      setGamePhase('selecting');
      slotMachineRef.current?.lcd.setMessage("Spin failed. Try again.");
    }
  }, [canSpin, spinReels, selectedReelCount]);

  // Phase 4: Handle spin result
  const handleSpinResult = useCallback((symbols: number[], payout: bigint, payoutType: number) => {
    setGamePhase('result');

    // Update slot machine with result
    slotMachineRef.current?.setAllReelTargets(symbols);
    
    if (payout > 0n) {
      slotMachineRef.current?.lcd.setWinPattern(Number(formatEther(payout)));
      toast.success(`You won ${formatEther(payout)} CHIPS!`);
    } else {
      slotMachineRef.current?.lcd.setMessage("No win this time. Try again!");
    }
    
    // Auto-reset after showing result
    setTimeout(() => {
      setGamePhase('idle');
      slotMachineRef.current?.lcd.setIdlePattern();
      refreshAllData(); // Refresh all data
    }, 3000);
  }, [refreshAllData]);

  // Buy chips handler
  const handleBuyChips = useCallback(async () => {
    const hash = await buyChips(ethAmount);
    if (hash) {
      toast.success('CHIPS purchased successfully!');
    }
  }, [buyChips, ethAmount]);

  // Credit/Loan handlers
  const handleDepositCollateral = useCallback(async () => {
    const hash = await depositCollateral(collateralAmount);
    if (hash) {
      toast.success(`Collateral of ${collateralAmount} ETH deposited successfully!`);
    }
  }, [depositCollateral, collateralAmount]);

  const handleBorrowChips = useCallback(async () => {
    const hash = await borrowChips(borrowAmount);
    if (hash) {
      toast.success(`CHIPS borrowed for ${borrowAmount} ETH worth!`);
    }
  }, [borrowChips, borrowAmount]);

  const handleRepayWithChips = useCallback(async () => {
    const hash = await repayLoan(repayChipsAmount);
    if (hash) {
      toast.success(`Loan repaid with ${repayChipsAmount} CHIPS!`);
      setRepayChipsAmount(''); // Clear input
    }
  }, [repayLoan, repayChipsAmount]);

  const handleRepayWithETH = useCallback(async () => {
    const hash = await repayLoanWithETH(repayETHAmount);
    if (hash) {
      toast.success(`Loan repaid with ${repayETHAmount} ETH!`);
      setRepayETHAmount(''); // Clear input
    }
  }, [repayLoanWithETH, repayETHAmount]);

  // Calculate expected CHIPS amount
  const expectedChips = (() => {
    try {
      return calculateExpectedChips(ethAmount).toString();
    } catch {
      return '0';
    }
  })();

  // Network switching handlers
  const handleSwitchToLocal = () => switchToNetwork('hardhat');
  const handleSwitchToSepolia = () => switchToNetwork('sepolia');
  const handleSwitchToMainnet = () => switchToNetwork('mainnet');

  // Get chainId from currentNetwork
  const chainId = currentNetwork?.chainId;

  // Format player stats
  const playerBalance = formatEther(playerStats.chipBalance);
  const playerWinnings = formatEther(playerStats.winnings);
  const totalSpins = Number(playerStats.totalSpins);
  const totalWon = formatEther(playerStats.totalWon);
  const borrowedAmount = formatEther(playerStats.borrowedAmount);
  const borrowingPower = formatEther(playerStats.accountLiquidity);

  // Format game stats
  const formattedPoolETH = formatEther(gameStats.prizePool);
  const ethPrice = gameStats.ethPrice;
  const chipRate = gameStats.chipRate;

  // Calculate USD value of CHIPS balance
  const chipBalanceUSD = (() => {
    try {
      const chipsBalance = parseFloat(playerBalance);
      return (chipsBalance * 0.20).toFixed(2);
    } catch (error) {
      return '0.00';
    }
  })();

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
                  <div className="text-lg font-bold text-blue-400">{formattedPoolETH || '0'} ETH</div>
                  <div className="text-xs text-gray-500">Pool</div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{ethPrice || '$0'}</div>
                  <div className="text-xs text-gray-500">ETH</div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">{chipRate || '0'}</div>
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
                ref={slotMachineRef}
                onResult={() => {
                  slotMachineRef.current?.lcd.setMessage("DEMO - Connect wallet for real play!");
                }}
                onStateChange={(state) => {
                  console.log('Slot machine state:', state);
                }}
                isConnected={false}
                reelCount={3}
                onCoinInsert={startDemoSpin}
              />
            </div>

            {/* Connect Wallet CTA */}
            <div className="bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-pink-500/20 rounded-xl p-6 border border-yellow-500/30 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-yellow-400 mb-3">🔥 Ready for the Real Deal?</h3>
              <p className="text-lg text-gray-300 mb-4">
                This is just a taste! Connect your wallet to play with real CHIPS and win real rewards!
              </p>
              
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-black font-bold text-lg px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                {connecting ? '🔄 Connecting...' : '🦊 Connect Wallet & Play!'}
              </button>
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
                <div className="flex justify-between">
                  <span className="text-gray-400">Borrowed:</span>
                  <span className="text-red-400 font-medium">{borrowedAmount} ETH</span>
                </div>
              </div>
            </div>

            {/* Pool Stats */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-blue-400 mb-2">📊 Pool Stats</h3>
              <div className="space-y-1 text-xs mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Prize Pool:</span>
                  <span className="text-blue-400 font-medium">{formattedPoolETH} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ETH Price:</span>
                  <span className="text-green-400 font-medium">{ethPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CHIPS/ETH:</span>
                  <span className="text-yellow-400 font-medium">{chipRate}</span>
                </div>
              </div>
              
              {/* Live stats */}
              <div className="space-y-1 text-xs mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume:</span>
                  <span className="text-orange-400 font-medium">~{formattedPoolETH} ETH</span>
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
                    onChange={(e) => setEthAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    disabled={buyChipsState.status === 'pending'}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-12 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 font-bold text-sm">
                    ETH
                  </div>
                </div>
                
                <button 
                  onClick={handleBuyChips}
                  disabled={!isConnected || !ethAmount || parseFloat(ethAmount) <= 0 || buyChipsState.status === 'pending'}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  {buyChipsState.status === 'pending' ? (
                    <>🔄 Purchase in Progress...</>
                  ) : (
                    <>💰 Buy CHIPS with ETH</>
                  )}
                </button>
                
                <div className="text-xs text-gray-400 text-center">
                  Send {ethAmount || '0'} ETH → Get ~{expectedChips} CHIPS
                </div>
              </div>
            </div>

            {/* Credit/Loan Quick Access */}
            <div className="bg-black/30 rounded-xl p-3 border border-gray-600">
              <h3 className="text-lg font-bold text-red-400 mb-2">💳 Credit & Leverage</h3>
              
              {/* Current Status - Compact */}
              <div className="bg-gray-800/50 rounded-lg p-2 mb-2 border border-gray-600">
                <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                    <div className="text-sm font-bold text-yellow-400">{playerBalance}</div>
                    <div className="text-gray-400">CHIPS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-red-400">{borrowedAmount}</div>
                    <div className="text-gray-400">Debt ETH</div>
                  </div>
                </div>
                <div className="text-center mt-1">
                  <div className="text-xs font-bold text-blue-400">{borrowingPower} ETH Available</div>
                </div>
              </div>

              {/* Transaction Status Display */}
              {(depositCollateralState.status === 'pending' || borrowChipsState.status === 'pending' || repayLoanState.status === 'pending') && (
                <div className="mb-2 p-2 rounded-lg border bg-blue-500/20 border-blue-500/50">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-blue-300 text-xs font-medium">
                      {depositCollateralState.status === 'pending' && 'Depositing collateral...'}
                      {borrowChipsState.status === 'pending' && 'Borrowing CHIPS...'}
                      {repayLoanState.status === 'pending' && 'Repaying loan...'}
                    </span>
                </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                {/* Deposit Collateral */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="0.5"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={depositCollateralState.status === 'pending'}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    />
                    <button
                      onClick={handleDepositCollateral}
                      disabled={!isConnected || !collateralAmount || parseFloat(collateralAmount) <= 0 || depositCollateralState.status === 'pending'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-3 py-1 rounded text-xs transition-colors"
                    >
                      💰 Deposit
                    </button>
                </div>
                  <div className="text-xs text-gray-500">Deposit ETH as collateral</div>
              </div>

                {/* Borrow CHIPS */}
              <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="0.1"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={borrowChipsState.status === 'pending'}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    />
                <button 
                      onClick={handleBorrowChips}
                      disabled={!isConnected || !borrowAmount || parseFloat(borrowAmount) <= 0 || parseFloat(borrowingPower) === 0 || borrowChipsState.status === 'pending'}
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-3 py-1 rounded text-xs transition-colors"
                >
                      🚀 Borrow
                </button>
                  </div>
                  <div className="text-xs text-gray-500">Borrow CHIPS (ETH equivalent)</div>
                </div>

                {/* Repay Loan - Only show if user has debt */}
                {parseFloat(borrowedAmount) > 0 && (
                  <>
                    <hr className="border-gray-600" />
                    <div className="text-xs text-orange-400 font-medium">💳 Repay Loan</div>
                    
                    {/* Repay with CHIPS */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="CHIPS"
                          value={repayChipsAmount}
                          onChange={(e) => setRepayChipsAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          disabled={repayLoanState.status === 'pending'}
                          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                        />
                <button 
                          onClick={handleRepayWithChips}
                          disabled={!isConnected || !repayChipsAmount || parseFloat(repayChipsAmount) <= 0 || parseFloat(playerBalance) < parseFloat(repayChipsAmount) || repayLoanState.status === 'pending'}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-3 py-1 rounded text-xs transition-colors"
                >
                          🪙 Pay
                </button>
                      </div>
                      <div className="text-xs text-gray-500">Repay with CHIPS</div>
                    </div>

                    {/* Repay with ETH */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="ETH"
                          value={repayETHAmount}
                          onChange={(e) => setRepayETHAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          disabled={repayLoanState.status === 'pending'}
                          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                        />
                        <button
                          onClick={handleRepayWithETH}
                          disabled={!isConnected || !repayETHAmount || parseFloat(repayETHAmount) <= 0 || parseFloat(repayETHAmount) > parseFloat(borrowedAmount) || repayLoanState.status === 'pending'}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-3 py-1 rounded text-xs transition-colors"
                        >
                          💎 Pay
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">Repay with ETH directly</div>
                    </div>
                  </>
                )}
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
                  <span className="text-gray-400">Borrowing Power:</span>
                  <span className="text-purple-400 font-medium">{borrowingPower} ETH</span>
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