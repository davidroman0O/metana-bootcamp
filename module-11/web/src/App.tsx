import React, { useState, useEffect, useCallback } from 'react';
import { WalletKeyPair, RawTransaction, SignedTransaction, WalletType, HDWalletInfo } from './types';
import WalletDisplay from './components/WalletDisplay';
import TransactionForm from './components/TransactionForm';
import { SEPOLIA_CONFIG, WALLET_CONFIG } from './config';
import {
  generateKeysPair,
  generateHDWallet,
  importHDWallet,
  getAddressFromPrivateKey,
  getBalance,
  getNonce,
  getGasPrice,
  estimateGas,
  prepareTransaction,
  signTransaction,
  sendRawTransaction,
  getTransactionUrl,
  DEFAULT_HD_PATH
} from './lib/wallet';

// Storage keys
const WALLET_PRIVATE_KEY = 'WALLET_PRIVATE_KEY';
const WALLET_TYPE = 'WALLET_TYPE';
const WALLET_MNEMONIC = 'WALLET_MNEMONIC';
const WALLET_HD_PATH = 'WALLET_HD_PATH';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletKeyPair | null>(null);
  // Always default to HD wallet type using config
  const [walletType, setWalletType] = useState<WalletType>(
    WALLET_CONFIG.defaultWalletType === 'hd' ? WalletType.HD : WalletType.SIMPLE
  );
  const [balance, setBalance] = useState<bigint>(0n);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [txResult, setTxResult] = useState<SignedTransaction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize wallet from storage or generate a new one
  useEffect(() => {
    setIsLoading(true);
    const savedType = localStorage.getItem(WALLET_TYPE) as WalletType | null;
    
    // Set wallet type from storage, defaulting to HD if not specified
    const currentWalletType = savedType || WalletType.HD;
    setWalletType(currentWalletType);
    
    try {
      // First, try to load HD wallet regardless of saved type to prioritize HD wallets
      const savedMnemonic = localStorage.getItem(WALLET_MNEMONIC);
      const savedPath = localStorage.getItem(WALLET_HD_PATH) || DEFAULT_HD_PATH;
      
      if (savedMnemonic) {
        // If we have a mnemonic, always use it as the preferred wallet method
        importExistingMnemonic(savedMnemonic, savedPath);
        // Force wallet type to HD
        setWalletType(WalletType.HD);
      } 
      // If no mnemonic but we have a simple key and current wallet type is simple
      else if (currentWalletType === WalletType.SIMPLE) {
        const savedKey = localStorage.getItem(WALLET_PRIVATE_KEY);
        if (savedKey) {
          importExistingKey(savedKey);
        } else {
          // No saved key, generate new HD wallet as a fallback
          generateNewWallet(WalletType.HD);
        }
      } 
      // Default: generate new HD wallet
      else {
        generateNewWallet(WalletType.HD);
      }
    } catch (err: any) {
      console.error('Failed to load saved wallet:', err);
      setError(`Failed to load saved wallet: ${err?.message}. Generating new one.`);
      
      // Always fall back to generating a new HD wallet
      generateNewWallet(WalletType.HD);
    }
    
    setIsLoading(false);
  }, []);

  // Fetch balance when wallet changes
  useEffect(() => {
    if (wallet?.address) {
      fetchBalance(wallet.address);
    }
  }, [wallet]);

  const fetchBalance = useCallback(async (address: string) => {
    try {
      console.log(`Fetching balance for UI display (address: ${address})...`);
      const fetchedBalance = await getBalance(address);
      console.log(`Balance fetched for UI: ${fetchedBalance}`);
      setBalance(fetchedBalance);
    } catch (err: any) {
      setError(`Failed to fetch balance: ${err.message}`);
      setBalance(0n);
    }
  }, []);

  // Generate a new wallet of the specified type
  const generateNewWallet = useCallback((type: WalletType) => {
    setError('');
    setInfo(`Generating new ${type === WalletType.HD ? 'HD wallet' : 'private key'}...`);
    
    try {
      let newWallet: WalletKeyPair;
      
      if (type === WalletType.SIMPLE) {
        // Generate simple key wallet
        newWallet = generateKeysPair();
        localStorage.setItem(WALLET_PRIVATE_KEY, newWallet.privateKey);
        
        // Clear any HD wallet data from storage
        localStorage.removeItem(WALLET_MNEMONIC);
        localStorage.removeItem(WALLET_HD_PATH);
      } else {
        // Generate HD wallet with mnemonic
        newWallet = generateHDWallet();
        
        if (!newWallet.hdWallet) {
          throw new Error('Failed to generate HD wallet info');
        }
        
        localStorage.setItem(WALLET_MNEMONIC, newWallet.hdWallet.mnemonic);
        localStorage.setItem(WALLET_HD_PATH, newWallet.hdWallet.hdPath);
        
        // Still save private key for compatibility
        localStorage.setItem(WALLET_PRIVATE_KEY, newWallet.privateKey);
      }
      
      // Save wallet type
      localStorage.setItem(WALLET_TYPE, type);
      setWalletType(type);
      
      setWallet(newWallet);
      setInfo(`New ${type === WalletType.HD ? 'HD wallet' : 'private key'} generated and saved.`);
      setTxResult(null); // Clear old tx result
    } catch (err: any) {
      setError(`Failed to generate new wallet: ${err.message}`);
      setWallet(null);
      setInfo('');
    }
  }, []);

  // Import an existing private key
  const importExistingKey = useCallback((privateKeyHex: string) => {
    setError('');
    setInfo('Importing private key...');
    
    try {
      // Validate private key format
      if (!privateKeyHex || !privateKeyHex.match(/^[0-9a-fA-F]{64}$/)) {
        throw new Error('Invalid private key format. Must be 64 hex characters.');
      }
      
      // Derive address from private key
      const address = getAddressFromPrivateKey(privateKeyHex);
      const newWallet: WalletKeyPair = {
        privateKey: privateKeyHex,
        publicKey: '', // We don't need to store this
        address: address,
      };
      
      setWallet(newWallet);
      setWalletType(WalletType.SIMPLE);
      
      // Save to local storage
      localStorage.setItem(WALLET_PRIVATE_KEY, privateKeyHex);
      localStorage.setItem(WALLET_TYPE, WalletType.SIMPLE);
      
      // Remove HD wallet data
      localStorage.removeItem(WALLET_MNEMONIC);
      localStorage.removeItem(WALLET_HD_PATH);
      
      setInfo('Private key imported successfully.');
      setTxResult(null); // Clear old tx result
    } catch (err: any) {
      setError(`Failed to import private key: ${err.message}`);
      setWallet(null);
      setInfo('');
    }
  }, []);

  // Import an existing mnemonic
  const importExistingMnemonic = useCallback((mnemonic: string, hdPath: string = DEFAULT_HD_PATH) => {
    setError('');
    setInfo('Importing HD wallet from mnemonic...');
    
    try {
      // Ensure we have a path - use default if none is provided
      const derivationPath = hdPath || DEFAULT_HD_PATH;
      
      // Import the HD wallet using the provided mnemonic and path
      const newWallet = importHDWallet(mnemonic, derivationPath);
      
      if (!newWallet.hdWallet) {
        throw new Error('Failed to import HD wallet info');
      }
      
      setWallet(newWallet);
      setWalletType(WalletType.HD);
      
      // Save to local storage
      localStorage.setItem(WALLET_MNEMONIC, mnemonic);
      localStorage.setItem(WALLET_HD_PATH, derivationPath);
      localStorage.setItem(WALLET_TYPE, WalletType.HD);
      localStorage.setItem(WALLET_PRIVATE_KEY, newWallet.privateKey); // For backward compatibility
      
      setInfo(`HD wallet imported successfully with path: ${derivationPath}`);
      setTxResult(null); // Clear old tx result
    } catch (err: any) {
      setError(`Failed to import mnemonic: ${err.message}`);
      setWallet(null);
      setInfo('');
    }
  }, []);

  // Handle selecting a different HD wallet account
  const handleSelectAccount = useCallback((address: string, privateKey: string, accountIndex: number) => {
    if (!wallet?.hdWallet) {
      setError('No HD wallet available');
      return;
    }
    
    setInfo(`Switching to account #${accountIndex}...`);
    
    try {
      // Create a new wallet object with the selected account info
      const updatedWallet: WalletKeyPair = {
        ...wallet,
        address,
        privateKey,
        hdWallet: {
          ...wallet.hdWallet,
          accountIndex,
          hdPath: `m/44'/60'/0'/0/${accountIndex}` // Update path to match the account index
        }
      };
      
      setWallet(updatedWallet);
      
      // Update storage
      localStorage.setItem(WALLET_PRIVATE_KEY, privateKey);
      localStorage.setItem(WALLET_HD_PATH, updatedWallet.hdWallet!.hdPath);
      
      // Refresh balance for the new account
      fetchBalance(address);
      
      setInfo(`Switched to account #${accountIndex}`);
      setTxResult(null); // Clear old tx result
    } catch (err: any) {
      setError(`Failed to switch account: ${err.message}`);
    }
  }, [wallet]);

  // Switch between wallet types
  const handleSwitchWalletType = useCallback((newType: WalletType) => {
    if (newType === walletType) return; // No change needed
    
    setInfo(`Switching to ${newType === WalletType.HD ? 'HD wallet' : 'simple key wallet'}...`);
    generateNewWallet(newType);
  }, [walletType, generateNewWallet]);

  const handleTransactionSubmit = async (txDetails: { 
    to: string; 
    value: string; 
    data: string; 
    type: 'legacy' | 'eip1559';
    maxPriorityFee?: string;
  }) => {
    if (!wallet) {
      setError('Wallet not available.');
      return;
    }
    setError('');
    setInfo('Processing transaction...');
    setTxResult(null);
    setIsLoading(true);

    try {
      // 1. Fetch current nonce and gas price
      setInfo('Fetching nonce and gas price...');
      const [currentNonce, currentGasPrice] = await Promise.all([
        getNonce(wallet.address),
        getGasPrice(),
      ]);
      console.log(`Fetched Nonce: ${currentNonce}, Fetched Gas Price (Wei): ${currentGasPrice}`);

      // 2. Prepare basic transaction params for estimation
      const valueWei = BigInt(Math.floor(parseFloat(txDetails.value) * 1e18));
      let baseTx: RawTransaction;

      // Set up the transaction based on type (defaulting to EIP-1559 if not specified)
      const txType = txDetails.type || WALLET_CONFIG.defaultTransactionType as 'legacy' | 'eip1559';
      
      if (txType === 'legacy') {
        // Legacy transaction - use a lower gas price to avoid insufficient funds
        // Apply a smaller multiplier for testnet transactions
        const adjustedGasPrice = BigInt(Math.floor(Number(currentGasPrice) * 1.02)); // Just 2% higher than current
        
        baseTx = {
          nonce: currentNonce,
          gasPrice: adjustedGasPrice,
          gasLimit: BigInt(WALLET_CONFIG.minGasLimit), // Start with minimum
          to: txDetails.to,
          value: valueWei,
          data: txDetails.data || '0x',
          chainId: SEPOLIA_CONFIG.chainId,
          type: 'legacy'
        };
      } else {
        // EIP-1559 transaction - use minimum values that will still be accepted
        const priorityFeeGwei = parseFloat(txDetails.maxPriorityFee || WALLET_CONFIG.minPriorityFeeGwei.toString());
        const priorityFeeWei = BigInt(Math.floor(priorityFeeGwei * 1e9)); // Convert Gwei to Wei
        
        // For maxFeePerGas, use a small multiplier
        const maxFeePerGas = BigInt(Math.floor(Number(currentGasPrice) * WALLET_CONFIG.gasPriceMultiplier));
        
        baseTx = {
          nonce: currentNonce,
          maxPriorityFeePerGas: priorityFeeWei,
          maxFeePerGas: maxFeePerGas,
          gasLimit: BigInt(WALLET_CONFIG.minGasLimit), // Start with minimum
          to: txDetails.to,
          value: valueWei,
          data: txDetails.data || '0x',
          chainId: SEPOLIA_CONFIG.chainId,
          type: 'eip1559'
        };
      }

      // 3. Estimate gas through rpc with a fallback
      setInfo('Estimating gas...');
      let estimatedGas;
      try {
        // For better estimation, use a smaller portion of the value to avoid insufficient funds errors
        // during estimation (we'll still send the full amount in the real tx)
        const estimationValue = baseTx.value > 0n ? baseTx.value / 10n : 0n;
        
        estimatedGas = await estimateGas({
          from: wallet.address,
          to: baseTx.to,
          value: '0x' + estimationValue.toString(16),
          data: baseTx.data,
        });
        
        // Cap the gas limit to prevent excessive costs
        if (estimatedGas > BigInt(WALLET_CONFIG.maxGasLimit)) {
          estimatedGas = BigInt(WALLET_CONFIG.maxGasLimit);
        }
      } catch (error) {
        console.warn('Gas estimation failed, using default limit:', error);
        // Don't log the full error object to console to reduce noise
        
        // Use the minimum for simple transfers or a bit more for contract interactions
        estimatedGas = baseTx.data === '0x' ? 
          BigInt(WALLET_CONFIG.minGasLimit) : 
          BigInt(WALLET_CONFIG.maxGasLimit);
      }

      // Set a safety buffer for gas limit (5% more)
      const safeGasLimit = BigInt(Math.floor(Number(estimatedGas) * 1.05));
      
      // 4. Update the transaction with the estimated gas
      const finalTx: RawTransaction = {
        ...baseTx,
        gasLimit: safeGasLimit,
      };

      // 5. Check balance with buffer for potential fluctuation
      let gasCost: bigint;
      if (txType === 'legacy') {
        gasCost = finalTx.gasLimit * (finalTx.gasPrice || 0n);
      } else {
        gasCost = finalTx.gasLimit * (finalTx.maxFeePerGas || 0n);
      }
      
      const totalCost = finalTx.value + gasCost;
      const currentBalance = await getBalance(wallet.address);
      console.log(`Balance check inside submit: Have ${currentBalance}, Need ${totalCost}`);
      
      if (currentBalance < totalCost) {
        setIsLoading(false);
        
        // Calculate how much more ETH is needed
        const shortfall = totalCost - currentBalance;
        const shortfallEth = formatEth(shortfall);
        
        // Create a more helpful error message
        throw new Error(
          `Insufficient funds for this transaction. You need ${shortfallEth} more ETH. ` + 
          `Total required: ${formatEth(totalCost)} ETH, Current balance: ${formatEth(currentBalance)} ETH`
        );
      }

      // Reduce gas limit further if possible (for simple transfers)
      if (finalTx.data === '0x' && estimatedGas > BigInt(21000)) {
        console.log('Simple transfer detected, optimizing gas limit');
        finalTx.gasLimit = BigInt(21000);
      }

      // 6. Prepare and Sign
      setInfo('Signing transaction...');
      const preparedTx = prepareTransaction(finalTx);
      const signedTx = signTransaction(preparedTx, wallet.privateKey, SEPOLIA_CONFIG.chainId);

      // 7. Broadcast
      setInfo('Broadcasting transaction...');
      const txHash = await sendRawTransaction(signedTx.serialized);

      const txUrl = getTransactionUrl(txHash);
      
      // Show initial success
      setInfo(`Transaction submitted! Hash: ${txHash.substring(0, 10)}...`);
      
      // Initialize transaction result
      const initialResult: SignedTransaction = {
        ...signedTx,
        hash: txHash,
        url: txUrl,
      };
      
      setTxResult(initialResult);
      
      // 8. Wait for confirmation
      setInfo(`Waiting for confirmation... (May take a minute)`);
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 12; // About 1 minute with 5-second intervals
      
      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, WALLET_CONFIG.pollingInterval));
        
        try {
          // Try to get transaction receipt
          const receipt = await fetchJsonRpc('eth_getTransactionReceipt', [txHash]);
          
          if (receipt && receipt.blockNumber) {
            // Transaction confirmed!
            confirmed = true;
            
            const blockNumber = parseInt(receipt.blockNumber, 16);
            const gasUsed = BigInt(receipt.gasUsed || '0x0');
            const status = receipt.status === '0x1' ? 'success' : 'failed';
            
            // Calculate actual cost
            const actualGasCost = txType === 'legacy'
              ? gasUsed * (finalTx.gasPrice || 0n)
              : gasUsed * (finalTx.maxPriorityFeePerGas || 0n); // This is simplified
            
            const finalResult: SignedTransaction = {
              ...initialResult,
              actualGasUsed: gasUsed,
              blockNumber,
              status,
              actualCost: actualGasCost
            };
            
            setTxResult(finalResult);
            setInfo(`Transaction confirmed in block #${blockNumber}! Status: ${status}`);
            
            // Refresh balance after successful transaction
            fetchBalance(wallet.address);
            break;
          }
        } catch (error) {
          console.warn('Error checking transaction status:', error);
        }
        
        attempts++;
        setInfo(`Waiting for confirmation... Attempt ${attempts}/${maxAttempts}`);
      }
      
      // If we couldn't confirm in time
      if (!confirmed) {
        setInfo('Transaction submitted but confirmation timed out. Check explorer for status.');
      }
      
      // Always refresh balance at the end
      fetchBalance(wallet.address);
    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(`Transaction failed: ${err.message}`);
      setInfo(''); // Clear info on error
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to fetch transaction receipt (add this to App.tsx)
  const fetchJsonRpc = async (method: string, params: any[] = []) => {
    try {
      const response = await fetch(SEPOLIA_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      return data.result;
    } catch (error: any) {
      console.error('RPC request failed:', error);
      throw error;
    }
  };

  // Helper to format ETH
  const formatEth = (wei: bigint): string => {
    const ether = Number(wei) / 1e18;
    // Use toFixed to limit decimals, adjust as needed
    return ether.toFixed(8);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto w-full">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-10 md:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold mb-8 text-center text-gray-800">
                  {walletType === WalletType.HD ? 'HD Wallet' : 'Simple Key Wallet'} (Sepolia)
                </h1>

                {isLoading && <div className="text-center text-gray-500">Loading Wallet...</div>}

                {/* Only show general info that's not transaction-related */}
                {info && !info.startsWith('Transaction') && (
                  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                    {info}
                    <button
                      className="absolute top-0 bottom-0 right-0 px-4 py-3"
                      onClick={() => setInfo('')}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Remove error messages from here since they're now above the form */}

                {/* Remove txResult from here since it's now above the form */}

                {wallet && (
                  <>
                    <WalletDisplay
                      address={wallet.address}
                      privateKeyHex={wallet.privateKey}
                      hdWallet={wallet.hdWallet}
                      walletType={walletType}
                      balance={balance}
                      formatEth={formatEth}
                      onImportPrivateKey={importExistingKey}
                      onImportMnemonic={importExistingMnemonic}
                      onGenerateNewKey={generateNewWallet}
                      onSwitchWalletType={handleSwitchWalletType}
                      onSelectAccount={handleSelectAccount}
                    />
                    <hr className="my-6" />
                    {/* Display transaction-related messages directly above the form */}
                    {txResult && (
                      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 break-all">
                        <p className="font-semibold">Transaction Sent!</p>
                        <p>Hash: {txResult.hash}</p>
                        {txResult.url && (
                          <a
                            href={txResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 underline"
                          >
                            View on Sepolia Etherscan
                          </a>
                        )}
                        <button
                          className="absolute top-0 bottom-0 right-0 px-4 py-3"
                          onClick={() => setTxResult(null)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {/* Move error message here, directly before the form */}
                    {error && (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        {error}
                        <button
                          className="absolute top-0 bottom-0 right-0 px-4 py-3"
                          onClick={() => setError('')}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {/* Show transaction-specific info messages here */}
                    {info && info.startsWith('Transaction') && (
                      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                        {info}
                        <button
                          className="absolute top-0 bottom-0 right-0 px-4 py-3"
                          onClick={() => setInfo('')}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <TransactionForm
                      onSubmit={handleTransactionSubmit}
                      address={wallet.address}
                      fetchNonce={getNonce}
                      fetchGasPrice={getGasPrice}
                      balance={balance}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 