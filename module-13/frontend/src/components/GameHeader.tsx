import React, { useState } from 'react';
import { Wallet, Network, LogOut, Zap } from 'lucide-react';
import type { Address } from 'viem';
import PoolStats from './PoolStats';
import NetworkSwitcher from './NetworkSwitcher';
import SmartConnectButton from './SmartConnectButton';



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
  
  // Pool info 
  poolData: {
    poolETH: string | null;
    ethPrice: string | null;
    chipRate: string | null;
    isLoading: boolean;
    error: string | null;
  };
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
  poolData,
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
            <PoolStats
              poolETH={poolData.poolETH}
              ethPrice={poolData.ethPrice}
              chipRate={poolData.chipRate}
              isLoading={poolData.isLoading}
              error={poolData.error}
              layout="horizontal"
              showLabels={true}
              className="hidden md:flex bg-black/30 rounded-2xl px-6 py-3 border border-gray-600"
            />
          )}

          {/* Right Section - Network & Wallet */}
          <div className="flex items-center space-x-4">
            {/* Network Switcher - Only when connected */}
            <NetworkSwitcher
              currentChain={currentChain}
              isSupported={isSupported}
              isSwitchPending={isSwitchPending}
              onSwitchToLocal={onSwitchToLocal}
              onSwitchToSepolia={onSwitchToSepolia}
              isConnected={isConnected}
            />

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
              /* Smart Connect Button - Only when disconnected */
              <SmartConnectButton
                connecting={connecting}
                onConnect={onConnect}
                onSwitchToLocal={onSwitchToLocal}
                onSwitchToSepolia={onSwitchToSepolia}
                variant="hero"
              />
            )}
          </div>
        </div>
      </div>

      {/* Network Warning Banner - Only when connected */}
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
        <PoolStats
          poolETH={poolData.poolETH}
          ethPrice={poolData.ethPrice}
          chipRate={poolData.chipRate}
          isLoading={poolData.isLoading}
          error={poolData.error}
          layout="horizontal"
          showLabels={true}
          className="md:hidden bg-black/30 mx-4 mb-4 rounded-xl p-4 border border-gray-600"
        />
      )}
    </header>
  );
};

export default GameHeader; 