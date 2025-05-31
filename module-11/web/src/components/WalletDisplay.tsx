import React, { useState, useEffect } from 'react';
import { HDWalletInfo, WalletType } from '../types';
import AccountSelector from './AccountSelector';
import { DEFAULT_HD_PATH } from '../lib/wallet';

interface WalletDisplayProps {
  address: string;
  privateKeyHex: string | null;
  hdWallet?: HDWalletInfo | null;
  walletType: WalletType;
  balance: bigint;
  formatEth: (wei: bigint) => string;
  onImportPrivateKey: (key: string) => void;
  onImportMnemonic: (mnemonic: string, path?: string) => void;
  onGenerateNewKey: (type: WalletType) => void;
  onSwitchWalletType: (type: WalletType) => void;
  onSelectAccount?: (address: string, privateKey: string, accountIndex: number) => void;
}

const WalletDisplay: React.FC<WalletDisplayProps> = ({ 
  address, 
  privateKeyHex, 
  hdWallet,
  walletType,
  balance,
  formatEth,
  onImportPrivateKey,
  onImportMnemonic,
  onGenerateNewKey,
  onSwitchWalletType,
  onSelectAccount
}) => {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importPath, setImportPath] = useState(DEFAULT_HD_PATH);
  const [showImport, setShowImport] = useState(false);
  const [showMnemonicImport, setShowMnemonicImport] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  
  const handleCopyPrivateKey = () => {
    if (!privateKeyHex) return;
    navigator.clipboard.writeText(privateKeyHex);
    alert('Private key copied to clipboard!');
  };

  const handleCopyMnemonic = () => {
    if (!hdWallet?.mnemonic) return;
    navigator.clipboard.writeText(hdWallet.mnemonic);
    alert('Mnemonic phrase copied to clipboard!');
  };

  const handleImportKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onImportPrivateKey(importKey);
      setImportKey('');
      setShowImport(false);
    } catch (err: any) {
      alert(err?.message || 'Invalid private key format');
    }
  };

  const handleImportMnemonicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onImportMnemonic(importMnemonic, importPath || undefined);
      setImportMnemonic('');
      setImportPath('');
      setShowMnemonicImport(false);
    } catch (err: any) {
      alert(err?.message || 'Invalid mnemonic phrase');
    }
  };
  
  const handleAccountSelect = (address: string, privateKey: string, accountIndex: number) => {
    if (onSelectAccount) {
      onSelectAccount(address, privateKey, accountIndex);
      setShowAccountSelector(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Wallet Address</h2>
        <div className="bg-gray-100 p-4 rounded break-all font-mono text-sm">
          {address || 'Loading...'}
        </div>
        {walletType === WalletType.HD && (
          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            HD Wallet (Multiple Addresses)
          </div>
        )}
      </div>

      <div>
        <h3 className="text-md font-semibold mb-1">Balance</h3>
        <div className="text-gray-800 text-lg">
          {formatEth(balance)} ETH
        </div>
      </div>

      {/* Wallet Type Information */}
      <div className="bg-blue-50 p-4 rounded">
        <div className="flex justify-between items-center">
          <h3 className="text-md font-semibold">Wallet Type: {walletType === WalletType.HD ? 'HD Wallet' : 'Simple Key'}</h3>
          {walletType !== WalletType.HD && (
            <button
              onClick={() => onSwitchWalletType(WalletType.HD)}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Switch to HD Wallet (Recommended)
            </button>
          )}
          {walletType === WalletType.HD && (
            <button
              onClick={() => onSwitchWalletType(WalletType.SIMPLE)}
              className="text-sm px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Switch to Simple Key
            </button>
          )}
        </div>
        
        {walletType === WalletType.HD && (
          <div className="mt-2 text-sm text-gray-600">
            <p className="text-xs mt-1 text-gray-500">
              <span className="font-semibold">HD Wallet (Recommended):</span> Hierarchical Deterministic wallets generate multiple addresses from a single seed phrase. 
              Always keep your mnemonic phrase secure - it's the only way to recover all accounts.
            </p>
          </div>
        )}
        
        {walletType === WalletType.SIMPLE && (
          <div className="mt-2 text-sm text-gray-600">
            <p className="text-xs mt-1 text-gray-500">
              <span className="font-semibold">Simple Key Wallet:</span> Uses a single private key for a single address.
              Consider switching to an HD wallet for better security and flexibility.
            </p>
          </div>
        )}
        
        {hdWallet && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Path: {hdWallet.hdPath}</p>
            <p>Account: {hdWallet.accountIndex}</p>
            
            {onSelectAccount && (
              <button
                onClick={() => setShowAccountSelector(!showAccountSelector)}
                className="mt-2 text-sm px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                {showAccountSelector ? 'Hide' : 'Show'} Accounts
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Account Selector */}
      {showAccountSelector && walletType === WalletType.HD && hdWallet && onSelectAccount && (
        <AccountSelector
          hdWallet={hdWallet}
          currentAddress={address}
          onSelectAccount={handleAccountSelect}
        />
      )}

      <div className="space-y-4">
        {/* Private Key Section */}
        {walletType === WalletType.SIMPLE && (
          <div>
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
              <div className="mt-2">
                <SecurityWarning type="key" />
                <div className="bg-gray-100 p-4 rounded break-all font-mono text-sm">
                  {privateKeyHex}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mnemonic Section */}
        {walletType === WalletType.HD && hdWallet && (
          <div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowMnemonic(!showMnemonic)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                {showMnemonic ? 'Hide' : 'Show'} Mnemonic
              </button>
              <button
                onClick={handleCopyMnemonic}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Copy Mnemonic
              </button>
            </div>

            {showMnemonic && (
              <div className="mt-2">
                <SecurityWarning type="mnemonic" />
                <div className="bg-gray-100 p-4 rounded break-all font-mono text-sm">
                  {hdWallet.mnemonic}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import/Generate Section */}
        <div className="flex space-x-2">
          {walletType === WalletType.SIMPLE ? (
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Import Private Key
            </button>
          ) : (
            <button
              onClick={() => setShowMnemonicImport(!showMnemonicImport)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Import Mnemonic
            </button>
          )}
          <button
            onClick={() => onGenerateNewKey(walletType)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Generate New {walletType === WalletType.HD ? 'HD Wallet' : 'Key'}
          </button>
        </div>

        {/* Import Private Key Form */}
        {showImport && (
          <form onSubmit={handleImportKeySubmit} className="space-y-4">
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

        {/* Import Mnemonic Form */}
        {showMnemonicImport && (
          <form onSubmit={handleImportMnemonicSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Enter Mnemonic Phrase (12 or 24 words)
                <textarea
                  value={importMnemonic}
                  onChange={(e) => setImportMnemonic(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                  required
                  rows={3}
                />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                HD Path <span className="text-gray-500">(required for correct address derivation)</span>
                <input
                  type="text"
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder={DEFAULT_HD_PATH}
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Standard Ethereum path is {DEFAULT_HD_PATH} - using different paths will derive different addresses!
              </p>
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

// Security warning component
const SecurityWarning: React.FC<{ type: 'key' | 'mnemonic' }> = ({ type }) => (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
    <div className="flex">
      <div className="flex-shrink-0">
        ⚠️
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          Warning: Never share your {type === 'key' ? 'private key' : 'mnemonic phrase'} with anyone! 
          Anyone with your {type === 'key' ? 'private key' : 'seed phrase'} can steal your funds.
        </p>
      </div>
    </div>
  </div>
);

export default WalletDisplay; 