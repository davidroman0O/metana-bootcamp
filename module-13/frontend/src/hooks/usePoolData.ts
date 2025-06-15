import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { DegenSlotsABI } from '../config/contracts/DegenSlotsABI';
import { CONTRACT_ADDRESSES } from '../config/wagmi';

interface PoolData {
  poolETH: string | null;
  ethPrice: string | null;
  chipRate: string | null;
  isLoading: boolean;
  error: string | null;
}

export function usePoolData(chainId: number | undefined): PoolData {
  const addresses = CONTRACT_ADDRESSES[chainId || 31337] || {};
  
  // Get pool stats
  const { data: poolStats, isLoading: poolStatsLoading, error: poolStatsError } = useReadContract({
    address: addresses.CASINO_SLOT, 
    abi: DegenSlotsABI, 
    functionName: 'getPoolStats',
    query: { 
      enabled: !!addresses.CASINO_SLOT,
      retry: 3,
      refetchInterval: 10000,
    },
  });

  // Get chip rate (chips per 1 ETH)
  const { data: chipsFromETH, isLoading: chipRateLoading, error: chipRateError } = useReadContract({
    address: addresses.CASINO_SLOT, 
    abi: DegenSlotsABI, 
    functionName: 'calculateChipsFromETH',
    args: [BigInt(1e18)], // 1 ETH
    query: { 
      enabled: !!addresses.CASINO_SLOT,
      retry: 3,
      refetchInterval: 10000,
    },
  });

  // Parse pool data safely
  const poolETH = (() => {
    try {
      if (!poolStats || !Array.isArray(poolStats)) return null;
      const poolAmount = poolStats[0] as bigint;
      return parseFloat(formatEther(poolAmount)).toFixed(2);
    } catch (error) {
      return null;
    }
  })();

  // Parse ETH price safely
  const ethPrice = (() => {
    try {
      if (!poolStats || !Array.isArray(poolStats) || !poolStats[2]) return null;
      const priceInCents = Number(poolStats[2] as bigint);
      return `$${(priceInCents / 100).toLocaleString()}`;
    } catch (error) {
      return null;
    }
  })();

  // Parse chip rate safely
  const chipRate = (() => {
    try {
      if (!chipsFromETH) return null;
      const chipsAmount = parseFloat(formatEther(chipsFromETH as bigint));
      return chipsAmount.toLocaleString();
    } catch (error) {
      return null;
    }
  })();

  const isLoading = poolStatsLoading || chipRateLoading;
  const error = poolStatsError?.message || chipRateError?.message || null;

  return {
    poolETH,
    ethPrice,
    chipRate,
    isLoading,
    error
  };
} 