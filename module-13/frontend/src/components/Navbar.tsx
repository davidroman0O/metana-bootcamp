import React from 'react';
import { Wallet, Network, LogOut, Zap } from 'lucide-react';
import type { Address } from 'viem';

interface NavbarProps {
  account: Address | undefined;
  balance: string;
  connecting: boolean;
  isConnected: boolean;
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
}

const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  connecting,
  isConnected,
  onConnect,
  onDisconnect,
  chainId,
  currentChain,
  isSupported,
  onSwitchToLocal,
  onSwitchToMainnet,
  onSwitchToSepolia,
  isSwitchPending,
}) => {
  const formatAddress = (address?: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🦧</span>
          <div>
            <h1 className="text-xl font-bold text-white">The Leverage Lounge</h1>
            <div className="text-xs text-gray-400">Provably Fair Slot Machine</div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <a 
            href="/" 
            className="text-white/80 hover:text-white transition-colors font-medium flex items-center gap-2"
          >
            🎰 Play
          </a>
          <a 
            href="/dashboard" 
            className="text-white/80 hover:text-white transition-colors font-medium flex items-center gap-2"
          >
            📊 Dashboard
          </a>
          <a 
            href="/credit" 
            className="text-white/80 hover:text-white transition-colors font-medium flex items-center gap-2"
          >
            💳 Credit
          </a>
        </div>

        {/* Network & Wallet Section */}
        <div className="flex items-center space-x-4">
          
          {/* Network Status & Switch */}
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

              {/* Network Switch Buttons */}
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
                  <button
                    onClick={onSwitchToMainnet}
                    disabled={isSwitchPending}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    title="Switch to Ethereum Mainnet"
                  >
                    Mainnet
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
                <Wallet size={16} className="text-slot-gold" />
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
              className="flex items-center space-x-2 bg-slot-gold hover:bg-yellow-500 
                       text-black font-medium rounded-lg px-6 py-2.5 
                       transition-all duration-200 hover:scale-105 
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Network Warning Banner */}
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
    </nav>
  );
};

export default Navbar; 