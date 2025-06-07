import React from 'react';
import { Wallet, Network, LogOut, Zap } from 'lucide-react';
import type { Address } from 'viem';

interface GameHeaderProps {
  // Connection state
  isConnected: boolean;
  account: Address | undefined;
  balance: string;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  
  // Network switching props
  chainId: number | undefined;
  currentChain: any;
  isSupported: boolean;
  onSwitchToLocal: () => void;
  onSwitchToMainnet: () => void;
  onSwitchToSepolia: () => void;
  isSwitchPending: boolean;
  
  // Pool info for disconnected mode
  poolETH?: string;
  ethPrice?: string;
  chipRate?: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  isConnected,
  account,
  balance,
  connecting,
  onConnect,
  onDisconnect,
  chainId,
  currentChain,
  isSupported,
  onSwitchToLocal,
  onSwitchToMainnet,
  onSwitchToSepolia,
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
    <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <span className="text-4xl">🦧</span>
            <div>
              <h1 className="text-2xl font-bold text-white">The Leverage Lounge</h1>
              <div className="text-sm text-gray-400">Provably Fair Slot Machine</div>
            </div>
          </div>

          {/* Center Section - Pool Info for Disconnected */}
          {!isConnected && (
            <div className="hidden md:flex items-center space-x-6 bg-black/30 rounded-2xl px-6 py-3 border border-gray-600">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{poolETH || '0.00'} ETH</div>
                <div className="text-xs text-gray-400">Prize Pool</div>
              </div>
              <div className="w-px h-8 bg-gray-600"></div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{ethPrice || '$0'}</div>
                <div className="text-xs text-gray-400">ETH Price</div>
              </div>
              <div className="w-px h-8 bg-gray-600"></div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">{chipRate || '0'}</div>
                <div className="text-xs text-gray-400">CHIPS/ETH</div>
              </div>
            </div>
          )}

          {/* Right Section - Wallet & Network */}
          <div className="flex items-center space-x-4">
            {/* Network Status & Switch - Only when connected */}
            {isConnected && currentChain && (
              <div className="network-section flex items-center space-x-2">
                {/* Current Network Display */}
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  isSupported 
                    ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                    : 'bg-red-500/20 border-red-500/30 text-red-400'
                }`}>
                  <Network size={16} />
                  <span className="text-sm font-medium">
                    {isSwitchPending ? (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                        Switching...
                      </span>
                    ) : (
                      currentChain.name
                    )}
                  </span>
                </div>

                {/* Network Switch Buttons - Only when unsupported */}
                {!isSupported && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={onSwitchToLocal}
                      disabled={isSwitchPending}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      title="Switch to Hardhat Local"
                    >
                      Local
                    </button>
                    <button
                      onClick={onSwitchToSepolia}
                      disabled={isSwitchPending}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      title="Switch to Sepolia Testnet"
                    >
                      Sepolia
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Wallet Section */}
            {isConnected && account ? (
              <>
                {/* Balance Display */}
                <div className="hidden sm:flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                  <span className="text-sm text-white/80">ETH</span>
                  <span className="text-sm font-medium text-white">
                    {parseFloat(balance).toFixed(4)}
                  </span>
                </div>

                {/* Account Display */}
                <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                  <Wallet size={16} className="text-yellow-400" />
                  <span className="text-sm font-medium text-white">
                    {formatAddress(account)}
                  </span>
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={onDisconnect}
                  className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 
                           text-red-400 hover:text-red-300 rounded-lg px-3 py-2 
                           transition-all duration-200 border border-red-500/30"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                disabled={connecting}
                className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 
                         text-black font-bold rounded-lg px-6 py-3 text-lg
                         transition-all duration-200 hover:scale-105 
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                         shadow-lg hover:shadow-xl border-2 border-yellow-400"
              >
                {connecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={20} />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Network Warning Banner - Only when connected but unsupported */}
      {isConnected && !isSupported && (
        <div className="bg-yellow-500/90 text-black p-3 text-center font-medium border-b border-yellow-400">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
            <Zap size={20} />
            <span>Please switch to a supported network to use the slot machine</span>
            <button 
              onClick={onSwitchToLocal}
              disabled={isSwitchPending}
              className="bg-black/20 hover:bg-black/30 disabled:bg-black/10 px-4 py-1 rounded-lg transition-colors text-sm font-bold"
            >
              {isSwitchPending ? 'Switching...' : 'Switch to Local'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Pool Info for Disconnected */}
      {!isConnected && (
        <div className="md:hidden bg-black/30 mx-4 mb-4 rounded-xl p-4 border border-gray-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-400">{poolETH || '0.00'}</div>
              <div className="text-xs text-gray-400">Prize Pool ETH</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">{ethPrice || '$0'}</div>
              <div className="text-xs text-gray-400">ETH Price</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">{chipRate || '0'}</div>
              <div className="text-xs text-gray-400">CHIPS/ETH</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default GameHeader; 