import React from 'react';
import NetworkSwitcher from '../components/NetworkSwitcher';

const NetworkDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            🌐 Network Switcher Demo
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Consolidated Wallet Connection & Network Switching
          </p>
          <p className="text-gray-400">
            Academic project demonstrating clean Web3 integration
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Network Switcher Component */}
          <div>
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              🎮 Interactive Demo
            </h2>
            <NetworkSwitcher />
          </div>

          {/* Features Documentation */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-blue-400 mb-4">
                ✨ Features
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="font-bold text-yellow-300 mb-2">🦊 Wallet Integration</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• One-click MetaMask connection</li>
                    <li>• Account balance display</li>
                    <li>• Clean disconnect functionality</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="font-bold text-green-300 mb-2">🌍 Smart Network Detection</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Contract deployment-based filtering</li>
                    <li>• Production/development environment detection</li>
                    <li>• Automatic network validation</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="font-bold text-purple-300 mb-2">🔧 Developer Features</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Local Hardhat network support</li>
                    <li>• Contract address display</li>
                    <li>• Development mode indicators</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-orange-400 mb-4">
                🏗️ Architecture
              </h2>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="font-bold text-orange-300 mb-2">Consolidated Hook</h3>
                <p className="text-sm text-gray-300 mb-3">
                  The <code className="bg-gray-700 px-2 py-1 rounded">useNetworkSwitcher</code> hook 
                  combines wallet and network functionality:
                </p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <strong>Wallet State:</strong> connection, balance, account</li>
                  <li>• <strong>Network State:</strong> current network, available networks</li>
                  <li>• <strong>Actions:</strong> connect, disconnect, switch networks</li>
                  <li>• <strong>Utilities:</strong> formatters, contract addresses</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                🎯 Usage
              </h2>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <pre className="text-xs text-green-400 overflow-x-auto">
{`import { useNetworkSwitcher } from '../hooks/useNetworkSwitcher';

const {
  // Wallet
  account, isConnected, balance,
  connectWallet, disconnectWallet,
  
  // Network
  currentNetwork, availableNetworks,
  switchToNetwork, getContractAddresses
} = useNetworkSwitcher();`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg border border-blue-700">
          <h2 className="text-xl font-bold text-blue-300 mb-3">
            🎓 Academic Project Notes
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-200">
            <div>
              <h3 className="font-bold mb-2">Contract-Based Networks</h3>
              <p>
                Networks are determined by deployed contracts, not hardcoded lists. 
                This ensures only functional networks are available.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Environment Filtering</h3>
              <p>
                Local development networks are automatically hidden in production, 
                providing a clean user experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkDemo; 