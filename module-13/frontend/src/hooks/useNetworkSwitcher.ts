import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { useMemo, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SUPPORTED_CHAINS } from '../config/wagmi';

// Define preferred chain priority
const CHAIN_PRIORITY = [
  SUPPORTED_CHAINS.HARDHAT_LOCAL, // Preferred for development
  SUPPORTED_CHAINS.SEPOLIA,       // Testnet fallback
  SUPPORTED_CHAINS.MAINNET        // Production
];

const CHAIN_NAMES = {
  [SUPPORTED_CHAINS.MAINNET]: 'Ethereum Mainnet',
  [SUPPORTED_CHAINS.HARDHAT_LOCAL]: 'Hardhat Local',
  [SUPPORTED_CHAINS.SEPOLIA]: 'Sepolia Testnet',
} as const;

export function useNetworkSwitcher() {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending, chains: configuredChains } = useSwitchChain();
  const chainId = useChainId();
  
  const [pendingChainId, setPendingChainId] = useState<number>();
  const [autoSwitchAttempted, setAutoSwitchAttempted] = useState(false);

  // Check if current chain is supported
  const isChainSupported = useMemo(() => {
    if (!chainId) return false;
    return (Object.values(SUPPORTED_CHAINS) as number[]).includes(chainId);
  }, [chainId]);

  // Get the best available chain
  const getBestAvailableChain = useCallback(async () => {
    if (!window.ethereum) return null;

    for (const preferredChainId of CHAIN_PRIORITY) {
      try {
        // Try to switch to this chain to test availability
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${preferredChainId.toString(16)}` }],
        });
        return preferredChainId;
      } catch (error: any) {
        // Chain not available, try next
        continue;
      }
    }
    return null;
  }, []);

  // Check if a specific chain is accessible
  const isChainAccessible = useCallback(async (targetChainId: number) => {
    try {
      if (!window.ethereum) return false;
      
      // Try to get latest block to test chain accessibility
      await window.ethereum.request({
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
      });
      return true;
    } catch (error) {
      console.warn(`Chain ${targetChainId} not accessible:`, error);
      return false;
    }
  }, []);

  // Auto-switch to best available chain on connection
  useEffect(() => {
    const attemptAutoSwitch = async () => {
      if (!isConnected || !chainId || autoSwitchAttempted) return;
      
      setAutoSwitchAttempted(true);

      // If current chain is supported and accessible, don't switch
      if (isChainSupported) {
        const accessible = await isChainAccessible(chainId);
        if (accessible) return;
      }

      // Find best available chain
      const bestChain = await getBestAvailableChain();
      if (bestChain && bestChain !== chainId) {
        toast.loading('🔄 Switching to optimal network...', { id: 'auto-switch' });
        
        try {
          switchChain({ chainId: bestChain });
          toast.success(`✅ Switched to ${CHAIN_NAMES[bestChain as keyof typeof CHAIN_NAMES]}`, { id: 'auto-switch' });
        } catch (error) {
          console.error('Auto switch failed:', error);
          toast.error('❌ Please switch network manually', { id: 'auto-switch' });
        }
      }
    };

    // Small delay to let wallet settle
    const timer = setTimeout(attemptAutoSwitch, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, chainId, isChainSupported, autoSwitchAttempted, switchChain, getBestAvailableChain, isChainAccessible]);

  // Manual switch function
  const switchToChain = useCallback(async (targetChainId: number) => {
    if (!switchChain) {
      toast.error('Wallet does not support chain switching');
      return;
    }

    setPendingChainId(targetChainId);
    
    try {
      toast.loading(`🔄 Switching to ${CHAIN_NAMES[targetChainId as keyof typeof CHAIN_NAMES]}...`, { id: 'manual-switch' });
      
      await switchChain({ chainId: targetChainId });
      
      toast.success(`✅ Switched to ${CHAIN_NAMES[targetChainId as keyof typeof CHAIN_NAMES]}!`, { id: 'manual-switch' });
    } catch (error: any) {
      console.error('Manual switch failed:', error);
      
      if (error.code === 4902) {
        // Chain not added to wallet
        if (targetChainId === SUPPORTED_CHAINS.HARDHAT_LOCAL) {
          toast.error(
            '⚠️ Please add Hardhat Local network to MetaMask:\n' +
            'RPC URL: http://127.0.0.1:8545\n' +
            'Chain ID: 31337\n' +
            'Currency: ETH',
            { duration: 8000, id: 'manual-switch' }
          );
        } else {
          toast.error('Please add this network to your wallet', { id: 'manual-switch' });
        }
      } else if (error.code === 4001) {
        toast('Network switch cancelled', { id: 'manual-switch' });
      } else {
        toast.error('Failed to switch network', { id: 'manual-switch' });
      }
    } finally {
      setPendingChainId(undefined);
    }
  }, [switchChain]);

  // Switch to local development network
  const switchToLocal = useCallback(() => {
    switchToChain(SUPPORTED_CHAINS.HARDHAT_LOCAL);
  }, [switchToChain]);

  // Switch to mainnet
  const switchToMainnet = useCallback(() => {
    switchToChain(SUPPORTED_CHAINS.MAINNET);
  }, [switchToChain]);

  // Switch to sepolia
  const switchToSepolia = useCallback(() => {
    switchToChain(SUPPORTED_CHAINS.SEPOLIA);
  }, [switchToChain]);

  // Get available chain options
  const availableChains = useMemo(() => 
    CHAIN_PRIORITY.filter(chainId => 
      configuredChains.some(configChain => configChain.id === chainId)
    ).map(chainId => ({
      id: chainId,
      name: CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES],
      isPending: isPending && pendingChainId === chainId
    })),
    [configuredChains, isPending, pendingChainId]
  );

  // Current chain info
  const currentChain = useMemo(() => {
    if (!chain) return null;
    
    return {
      id: chain.id,
      name: chain.name,
      isSupported: isChainSupported,
      isLocal: chain.id === SUPPORTED_CHAINS.HARDHAT_LOCAL,
      isMainnet: chain.id === SUPPORTED_CHAINS.MAINNET,
      isTestnet: chain.id === SUPPORTED_CHAINS.SEPOLIA
    };
  }, [chain, isChainSupported]);

  return {
    // Current state
    currentChain,
    chainId,
    isConnected,
    isSupported: isChainSupported,
    isPending,
    pendingChainId,
    
    // Available options
    availableChains,
    
    // Actions
    switchToChain,
    switchToLocal,
    switchToMainnet,
    switchToSepolia,
    
    // Utils
    getChainName: (chainId: number) => CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] || `Chain ${chainId}`,
    isChainAccessible,
  };
} 