import React from 'react';
import { useBalance, useAccount, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

const NativeBalance = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const { data: balance, isError, isLoading } = useBalance({
    address,
    chainId,
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  });

  if (!address) return null;
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="i-line-md:loading-twotone-loop h-4 w-4 text-primary" />
        Loading balance...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-red-500">
        Error loading balance
      </div>
    );
  }

  if (!balance) return null;

  const formattedBalance = formatUnits(balance.value, balance.decimals);
  const numericBalance = parseFloat(formattedBalance);
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
      <span className="font-medium">{numericBalance.toFixed(4)}</span>
      <span className="text-purple-700">{balance.symbol}</span>
      <span className="text-xs text-gray-500">
        ${(numericBalance * 1.15).toFixed(2)}
      </span>
    </div>
  );
};

export default NativeBalance;