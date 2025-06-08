import React from 'react';
import { Wallet, LogOut, Network, Zap } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useNetworks } from '../hooks/useNetworks';
import '../styles/NetworkSwitcher.css';

const NetworkSwitcher: React.FC = () => {
  const {
    account,
    isConnected,
    connecting,
    balance,
    connectWallet,
    disconnectWallet,
    formatAddress,
    formatBalance,
  } = useWallet();

  const {
    currentNetwork,
    availableNetworks,
    isNetworkSupported,
    switchingNetwork,
    switchToNetwork,
  } = useNetworks();

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-gray-600 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        <Network className="mr-2" size={20} />
        Network Switcher
      </h2>

      {/* Wallet Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Wallet</h3>
        {isConnected && account ? (
          <div className="space-y-2">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Address:</span>
                <span className="text-white font-mono">{formatAddress(account)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-400">Balance:</span>
                <span className="text-green-400 font-semibold">{formatBalance(balance, 4)} ETH</span>
              </div>
            </div>
            <button
              onClick={disconnectWallet}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center justify-center"
            >
              <LogOut size={16} className="mr-2" />
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg px-4 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
          >
            <Wallet size={16} className="mr-2" />
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>

      {/* Network Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Network</h3>
        
        {/* Current Network */}
        {currentNetwork && (
          <div className={`mb-3 p-3 rounded-lg border ${
            isNetworkSupported 
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{currentNetwork.name}</span>
              <div className="flex items-center">
                {isNetworkSupported ? (
                  <span className="text-xs bg-green-500/20 px-2 py-1 rounded">✓ Supported</span>
                ) : (
                  <span className="text-xs bg-red-500/20 px-2 py-1 rounded">⚠ Unsupported</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Networks */}
        <div className="space-y-2">
          {availableNetworks.map((network) => (
            <button
              key={network.id}
              onClick={() => switchToNetwork(network.id)}
              disabled={switchingNetwork || (currentNetwork?.id === network.id && isNetworkSupported)}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                currentNetwork?.id === network.id && isNetworkSupported
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300 cursor-default'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 text-gray-300 hover:text-white'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{network.name}</div>
                  <div className="text-xs opacity-75">
                    Chain ID: {network.chainId}
                    {network.isDev && ' • Development'}
                  </div>
                </div>
                <div className="flex items-center">
                  {network.isPending && (
                    <div className="animate-spin mr-2">
                      <Zap size={16} />
                    </div>
                  )}
                  {currentNetwork?.id === network.id && isNetworkSupported && (
                    <span className="text-xs bg-blue-500/20 px-2 py-1 rounded">Current</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {availableNetworks.length === 0 && (
          <div className="text-center py-4 text-gray-400">
            No networks available
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkSwitcher; 