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
import { useWeb3 } from '../hooks/useWeb3';
import { useNetworkSwitcher } from '../hooks/useNetworkSwitcher';
import { useSlotMachine } from '../hooks/useSlotMachine';

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
                <button onClick={onDisconnect} className="bg-red-500/30 hover:bg-red-500/50 text-red-300 hover:text-white rounded-lg px-3 py-2 text-sm font-medium transition-all">
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
  // All hooks
  const {
    account, chainId, balance, connecting, isConnected, connectWallet, disconnectWallet,
  } = useWeb3();

  const {
    currentChain, isSupported, switchToLocal, switchToMainnet, switchToSepolia, isPending: isSwitchPending,
  } = useNetworkSwitcher();

  const {
    displayLCD, betAmount, needsApproval, chipBalance, isApproving, isSpinningTx,
    callbackOnLever, handleSlotResult, approveChipsForPlay, buyChipsWithETH, setBetAmount,
  } = useSlotMachine(chainId);

  const slotMachineRef = useRef<any>(null);
  const [selectedReelCount, setSelectedReelCount] = useState<number>(3);

  // Contract data
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};
  const { data: poolStats } = useReadContract({
    address: addresses.DEGEN_SLOTS, abi: DegenSlotsABI, functionName: 'getPoolStats',
    query: { enabled: !!addresses.DEGEN_SLOTS },
  });
  const { data: chipsFromETH } = useReadContract({
    address: addresses.DEGEN_SLOTS, abi: DegenSlotsABI, functionName: 'calculateChipsFromETH',
    args: [BigInt(1e18)], query: { enabled: !!addresses.DEGEN_SLOTS },
  });

  // Format data
  const formattedPoolETH = poolStats ? formatEther(poolStats[0] as bigint) : '0';
  const ethPrice = poolStats ? `$${(Number(poolStats[2] as bigint) / 100).toFixed(0)}` : '$0';
  const chipRate = chipsFromETH ? parseFloat(formatEther(chipsFromETH as bigint)).toFixed(0) : '0';

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
  };

  const handleSlotStateChange = (state: string) => {
    // Handle state changes if needed
  };

  // Disconnected mode
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <GameHeader
          isConnected={false} account={account} balance={balance} connecting={connecting}
          onConnect={connectWallet} onDisconnect={disconnectWallet} chainId={chainId}
          currentChain={currentChain} isSupported={isSupported} onSwitchToLocal={switchToLocal}
          onSwitchToMainnet={switchToMainnet} onSwitchToSepolia={switchToSepolia}
          isSwitchPending={isSwitchPending} poolETH={formattedPoolETH} ethPrice={ethPrice} chipRate={chipRate}
        />

        <main className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-600 bg-clip-text text-transparent">
              🎰 Ape Escape
            </h1>
            <p className="text-xl text-gray-300">Provably Fair Degen Slot Machine</p>
            <p className="text-lg text-yellow-400">Connect your wallet to start playing with real CHIPS!</p>

            <div className="flex justify-center">
              <SlotMachine
                key="slot-machine-disconnected-3"
                ref={slotMachineRef} onResult={handleSlotResultWrapper} onStateChange={handleSlotStateChange}
                isConnected={false} reelCount={3}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="bg-yellow-600 px-3 py-1 rounded-full">🐵 Jackpot: 666x</span>
              <span className="bg-purple-600 px-3 py-1 rounded-full">🚀🚀🚀 Ultra: 555x</span>
              <span className="bg-blue-600 px-3 py-1 rounded-full">💎💎💎 Mega: 444x</span>
              <span className="bg-green-600 px-3 py-1 rounded-full">📈📈📈 Big: 333x</span>
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
        currentChain={currentChain} isSupported={isSupported} onSwitchToLocal={switchToLocal}
        onSwitchToMainnet={switchToMainnet} onSwitchToSepolia={switchToSepolia}
        isSwitchPending={isSwitchPending}
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
                <div className="text-xs text-gray-400">Expected: ~{chipRate} CHIPS</div>
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