import React, { useEffect } from 'react';
import { useAccount,useConnections, useChainId, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from '@/config/networks';

const NetworkHandler = () => {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { isConnected } = useAccount();

  const connections = useConnections()
  console.log('connections', connections)

  const isValidNetwork = () => {
    if (!chainId) return false;
    return SUPPORTED_CHAINS.some(chain => {
      // console.log('supported chains', chain.id === chainId, chain.id, chainId)
      return chain.id === chainId
    }) && connections.some(connection => {
      // console.log('connection', connection.chainId === chainId, connection.chainId, chainId)
     return connection.chainId === chainId
    })
  };

  console.log('isValidNetwork', isValidNetwork());

  // Automatically switch to the correct network when connected
  useEffect(() => {
    if (isConnected && !isValidNetwork() && !isPending) {
      console.log('Switching to correct network...');
      switchChain({ chainId: DEFAULT_CHAIN.id });
    }
  }, [isConnected, chainId, isPending]);

  console.log('chainId', chainId);

  if (!chainId || isValidNetwork()) return null;

  if (connections.length === 0) {
    console.log('No connections found');
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-4">
      <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-red-800">
            Wrong Network Detected
          </h3>
          <p className="text-red-700 text-sm mb-2">
            Please switch to {SUPPORTED_CHAINS.map(chain => chain.name).join(' or ')} to use this application.
          </p>
          <button
            onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
            disabled={isPending}
            className="bg-white text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? 'Switching...' : `Switch to ${DEFAULT_CHAIN.name}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkHandler;