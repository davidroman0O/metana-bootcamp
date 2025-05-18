import React, { useState, useEffect, useCallback } from 'react';
import { WALLET_CONFIG } from '../config';

interface TransactionFormProps {
  onSubmit: (txDetails: { to: string; value: string; data: string; type: 'legacy' | 'eip1559'; maxPriorityFee?: string }) => Promise<void>;
  address: string;
  fetchNonce: (address: string) => Promise<number>; 
  fetchGasPrice: () => Promise<bigint>; 
  balance: bigint; // Add balance prop to know how much ETH is available
}

// Helper to check for valid Ethereum address
const isValidAddress = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

// Helper to check for valid hex data
const isValidHexData = (data: string): boolean => {
  return /^0x[0-9a-fA-F]*$/.test(data);
}

// Helper to format Gwei
const formatGwei = (wei: bigint): string => {
  if (wei === 0n) return '0.0000'; // Handle zero case
  // Show more precision
  const gwei = Number(wei) / 1e9;
  return gwei.toFixed(4); // Use 4 decimal places
};

// Helper to format ETH with 8 decimal places
const formatEth = (wei: bigint): string => {
  const ether = Number(wei) / 1e18;
  return ether.toFixed(8);
};

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  address,
  fetchNonce,
  fetchGasPrice,
  balance,
}) => {
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('0x'); 
  const [txType, setTxType] = useState<'legacy' | 'eip1559'>(
    WALLET_CONFIG.defaultTransactionType as 'legacy' | 'eip1559'
  );
  const [maxPriorityFee, setMaxPriorityFee] = useState(WALLET_CONFIG.minPriorityFeeGwei.toString());
  
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [nonce, setNonce] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [formError, setFormError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<{
    isValid: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
    gasEstimate: bigint;
    maxSendable: string;
  } | null>(null);

  // Fetch initial network data (nonce, gas price)
  const loadNetworkData = useCallback(async () => {
    if (!address || !isValidAddress(address)) {
      setNetworkError('Valid wallet address not available.');
      setNonce(null);
      setGasPrice(null);
      return;
    }
    setNetworkError(null);
    try {
      const [currentNonce, currentGasPrice] = await Promise.all([
        fetchNonce(address),
        fetchGasPrice(),
      ]);
      setNonce(currentNonce);
      setGasPrice(currentGasPrice);
      console.log(`TransactionForm State Check: Nonce=${currentNonce}, GasPrice=${currentGasPrice}`);
    } catch (error: any) {
      console.error('Failed to fetch network data:', error);
      setNetworkError(`Failed to load network data: ${error.message}`);
      setNonce(null);
      setGasPrice(null);
    }
  }, [address, fetchNonce, fetchGasPrice]);

  useEffect(() => {
    loadNetworkData();
  }, [loadNetworkData]); // Depend on the memoized function

  // Function to calculate maximum sendable amount
  const calculateMaxSendable = useCallback(() => {
    if (!gasPrice || balance <= 0n) return "0";
    
    // Estimate gas cost:
    // For simple transfers, the gas limit is 21,000
    const estimatedGasLimit = BigInt(21000);
    
    let gasCost: bigint;
    if (txType === 'legacy') {
      // Legacy: gasLimit * gasPrice 
      const adjustedGasPrice = BigInt(Math.floor(Number(gasPrice) * 1.02));
      gasCost = estimatedGasLimit * adjustedGasPrice;
    } else {
      // EIP-1559: gasLimit * maxFeePerGas
      const priorityFeeWei = BigInt(Math.floor(parseFloat(maxPriorityFee) * 1e9));
      const maxFeePerGas = BigInt(Math.floor(Number(gasPrice) * WALLET_CONFIG.gasPriceMultiplier));
      gasCost = estimatedGasLimit * maxFeePerGas;
    }
    
    // Reserve a tiny buffer to prevent exact calculations from failing
    const buffer = BigInt(1e15); // 0.001 ETH buffer
    
    // If balance is less than gas cost + buffer, nothing can be sent
    if (balance <= gasCost + buffer) {
      return "0";
    }
    
    // Calculate max sendable: balance - (gas cost + buffer)
    const maxSendable = balance - (gasCost + buffer);
    
    // Convert to ETH string with 8 decimal places
    const maxSendableEth = Number(maxSendable) / 1e18;
    return maxSendableEth.toFixed(8);
  }, [balance, gasPrice, txType, maxPriorityFee]);

  // Update balance validation when relevant values change
  useEffect(() => {
    // Skip validation if we don't have required inputs
    if (!gasPrice || !value || parseFloat(value) <= 0) {
      setBalanceStatus(null);
      return;
    }
    
    // Convert input value to wei
    const valueWei = BigInt(Math.floor(parseFloat(value) * 1e18));
    
    // Estimate gas cost
    const estimatedGasLimit = BigInt(21000); // Simple transfer
    
    let gasCost: bigint;
    if (txType === 'legacy') {
      // Legacy: gasLimit * gasPrice with 2% buffer
      const adjustedGasPrice = BigInt(Math.floor(Number(gasPrice) * 1.02));
      gasCost = estimatedGasLimit * adjustedGasPrice;
    } else {
      // EIP-1559: gasLimit * maxFeePerGas
      const priorityFeeWei = BigInt(Math.floor(parseFloat(maxPriorityFee) * 1e9));
      const maxFeePerGas = BigInt(Math.floor(Number(gasPrice) * WALLET_CONFIG.gasPriceMultiplier));
      gasCost = estimatedGasLimit * maxFeePerGas;
    }
    
    // Calculate total cost
    const totalCost = valueWei + gasCost;
    
    // Calculate max sendable amount
    const maxSendable = calculateMaxSendable();
    
    // Check if we have enough balance
    if (balance >= totalCost) {
      // Success - we have enough funds
      setBalanceStatus({
        isValid: true,
        message: `Transaction looks good! Gas estimate: ~${formatEth(gasCost)} ETH`,
        severity: 'success',
        gasEstimate: gasCost,
        maxSendable,
      });
    } else if (balance > gasCost) {
      // Warning - we can send something, but not the full amount requested
      setBalanceStatus({
        isValid: false,
        message: `Insufficient balance for this amount. Maximum you can send: ${maxSendable} ETH (with gas)`,
        severity: 'warning',
        gasEstimate: gasCost,
        maxSendable,
      });
    } else {
      // Error - we don't even have enough for gas
      setBalanceStatus({
        isValid: false,
        message: `Insufficient funds for gas fees alone. Need at least ${formatEth(gasCost)} ETH for gas.`,
        severity: 'error',
        gasEstimate: gasCost,
        maxSendable: "0",
      });
    }
  }, [value, gasPrice, txType, maxPriorityFee, balance, calculateMaxSendable]);

  // Validate form fields
  const validateForm = (): boolean => {
    if (!to || !isValidAddress(to)) {
      setFormError('Invalid recipient address format (must start with 0x).');
      return false;
    }
    if (!value || parseFloat(value) <= 0) {
      setFormError('Amount must be a positive number.');
      return false;
    }
    if (!data || !isValidHexData(data)) {
        setFormError('Data must be a valid hex string (starting with 0x).');
        return false;
    }
    if (nonce === null || gasPrice === null) {
      setFormError('Network data (nonce/gas) not loaded yet.');
      return false;
    }
    if (txType === 'eip1559' && (!maxPriorityFee || parseFloat(maxPriorityFee) <= 0)) {
      setFormError('Priority fee must be a positive number when using EIP-1559.');
      return false;
    }
    // Check balance validation
    if (balanceStatus && !balanceStatus.isValid) {
      setFormError(balanceStatus.message);
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null); // Clear previous errors

    try {
      // Prepare transaction based on type
      const txDetails = {
        to,
        value,
        data,
        type: txType,
        ...(txType === 'eip1559' && { maxPriorityFee })
      };

      // Pass validated data up to App.tsx
      await onSubmit(txDetails);

      // Reset form fields after successful submission signal from parent
      // (Ideally parent would signal success, but for now, reset here)
      setTo('');
      setValue('');
      setData('0x');
      // Refresh nonce for the next transaction
      loadNetworkData();
    } catch (err: any) {
      // Errors from the actual transaction submission are handled in App.tsx
      // This catch block is more for potential issues within onSubmit if it threw
      console.error('Form submission handler error:', err);
      // We might display a generic error or rely on App.tsx's error display
      setFormError('An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setting max amount - rewritten with additional debugging
  const handleSetMaxAmount = () => {
    // First, log the current state
    console.log('MAX button debug - Current state:', {
      balance: balance.toString(),
      gasPrice: gasPrice?.toString() || 'null',
      txType,
      maxPriorityFee,
      configGasPriceMultiplier: WALLET_CONFIG.gasPriceMultiplier
    });
    
    if (!gasPrice || balance <= 0n) {
      console.error('MAX button error - Invalid gasPrice or zero balance');
      setValue("0");
      return;
    }
    
    try {
      // Calculate gas cost
      const estimatedGasLimit = BigInt(21000); // Simple transfer
      console.log('Using gas limit:', estimatedGasLimit.toString());
      
      let gasCost: bigint;
      if (txType === 'legacy') {
        // Legacy: gasLimit * gasPrice with 2% buffer
        const adjustedGasPrice = BigInt(Math.floor(Number(gasPrice) * 1.02));
        console.log('Legacy gas price calculation:',
          'Original gas price:', gasPrice.toString(),
          'Adjusted gas price:', adjustedGasPrice.toString());
        gasCost = estimatedGasLimit * adjustedGasPrice;
      } else {
        // EIP-1559: gasLimit * maxFeePerGas
        // Safely handle maxPriorityFee
        const priorityFeeGwei = parseFloat(maxPriorityFee || WALLET_CONFIG.minPriorityFeeGwei.toString());
        const priorityFeeWei = BigInt(Math.floor(priorityFeeGwei * 1e9));
        
        // Debug EIP-1559 gas params
        console.log('EIP-1559 gas params:',
          'Priority fee (Gwei):', priorityFeeGwei,
          'Priority fee (Wei):', priorityFeeWei.toString());
        
        // For max fee, use the base fee (gasPrice) plus the priority fee
        const maxFeePerGas = gasPrice + priorityFeeWei;
        console.log('Calculated maxFeePerGas:', maxFeePerGas.toString());
        
        gasCost = estimatedGasLimit * maxFeePerGas;
      }
      
      console.log('Calculated gas cost:', gasCost.toString());
      
      // Use a smaller buffer for small balances
      const buffer = balance < BigInt(1e16) ? BigInt(1e14) : BigInt(1e15); // 0.0001 ETH or 0.001 ETH
      console.log('Using buffer:', buffer.toString());
      
      // Calculate total costs
      const totalCost = gasCost + buffer;
      console.log('Total cost (gas + buffer):', totalCost.toString());
      console.log('Current balance:', balance.toString());
      
      // If balance is less than gas cost + buffer, allow a very small amount
      if (balance <= totalCost) {
        console.log('Balance too low for gas + buffer, setting minimal amount');
        // For small balances, try to allow at least something to be sent
        if (balance > gasCost) {
          const tinyAmount = (balance - gasCost) / 2n; // Use half of what's left after gas
          const tinyAmountEth = Number(tinyAmount) / 1e18;
          console.log('Can send tiny amount:', tinyAmountEth.toFixed(8));
          setValue(tinyAmountEth.toFixed(8));
        } else {
          console.log('Not enough for even gas, setting to 0');
          setValue("0");
        }
        return;
      }
      
      // Calculate max sendable amount: balance - total cost
      const maxSendable = balance - totalCost;
      console.log('Max sendable Wei:', maxSendable.toString());
      
      // Convert to ETH with proper precision
      const maxSendableEth = Number(maxSendable) / 1e18;
      console.log('Max sendable ETH:', maxSendableEth);
      
      // Format with 8 decimal places and set value
      setValue(maxSendableEth.toFixed(8));
      console.log('Set value to:', maxSendableEth.toFixed(8));
    } catch (error) {
      console.error('Error in MAX button calculation:', error);
      // If anything goes wrong, try a simple fallback calculation
      try {
        // Simple fallback: leave 10% of balance for gas
        const simpleMax = (balance * 9n) / 10n;
        const simpleMaxEth = Number(simpleMax) / 1e18;
        console.log('Using fallback calculation:', simpleMaxEth.toFixed(8));
        setValue(simpleMaxEth.toFixed(8));
      } catch (fallbackError) {
        console.error('Even fallback failed:', fallbackError);
        setValue("0");
      }
    }
  };

  // Conditional rendering for loading/error states
  if (networkError) {
    return <div className="text-red-500">Error: {networkError}</div>;
  }

  if (!address || !isValidAddress(address)) {
    return <div className="text-gray-500">Waiting for wallet connection...</div>;
  }

  if (gasPrice === null || nonce === null) {
    return <div className="text-gray-500">Loading network data (nonce/gas price)...</div>;
  }

  // Derived state for display
  const displayNonce = nonce !== null ? nonce : 'Loading...';
  const displayGasPrice = gasPrice !== null ? `${formatGwei(gasPrice)} Gwei` : 'Loading...';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="eip1559"
              checked={txType === 'eip1559'}
              onChange={() => setTxType('eip1559')}
              className="form-radio h-4 w-4 text-indigo-600"
            />
            <span className="ml-2">EIP-1559 (Recommended)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="legacy"
              checked={txType === 'legacy'}
              onChange={() => setTxType('legacy')}
              className="form-radio h-4 w-4 text-indigo-600"
            />
            <span className="ml-2">Legacy</span>
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          EIP-1559 is the modern standard for Ethereum transactions. It provides more predictable fees and improves network efficiency.
        </p>
      </div>

      {/* To Address Input */}
      <div>
        <label htmlFor="to-address" className="block text-sm font-medium text-gray-700">
          To Address
        </label>
        <input
          id="to-address"
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono ${!isValidAddress(to) && to ? 'border-red-500' : ''}`}
          placeholder="0x..."
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount (ETH)
        </label>
        <div className="flex">
          <input
            id="amount"
            type="number"
            step="any" // Allow more flexible input
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0.0"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={handleSetMaxAmount}
            className="mt-1 px-3 rounded-r-md border border-l-0 border-gray-300 bg-indigo-50 text-indigo-700 font-medium text-sm hover:bg-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={isSubmitting || !balance || balance <= 0n}
          >
            MAX
          </button>
        </div>
        {/* Balance validator feedback */}
        {balanceStatus && (
          <div className={`mt-1 text-xs ${
            balanceStatus.severity === 'success' ? 'text-green-600' : 
            balanceStatus.severity === 'warning' ? 'text-orange-500' : 
            balanceStatus.severity === 'error' ? 'text-red-500' : 
            'text-gray-500'
          }`}>
            {balanceStatus.message}
          </div>
        )}
      </div>

      {/* Data Input */}
      <div>
        <label htmlFor="data" className="block text-sm font-medium text-gray-700">
          Data (hex, optional)
        </label>
        <input
          id="data"
          type="text"
          value={data}
          onChange={(e) => setData(e.target.value || '0x')} // Ensure it defaults to 0x if cleared
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono ${!isValidHexData(data) ? 'border-red-500' : ''}`}
          placeholder="0x..."
          disabled={isSubmitting}
        />
      </div>

      {/* Priority Fee Input - Only for EIP-1559 */}
      {txType === 'eip1559' && (
        <div>
          <label htmlFor="priority-fee" className="block text-sm font-medium text-gray-700">
            Priority Fee (Gwei)
          </label>
          <input
            id="priority-fee"
            type="number"
            step="0.01"
            min="0.05"
            value={maxPriorityFee}
            onChange={(e) => setMaxPriorityFee(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0.05"
            required
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            Tip for miners. Keep this low (0.05-0.1) for testnet transactions.
          </p>
        </div>
      )}

      {/* Display Network Info */}
      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
        <p>Current Gas Price: {displayGasPrice}</p>
        <p>Next Nonce: {displayNonce}</p>
        <p>Your Balance: {formatEth(balance)} ETH</p>
        {txType === 'eip1559' && (
          <p className="mt-1 text-xs">
            <span className="font-medium">EIP-1559:</span> Two-tier fee system with a base fee that's burned and a priority fee (tip) that goes to miners.
          </p>
        )}
      </div>

      {/* Form Error Display */}
      {formError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200 my-2">{formError}</div>
      )}

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={isSubmitting || !!formError || gasPrice === null || nonce === null || Boolean(balanceStatus && !balanceStatus.isValid)}
      >
        {isSubmitting ? 'Submitting...' : 'Send Transaction'}
      </button>
    </form>
  );
};

export default TransactionForm; 