import { useState, useEffect } from 'react';
import { CasinoSlotABI, getDeployment } from '../config/contracts';
import { useReadContract } from 'wagmi';
import type { Address } from 'viem';

interface PoolData {
  poolETH: string | null;
  ethPrice: string | null;
  chipRate: string | null;
  isLoading: boolean;
  error: string | null;
}

export function usePoolData(chainId: number | undefined): PoolData {
  const contractAddress = getDeployment('hardhat', 'dev')?.addresses.CASINO_SLOT as Address;

  const { data: poolStats, isLoading: isLoadingPool, error: errorPool } = useReadContract({
    address: contractAddress,
    abi: CasinoSlotABI,
    functionName: 'getPoolStats',
    query: {
      enabled: !!contractAddress && !!chainId,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  const { data: gameStats, isLoading: isLoadingGame, error: errorGame } = useReadContract({
    address: contractAddress,
    abi: CasinoSlotABI,
    functionName: 'getGameStats',
    query: {
      enabled: !!contractAddress && !!chainId,
      refetchInterval: 30000,
    },
  });
  
  const isLoading = isLoadingPool || isLoadingGame;
  const error = errorPool || errorGame;

  if (isLoading || error || !poolStats || !gameStats) {
    return {
      poolETH: null,
      ethPrice: null,
      chipRate: null,
      isLoading: isLoading,
      error: error ? 'Failed to load pool data' : null,
    };
  }

  // Format the data
  const poolETH = (Number((poolStats as any)[0]) / 1e18).toFixed(2);
  const ethPrice = `$${(Number((poolStats as any)[2]) / 100).toFixed(0)}`;
  const chipRate = (Number((poolStats as any)[2]) * 5).toFixed(0); // 5 CHIPS per USD

  return {
    poolETH,
    ethPrice,
    chipRate,
    isLoading: false,
    error: null,
  };
} 