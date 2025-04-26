import React, { useState, useEffect, useCallback } from 'react';
import { WalletKeyPair, RawTransaction, SignedTransaction } from './types';
import WalletDisplay from './components/WalletDisplay';
import TransactionForm from './components/TransactionForm';
import { SEPOLIA_CONFIG } from './config';
import {
  generateKeysPair,
  getAddressFromPrivateKey,
  getBalance,
  getNonce,
  getGasPrice,
  estimateGas,
  prepareTransaction,
  signTransaction,
  sendRawTransaction,
  getTransactionUrl,
} from './lib/wallet';

const WALLET_KEY = 'WALLET_PRIVATE_KEY';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletKeyPair | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [txResult, setTxResult] = useState<SignedTransaction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize wallet or generate a new one
  useEffect(() => {
    setIsLoading(true);
    const savedKey = localStorage.getItem(WALLET_KEY);
    if (savedKey) {
      try {
        importExistingKey(savedKey);
      } catch (err: any) {
        console.error('Failed to load saved wallet:', err);
        setError(`Failed to load saved key: ${err?.message}. Generating new one.`);
        generateNewWallet();
      }
    } else {
      generateNewWallet();
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

  const generateNewWallet = useCallback(() => {
    setError('');
    setInfo('Generating new wallet...');
    try {
      const newKeys = generateKeysPair();
      setWallet(newKeys);
      localStorage.setItem(WALLET_KEY, newKeys.privateKey);
      setInfo('New wallet generated and saved.');
      setTxResult(null); // Clear old tx result
    } catch (err: any) {
      setError(`Failed to generate new wallet: ${err.message}`);
      setWallet(null);
      setInfo('');
    }
  }, []);

  const importExistingKey = useCallback((privateKeyHex: string) => {
    setError('');
    setInfo('Importing key...');
    try {
      if (!privateKeyHex || !privateKeyHex.match(/^[0-9a-fA-F]{64}$/)) {
        throw new Error('Invalid private key format. Must be 64 hex characters.');
      }
      const address = getAddressFromPrivateKey(privateKeyHex);
      const newKeys: WalletKeyPair = {
        privateKey: privateKeyHex,
        publicKey: '', // We don't need public key derived here for display
        address: address,
      };
      setWallet(newKeys);
      localStorage.setItem(WALLET_KEY, privateKeyHex);
      setInfo('Wallet imported successfully.');
      setTxResult(null); // Clear old tx result
    } catch (err: any) {
      setError(`Failed to import private key: ${err.message}`);
      setWallet(null);
      setInfo('');
    }
  }, []);

  const handleTransactionSubmit = async (txDetails: { to: string; value: string; data: string }) => {
    if (!wallet) {
      setError('Wallet not available.');
      return;
    }
    setError('');
    setInfo('Processing transaction...');
    setTxResult(null);

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
      const baseTx: RawTransaction = {
        nonce: currentNonce,
        gasPrice: currentGasPrice,
        gasLimit: 0n, // Placeholder, will be estimated
        to: txDetails.to,
        value: valueWei,
        data: txDetails.data || '0x',
        chainId: SEPOLIA_CONFIG.chainId,
      };

      // 3. Estimate gas through rpc
      setInfo('Estimating gas...');
      const estimatedGas = await estimateGas({
        from: wallet.address,
        to: baseTx.to,
        value: '0x' + baseTx.value.toString(16),
        data: baseTx.data,
      });

      const finalTx: RawTransaction = {
        ...baseTx,
        gasLimit: estimatedGas,
      };

      // 4. Check balance
      const totalCost = finalTx.value + finalTx.gasLimit * finalTx.gasPrice;
      const currentBalance = await getBalance(wallet.address);
      console.log(`Balance check inside submit: Have ${currentBalance}, Need ${totalCost}`);
      if (currentBalance < totalCost) {
        throw new Error(
          `Insufficient funds. Required: ${formatEth(totalCost)} ETH, Balance: ${formatEth(currentBalance)} ETH`
        );
      }

      // 5. Prepare and Sign
      setInfo('Signing transaction...');
      const preparedTx = prepareTransaction(finalTx);
      const signedTx = signTransaction(preparedTx, wallet.privateKey, SEPOLIA_CONFIG.chainId);

      // 6. Broadcast
      setInfo('Broadcasting transaction...');
      const txHash = await sendRawTransaction(signedTx.serialized);

      const finalResult: SignedTransaction = {
        ...signedTx,
        hash: txHash,
        url: getTransactionUrl(txHash),
      };
      setTxResult(finalResult);
      setInfo('Transaction submitted successfully!');
      // Refresh balance after tx for ui purposes
      fetchBalance(wallet.address);
    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(`Transaction failed: ${err.message}`);
      setInfo(''); // Clear info on error
    } finally {
      // Optionally clear info after a delay if successful, i don't know if this is needed ¯\_(ツ)_/¯
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
                  Manual Crypto Wallet (Sepolia)
                </h1>

                {isLoading && <div className="text-center text-gray-500">Loading Wallet...</div>}

                {info && (
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

                {wallet && (
                  <>
                    <WalletDisplay
                      address={wallet.address}
                      privateKeyHex={wallet.privateKey}
                      balance={balance}
                      formatEth={formatEth}
                      onImportPrivateKey={importExistingKey}
                      onGenerateNewKey={generateNewWallet}
                    />
                    <hr className="my-6" />
                    <TransactionForm
                      onSubmit={handleTransactionSubmit}
                      address={wallet.address}
                      fetchNonce={getNonce}
                      fetchGasPrice={getGasPrice}
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