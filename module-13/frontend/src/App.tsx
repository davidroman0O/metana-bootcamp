import React from 'react';
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
import { AppModeProvider } from './contexts/AppModeContext';

// Components
import Navbar from './components/Navbar';
import SlotMachine from './components/SlotMachine';
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
    // Display state
    displayLCD,
    reels,
    spin1,
    spin2,
    spin3,
    lockLever,
    animationSpin,
    betAmount,
    lastResult,
    
    // Computed values
    isSpinning,
    needsApproval,
    hasChips,
    
    // Contract data
    chipBalance,
    chipAllowance,
    
    // Loading states
    isApproving,
    isBuying,
    isSpinningTx,
    
    // Actions
    callbackOnLever,
    approveChipsForPlay,
    buyChipsWithETH,
    setBetAmount,
    
    // Utils
    refetchChipBalance,
  } = useSlotMachine(chainId);

  // Contract addresses
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};

  // Additional contract reads for other components
  const { data: poolStats } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: DegenSlotsABI,
    functionName: 'getPoolStats',
    query: { enabled: !!addresses.DEGEN_SLOTS },
  });

  const { data: chipsPerETH } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: DegenSlotsABI,
    functionName: 'calculateChipsPerETH',
    query: { enabled: !!addresses.DEGEN_SLOTS },
  });

  const { data: ethPriceFromChainlink } = useReadContract({
    address: addresses.DEGEN_SLOTS,
    abi: DegenSlotsABI,
    functionName: 'getETHPrice',
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
  const formattedPoolETH = poolStats ? formatEther(poolStats[0]) : '0';
  const ethPrice = ethPriceFromChainlink ? `$${(Number(ethPriceFromChainlink) / 100).toFixed(2)}` : '$0';
  const chipRate = chipsPerETH ? parseFloat(formatEther(chipsPerETH)).toFixed(0) : '0';
  
  // Calculate expected chips for house component
  const expectedChips = chipsPerETH ? 
    formatEther((chipsPerETH * BigInt(Math.floor(parseFloat('0.1') * 1e18))) / BigInt(1e18)) : '0';

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
      <DevModeSwitcher />
      
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
                      🎰 Boomer's Last Hope
                    </h1>
                    <p className="text-2xl text-gray-300">
                      Provably Fair Degen Slot Machine
                    </p>
                  </div>

                  {/* Slot Machine */}
                  <div className="flex justify-center">
                    <SlotMachine
                      displayLCD={displayLCD}
                      reels={reels}
                      reel1={reels[0]}
                      reel2={reels[1]}
                      reel3={reels[2]}
                      spin1={spin1}
                      spin2={spin2}
                      spin3={spin3}
                      lockLever={lockLever}
                      animation={animationSpin}
                      onLever={callbackOnLever}
                      isConnected={isConnected}
                      onCoinInsert={buyChipsWithETH}
                    />
                  </div>

                  {/* Betting Controls - Only when connected and has access */}
                  {isConnected && isSupported && (
                    <div className="max-w-2xl mx-auto bg-black/30 rounded-2xl p-6 border border-gray-600">
                      <h3 className="text-xl font-bold text-yellow-400 mb-4">🎯 Place Your Bet</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            placeholder="Bet amount in CHIPS"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            disabled={isSpinning || lockLever}
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
                      isBuying={isBuying}
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
