import React from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { polygon, sepolia, anvil } from 'wagmi/chains';

const NetworkHandler = () => {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isValidNetwork = () => {
    if (!chainId) return false;
    return chainId === polygon.id || chainId === sepolia.id || chainId === anvil.id;
  };

  if (!chainId || isValidNetwork()) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-4">
      <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-red-800">
            Wrong Network Detected
          </h3>
          <p className="text-red-700 text-sm mb-2">
            Please switch to Polygon, Sepolia, or Anvil network to use this application.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => switchChain({ chainId: polygon.id })}
              disabled={isPending}
              className="bg-white text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? 'Switching...' : 'Switch to Polygon'}
            </button>
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isPending}
              className="bg-white text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? 'Switching...' : 'Switch to Sepolia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkHandler;