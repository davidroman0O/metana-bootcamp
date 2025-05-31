import React, { useState, useEffect } from 'react';
import { HDWalletInfo } from '../types';
import { deriveAddressFromHDWallet } from '../lib/wallet';

interface AccountSelectorProps {
  hdWallet: HDWalletInfo;
  currentAddress: string;
  onSelectAccount: (address: string, privateKey: string, accountIndex: number) => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({ 
  hdWallet, 
  currentAddress, 
  onSelectAccount 
}) => {
  const [accounts, setAccounts] = useState<Array<{ address: string; privateKey: string; index: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // On mount, derive the first few accounts
  useEffect(() => {
    generateAccounts(0, 5);
  }, [hdWallet.mnemonic, hdWallet.hdPath]);

  // Derive accounts from the HD wallet
  const generateAccounts = (startIndex: number, count: number) => {
    setIsLoading(true);
    
    const newAccounts: Array<{ address: string; privateKey: string; index: number }> = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      try {
        const derived = deriveAddressFromHDWallet(hdWallet, i);
        newAccounts.push({
          address: derived.address,
          privateKey: derived.privateKey,
          index: i
        });
      } catch (err) {
        console.error(`Error deriving account at index ${i}:`, err);
      }
    }
    
    setAccounts(prevAccounts => {
      // Filter out duplicates
      const combined = [...prevAccounts, ...newAccounts];
      const unique = combined.filter((acc, index, self) => 
        index === self.findIndex(a => a.index === acc.index)
      );
      // Sort by index
      return unique.sort((a, b) => a.index - b.index);
    });
    
    setIsLoading(false);
  };

  const handleSelectAccount = (address: string, privateKey: string, index: number) => {
    onSelectAccount(address, privateKey, index);
  };
  
  const loadMoreAccounts = () => {
    // Load the next 5 accounts
    const nextIndex = accounts.length > 0 ? accounts[accounts.length - 1].index + 1 : 0;
    generateAccounts(nextIndex, 5);
  };

  return (
    <div className="my-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold">HD Wallet Accounts</h3>
        <span className="text-xs text-green-600">
          All from same seed phrase
        </span>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">
        Your HD wallet can generate unlimited accounts from a single seed phrase. 
        Each address has its own private key but can be recovered from the same mnemonic.
      </p>
      
      <div className="overflow-hidden bg-white shadow rounded-md">
        <ul className="divide-y divide-gray-200">
          {accounts.map(account => (
            <li 
              key={account.index} 
              className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 
                ${account.address.toLowerCase() === currentAddress.toLowerCase() ? 'bg-blue-50' : ''}`}
              onClick={() => handleSelectAccount(account.address, account.privateKey, account.index)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Account #{account.index}</p>
                  <p className="text-xs text-gray-500 truncate">{account.address}</p>
                </div>
                {account.address.toLowerCase() === currentAddress.toLowerCase() && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Active
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 bg-gray-50 text-right">
          <button 
            onClick={loadMoreAccounts} 
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More Accounts'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSelector; 