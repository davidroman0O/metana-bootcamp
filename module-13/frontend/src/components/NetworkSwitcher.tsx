import React from 'react';
import { Network, ChevronDown } from 'lucide-react';
import { isDevelopment } from '../config/environment';

interface NetworkSwitcherProps {
  currentChain: any;
  isSupported: boolean;
  isSwitchPending: boolean;
  onSwitchToLocal: () => void;
  onSwitchToSepolia: () => void;
  isConnected: boolean;
}

interface NetworkOption {
  id: string;
  name: string;
  chainId: number;
  isDev: boolean;
  onClick: () => void;
}

const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({
  currentChain,
  isSupported,
  isSwitchPending,
  onSwitchToLocal,
  onSwitchToSepolia,
  isConnected,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isConnected || !currentChain) {
    return null; // Only show for connected users
  }

  // Available networks based on environment (only networks with deployments)
  const availableNetworks: NetworkOption[] = [
    ...(isDevelopment ? [{
      id: 'hardhat',
      name: 'Hardhat Local',
      chainId: 31337,
      isDev: true,
      onClick: onSwitchToLocal,
    }] : []),
    {
      id: 'sepolia',
      name: 'Sepolia Testnet',
      chainId: 11155111,
      isDev: false,
      onClick: onSwitchToSepolia,
    },
    // Note: No mainnet - we don't have deployed contracts there
  ];

  const handleNetworkSelect = (network: NetworkOption) => {
    network.onClick();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Current Network Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchPending}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          isSupported 
            ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30' 
            : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
        } ${isSwitchPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <Network size={16} />
        <span>
          {isSwitchPending ? (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
              Switching...
            </span>
          ) : (
            currentChain.name
          )}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isSwitchPending && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
          <div className="py-1">
            {availableNetworks.map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkSelect(network)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-700 transition-colors text-sm ${
                  currentChain.id === network.chainId ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                }`}
              >
                <Network size={14} />
                <div className="flex-1">
                  <div className="font-medium">{network.name}</div>
                  <div className="text-xs text-gray-500">
                    Chain ID: {network.chainId}
                    {network.isDev && ' • Dev'}
                  </div>
                </div>
                {currentChain.id === network.chainId && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NetworkSwitcher; 