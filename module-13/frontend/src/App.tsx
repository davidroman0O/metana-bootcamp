import React, { useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';

// Config
import { config } from './config/wagmi';
import { DegenSlotsABI } from './config/contracts/DegenSlotsABI';
import { CONTRACT_ADDRESSES } from './config/wagmi';

// Contexts
import { AppModeProvider, useAppMode } from './contexts/AppModeContext';

// Components
import Navbar from './components/Navbar';
import SlotMachine from './components/SlotMachine';
import FlexibleSlotDemo from './components/FlexibleSlotDemo';
import PlayerStats from './components/PlayerStats';
import HouseComponent from './components/HouseComponent';
import CreditLoan from './components/CreditLoan';
import PhoneHelpLine from './components/PhoneHelpLine';
import DevModeSwitcher from './components/DevModeSwitcher';

// Hooks
import { useWeb3 } from './hooks/useWeb3';
import { useNetworkSwitcher } from './hooks/useNetworkSwitcher';
import { useSlotMachine } from './hooks/useSlotMachine';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Main App content component that uses all hooks
function AppContent() {
  // Web3 hooks
  const {
    account,
    chainId,
    balance,
    connecting,
    isConnected,
    connectWallet,
    disconnectWallet,
  } = useWeb3();

  // Network switching
  const {
    currentChain,
    isSupported,
    switchToLocal,
    switchToMainnet,
    switchToSepolia,
    isPending: isSwitchPending,
  } = useNetworkSwitcher();

  // Slot machine state and logic
  const {
    // State
    displayLCD,
    betAmount,
    lastResult,
    
    // Computed values
    needsApproval,
    hasChips,
    
    // Contract data
    chipBalance,
    chipAllowance,
    
    // Loading states
    isApproving,
    isSpinningTx,
    
    // Actions
    callbackOnLever,
    handleSlotResult,
    approveChipsForPlay,
    buyChipsWithETH,
    setBetAmount,
    
    // Utils
    refetchChipBalance,
  } = useSlotMachine(chainId);

  // SlotMachine ref for programmatic control
  const slotMachineRef = useRef<any>(null);

  // Add this hook to get app mode context
  const { isManualMode, isControlledMode } = useAppMode();

  // Handle slot machine results
  const handleSlotResultWrapper = (symbols: number[], payout: number, payoutType: string) => {
    console.log(`🎰 Slot result: [${symbols.join(', ')}], payout: ${payout}, type: ${payoutType}`);
    // Pass to the hook's result handler
    handleSlotResult(symbols, payout, payoutType);
  };

  // Handle slot machine state changes
  const handleSlotStateChange = (state: string) => {
    console.log(`🎰 Slot state: ${state}`);
    
    // Update display messages based on state
    // Note: Don't override 'idle' state - let SlotMachine manage its own display
    switch (state) {
      case 'spinning_up':
        slotMachineRef.current?.updateDisplayMessage('Starting spin...');
        break;
      case 'spinning':
        slotMachineRef.current?.updateDisplayMessage('Spinning...');
        break;
      case 'evaluating_result':
        slotMachineRef.current?.updateDisplayMessage('Calculating...');
        break;
      // Removed 'idle' case to prevent race condition
    }
  };

  // Update display message when displayLCD changes
  useEffect(() => {
    if (slotMachineRef.current && displayLCD) {
      slotMachineRef.current.updateDisplayMessage(displayLCD);
    }
  }, [displayLCD]);

  // For controlled mode, we can trigger spins programmatically
  const triggerControlledSpin = async () => {
    if (!slotMachineRef.current?.isReady()) {
      return;
    }
    
    // Get target symbols from the hook
    const targets = await callbackOnLever();
    
    if (targets) {
      // Start spin with specific targets from the hook
      slotMachineRef.current?.startSpin(targets);
    } else {
      // Start random spin
      slotMachineRef.current?.startSpin();
    }
  };

  // Contract addresses
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};

  // Additional contract reads for other components
  const { data: poolStats } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: DegenSlotsABI,
    functionName: 'getPoolStats',
    query: { enabled: !!addresses.DEGEN_SLOTS },
  });

  const { data: chipsFromETH } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: DegenSlotsABI,
    functionName: 'calculateChipsFromETH',
    args: [BigInt(1e18)], // 1 ETH in wei
    query: { enabled: !!addresses.DEGEN_SLOTS },
  });

  const { data: playerStats } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: DegenSlotsABI,
    functionName: 'getPlayerStats',
    args: [account!],
    query: { enabled: !!account && !!addresses.DEGEN_SLOTS },
  });

  // Format data for components
  const formattedPoolETH = poolStats ? formatEther(poolStats[0] as bigint) : '0';
  const ethPrice = poolStats ? `$${(Number(poolStats[2] as bigint) / 100).toFixed(2)}` : '$0';
  const chipRate = chipsFromETH ? parseFloat(formatEther(chipsFromETH as bigint)).toFixed(0) : '0';
  
  // Calculate expected chips for house component
  const expectedChips = chipsFromETH ? 
    formatEther((chipsFromETH as bigint * BigInt(Math.floor(parseFloat('0.1') * 1e18))) / BigInt(1e18)) : '0';

  // Mock data for player stats (would come from events/subgraph in production)
  const mockPlayerData = {
    totalWins: 42,
    totalSpins: 156,
    biggestWin: '15,000 CHIPS',
  };

  // Mock credit/loan handlers (would integrate with real contract functions)
  const handleDepositCollateral = (ethAmount: string) => {
    console.log('Deposit collateral:', ethAmount);
    // TODO: Implement depositCollateral contract call
  };

  const handleBorrowChips = (ethAmount: string) => {
    console.log('Borrow chips:', ethAmount);
    // TODO: Implement borrowChips contract call
  };

  const handleRepayLoan = (chipAmount: string) => {
    console.log('Repay loan:', chipAmount);
    // TODO: Implement repayLoan contract call
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
      
      {/* Development Mode Switcher */}
      {/* <DevModeSwitcher /> */}
      
      <Router>
        <Navbar
          account={account}
          balance={balance}
          connecting={connecting}
          isConnected={isConnected}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
          chainId={chainId}
          currentChain={currentChain}
          isSupported={isSupported}
          onSwitchToLocal={switchToLocal}
          onSwitchToMainnet={switchToMainnet}
          onSwitchToSepolia={switchToSepolia}
          isSwitchPending={isSwitchPending}
        />

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-8">
                  {/* Main Title */}
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-600 bg-clip-text text-transparent">
                      🎰 Ape Escape
                    </h1>
                    <p className="text-2xl text-gray-300">
                      Provably Fair Degen Slot Machine
                    </p>
                  </div>

                  {/* Slot Machine */}
                  <div className="flex justify-center">
                    <SlotMachine
                      ref={slotMachineRef}
                      onResult={handleSlotResultWrapper}
                      onStateChange={handleSlotStateChange}
                      isConnected={isConnected}
                    />
                  </div>

                  {/* Betting Controls - Show in connected mode OR manual controlled mode */}
                  {((isConnected && isSupported) || (isManualMode && isControlledMode)) && (
                    <div className="max-w-2xl mx-auto bg-black/30 rounded-2xl p-6 border border-gray-600">
                      <h3 className="text-xl font-bold text-yellow-400 mb-4">🎯 Place Your Bet</h3>
                      
                      <div className="space-y-4">
                        {(isConnected && isSupported) && (
                          <>
                            <div className="flex items-center gap-4">
                              <input
                                type="number"
                                placeholder="Bet amount in CHIPS"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                disabled={isSpinningTx}
                                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                              />
                              
                              {needsApproval ? (
                                <button
                                  onClick={approveChipsForPlay}
                                  disabled={isApproving}
                                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
                                >
                                  {isApproving ? 'Approving...' : 'Approve CHIPS'}
                                </button>
                              ) : (
                                <div className="text-green-400 font-medium">✅ Ready to Play</div>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-400">
                              CHIP Balance: {chipBalance ? parseFloat(formatEther(chipBalance)).toFixed(2) : '0.00'}
                            </div>
                          </>
                        )}

                        {/* Manual Control for Testing - Always show in manual controlled mode */}
                        <div className="space-y-3">
                          <h4 className="text-lg font-bold text-green-400">🧪 Manual Testing Controls</h4>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => slotMachineRef.current?.startSpin()}
                              disabled={!slotMachineRef.current?.isReady()}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                            >
                              Start Random Spin
                            </button>
                            <button
                              onClick={() => {
                                // Start spin first, then set jackpot targets after a brief delay
                                if (slotMachineRef.current?.isReady()) {
                                  slotMachineRef.current?.startSpin();
                                  // Wait for spin to be fully started, then set jackpot targets
                                  setTimeout(() => {
                                    slotMachineRef.current?.setAllReelTargets([6, 6, 6]); // 🐵🐵🐵 JACKPOT
                                  }, 1000); // 1 second delay to ensure reels are spinning
                                }
                              }}
                              disabled={!slotMachineRef.current?.isReady()}
                              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                            >
                              🐵 Jackpot Test
                            </button>
                            <button
                              onClick={triggerControlledSpin}
                              disabled={!slotMachineRef.current?.isReady()}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                            >
                              Hook Spin Test
                            </button>
                            <button
                              onClick={() => slotMachineRef.current?.reset()}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                            >
                              Reset
                            </button>
                          </div>
                          
                          {/* Reel Control Buttons for Testing */}
                          <div className="space-y-2">
                            <h5 className="text-md font-bold text-orange-400">🎯 Set Target Symbols (while spinning)</h5>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  slotMachineRef.current?.setAllReelTargets([1, 1, 1]); // DUMP triple
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                              >
                                📉📉📉 DUMP
                              </button>
                              <button
                                onClick={() => {
                                  slotMachineRef.current?.setAllReelTargets([2, 2, 2]); // COPE triple
                                }}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                              >
                                🤡🤡🤡 COPE
                              </button>
                              <button
                                onClick={() => {
                                  slotMachineRef.current?.setAllReelTargets([3, 3, 3]); // PUMP triple
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                              >
                                📈📈📈 PUMP
                              </button>
                              <button
                                onClick={() => {
                                  slotMachineRef.current?.setAllReelTargets([5, 5, 1]); // Rocket special
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm"
                              >
                                🚀🚀X Special
                              </button>
                              <button
                                onClick={() => {
                                  const targets = [
                                    Math.floor(Math.random() * 6) + 1,
                                    Math.floor(Math.random() * 6) + 1,
                                    Math.floor(Math.random() * 6) + 1
                                  ];
                                  slotMachineRef.current?.setAllReelTargets(targets);
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm"
                              >
                                🎲 Random Stop
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Components Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Player Stats */}
                    <PlayerStats
                      chipBalance={chipBalance}
                      borrowedAmount={playerStats?.[1]}
                      totalWins={mockPlayerData.totalWins}
                      totalSpins={mockPlayerData.totalSpins}
                      biggestWin={mockPlayerData.biggestWin}
                      isConnected={isConnected}
                    />

                    {/* House Component */}
                    <HouseComponent
                      poolETH={formattedPoolETH}
                      ethPrice={ethPrice}
                      chipRate={chipRate}
                      isConnected={isConnected}
                      isBuying={false}
                      onBuyChips={buyChipsWithETH}
                      expectedChips={expectedChips}
                    />
                  </div>

                  {/* Credit/Loan Component */}
                  <CreditLoan
                    isConnected={isConnected}
                    borrowedAmount={playerStats?.[1]}
                    accountLiquidity={playerStats?.[2]}
                    onDepositCollateral={handleDepositCollateral}
                    onBorrowChips={handleBorrowChips}
                    onRepayLoan={handleRepayLoan}
                    isDepositingCollateral={false}
                    isBorrowingChips={false}
                    isRepayingLoan={false}
                  />

                  {/* Game Info */}
                  <div className="text-center text-gray-400 space-y-3">
                    <p className="text-lg font-medium">🎰 21.8% Win Rate • 🔒 Provably Fair • ⚡ Powered by Chainlink VRF</p>
                    <div className="flex flex-wrap justify-center gap-2 text-sm">
                      <span className="bg-yellow-600 px-2 py-1 rounded">🐵 Jackpot: 666x</span>
                      <span className="bg-purple-600 px-2 py-1 rounded">🚀🚀🚀 Ultra: 555x</span>
                      <span className="bg-blue-600 px-2 py-1 rounded">💎💎💎 Mega: 444x</span>
                      <span className="bg-green-600 px-2 py-1 rounded">📈📈📈 Big: 333x</span>
                      <span className="bg-yellow-500 px-2 py-1 rounded">🤡🤡🤡 Medium: 222x</span>
                      <span className="bg-purple-500 px-2 py-1 rounded">🚀🚀X Special: 100x</span>
                    </div>
                  </div>
                </div>
              }
            />
            <Route
              path="/dashboard"
              element={
                <div className="text-white text-center py-20">
                  <h2 className="text-3xl font-bold mb-4">📊 Dashboard</h2>
                  <p className="text-gray-300">Advanced analytics and statistics coming soon...</p>
                </div>
              }
            />
            <Route
              path="/credit"
              element={
                <div className="text-white text-center py-20">
                  <h2 className="text-3xl font-bold mb-4">💳 Credit System</h2>
                  <p className="text-gray-300">Advanced credit management coming soon...</p>
                </div>
              }
            />
            <Route
              path="/flexible"
              element={<FlexibleSlotDemo />}
            />
          </Routes>
        </main>

        {/* Phone Help Line Easter Egg */}
        <PhoneHelpLine isConnected={isConnected} />
      </Router>
    </div>
  );
}

// Main App wrapper with providers
function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppModeProvider>
          <AppContent />
        </AppModeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
