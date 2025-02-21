import { useAccount, useChainId, useBlockNumber } from 'wagmi';
import { useForgeContract } from '@/hooks/use-forge-contract';
import { useTokenContract } from '@/hooks/use-token-contract';
import { useToken } from '@/hooks/use-token';
import { polygon } from 'wagmi/chains';
const isProd = import.meta.env.MODE === 'production'

const EnhancedDebug = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const forgeContract = useForgeContract();
  const tokenContract = useTokenContract();
  const { data: blockNumber } = useBlockNumber();
  const { 
    exists, 
    initialized, 
    tokens, 
    balances,
    cooldownRemaining,
    canMint 
  } = useToken();

  // Convert balances to regular numbers for display
  const displayBalances = Object.entries(balances || {}).reduce((acc, [key, value]) => {
    acc[key] = value.toString();
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 font-mono text-sm">
      <div className="max-w-4xl mx-auto space-y-1">
        <div>Prod: {isProd?.toString()}</div>
        <div>Chain ID: {chainId} {chainId === polygon.id ? '(Polygon)' : ''}</div>
        <div>Block: {blockNumber?.toString()}</div>
        <div>Wallet: {address || 'Not connected'}</div>
        <div>Forge Contract: {forgeContract.address}</div>
        <div>Token Contract: {tokenContract.address}</div>
        <div>Contract State:</div>
        <div className="pl-4">
          <div>Exists: {String(exists)}</div>
          <div>Initialized: {String(initialized)}</div>
          <div>Can Mint: {String(canMint)}</div>
          <div>Cooldown: {cooldownRemaining}</div>
          <div>Token Count: {tokens?.length}</div>
          <div>Balances: {JSON.stringify(displayBalances)}</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDebug;