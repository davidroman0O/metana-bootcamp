import React, { useState } from 'react';

interface WalletDisplayProps {
  address: string;
  privateKeyHex: string | null;
  balance: bigint;
  formatEth: (wei: bigint) => string;
  onImportPrivateKey: (key: string) => void;
  onGenerateNewKey: () => void;
}

const WalletDisplay: React.FC<WalletDisplayProps> = ({ 
  address, 
  privateKeyHex, 
  balance,
  formatEth,
  onImportPrivateKey,
  onGenerateNewKey 
}) => {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleCopyPrivateKey = () => {
    if (!privateKeyHex) return;
    navigator.clipboard.writeText(privateKeyHex);
    alert('Private key copied to clipboard!');
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onImportPrivateKey(importKey);
      setImportKey('');
      setShowImport(false);
    } catch (err: any) {
      alert(err?.message || 'Invalid private key format');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Wallet Address</h2>
        <div className="bg-gray-100 p-4 rounded break-all font-mono text-sm">
          {address || 'Loading...'}
        </div>
      </div>

      <div>
        <h3 className="text-md font-semibold mb-1">Balance</h3>
        <div className="text-gray-800 text-lg">
          {formatEth(balance)} ETH
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={!privateKeyHex}
          >
            {showPrivateKey ? 'Hide' : 'Show'} Private Key
          </button>
          <button
            onClick={handleCopyPrivateKey}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={!privateKeyHex}
          >
            Copy Private Key
          </button>
        </div>

        {showPrivateKey && privateKeyHex && (
          <div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  ⚠️
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Warning: Never share your private key with anyone! Anyone with your private key can steal your funds.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-4 rounded break-all font-mono text-sm">
              {privateKeyHex}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Import Private Key
          </button>
          <button
            onClick={onGenerateNewKey}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Generate New Key
          </button>
        </div>

        {showImport && (
          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Enter Private Key (64 hex chars)
                <input
                  type="text"
                  value={importKey}
                  onChange={(e) => setImportKey(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., 0f1e2d3c..."
                  required
                  pattern="[0-9a-fA-F]{64}"
                  title="Please enter 64 hexadecimal characters"
                />
              </label>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Import
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WalletDisplay; 