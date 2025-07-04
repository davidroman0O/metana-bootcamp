import React, { useState } from 'react';
import { Wallet, Network, ChevronDown, X } from 'lucide-react';
import { getAvailableNetworkIds } from '../config/environment';

interface NetworkOption {
  id: string;
  name: string;
  chainId: number;
  isDev: boolean;
}

interface SmartConnectButtonProps {
  connecting: boolean;
  onConnect: () => void;
  onSwitchToLocal: () => void;
  onSwitchToSepolia: () => void;
  variant?: 'default' | 'hero';
}

// Available networks with deployments
const AVAILABLE_NETWORKS: NetworkOption[] = [
  {
    id: 'hardhat',
    name: 'Hardhat Local',
    chainId: 31337,
    isDev: true,
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    isDev: false,
  },
];

const SmartConnectButton: React.FC<SmartConnectButtonProps> = ({
  connecting,
  onConnect,
  onSwitchToLocal,
  onSwitchToSepolia,
  variant = 'default',
}) => {
  const [showModal, setShowModal] = useState(false);
  
  // Get available networks based on environment
  const availableNetworkIds = getAvailableNetworkIds();
  const availableNetworks = AVAILABLE_NETWORKS.filter(network => 
    availableNetworkIds.includes(network.id)
  );

  const handleNetworkSelect = (networkId: string) => {
    // Switch to selected network first
    switch (networkId) {
      case 'hardhat':
        onSwitchToLocal();
        break;
      case 'sepolia':
        onSwitchToSepolia();
        break;
    }
    
    // Close modal and connect
    setShowModal(false);
    setTimeout(() => onConnect(), 100);
  };

  // If only 1 network available, show direct connect button
  if (availableNetworks.length === 1) {
    const network = availableNetworks[0];
    return (
      <button
        onClick={() => handleNetworkSelect(network.id)}
        disabled={connecting}
        className={`flex items-center space-x-2 font-bold rounded-lg 
                   transition-all duration-200 hover:scale-105 disabled:hover:scale-100
                   disabled:cursor-not-allowed ${
          variant === 'hero' 
            ? 'bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-black text-lg px-8 py-3'
            : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black px-6 py-2'
        }`}
      >
        {connecting ? (
          <>
            <div className={`border-2 border-black border-t-transparent rounded-full animate-spin ${
              variant === 'hero' ? 'w-5 h-5' : 'w-4 h-4'
            }`}></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet size={variant === 'hero' ? 20 : 16} />
            <span>Connect to {network.name}</span>
          </>
        )}
      </button>
    );
  }

  // Multiple networks available - show selection
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={connecting}
        className={`flex items-center space-x-2 font-bold rounded-lg 
                   transition-all duration-200 hover:scale-105 disabled:hover:scale-100
                   disabled:cursor-not-allowed ${
          variant === 'hero' 
            ? 'bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-black text-lg px-8 py-3'
            : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black px-6 py-2'
        }`}
      >
        {connecting ? (
          <>
            <div className={`border-2 border-black border-t-transparent rounded-full animate-spin ${
              variant === 'hero' ? 'w-5 h-5' : 'w-4 h-4'
            }`}></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet size={variant === 'hero' ? 20 : 16} />
            <span>Connect Wallet</span>
            <ChevronDown size={variant === 'hero' ? 16 : 14} />
          </>
        )}
      </button>

      {/* Network Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-600 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Network className="mr-2" size={20} />
                Choose Network
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Network Options */}
            <div className="space-y-3">
              {availableNetworks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkSelect(network.id)}
                  disabled={connecting}
                  className="w-full flex items-center space-x-3 p-4 bg-gray-700 hover:bg-gray-600 
                           disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors 
                           text-left border border-gray-600 hover:border-gray-500"
                >
                  <Network size={20} className="text-blue-400" />
                  <div className="flex-1">
                    <div className="font-medium text-white">{network.name}</div>
                    <div className="text-sm text-gray-400">
                      Chain ID: {network.chainId}
                      {network.isDev && ' • Development'}
                    </div>
                  </div>
                  <div className="text-yellow-400 text-sm font-medium">
                    Connect
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Choose the network you want to connect to
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartConnectButton; 