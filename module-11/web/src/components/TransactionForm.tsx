import React, { useState, useEffect, useCallback } from 'react';

interface TransactionFormProps {
  onSubmit: (txDetails: { to: string; value: string; data: string }) => Promise<void>;
  address: string;
  fetchNonce: (address: string) => Promise<number>; 
  fetchGasPrice: () => Promise<bigint>; 
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

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  address,
  fetchNonce,
  fetchGasPrice,
}) => {
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('0x'); 

  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [nonce, setNonce] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [formError, setFormError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

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
      // Pass validated data up to App.tsx
      await onSubmit({ to, value, data });

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
        <input
          id="amount"
          type="number"
          step="any" // Allow more flexible input
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="0.0"
          required
          disabled={isSubmitting}
        />
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

      {/* Display Network Info */}
      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
        <p>Current Gas Price: {displayGasPrice}</p>
        <p>Next Nonce: {displayNonce}</p>
        {/* TODO: Maybe add estimated gas cost preview here - but too lazy for that man and it's fucking 3am */} 
      </div>

      {/* Form Error Display */}
      {formError && (
          <div className="text-sm text-red-600">{formError}</div>
      )}

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={isSubmitting || !!formError || gasPrice === null || nonce === null}
      >
        {isSubmitting ? 'Submitting...' : 'Send Transaction'}
      </button>
    </form>
  );
};

export default TransactionForm; 