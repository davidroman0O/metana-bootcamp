import { useChainId, useSwitchChain } from 'wagmi';
import { useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  getAvailableNetworks, 
  getDeployment, 
  SUPPORTED_CHAINS,
  type NetworkName 
} from '../config/contracts';
import { isDevelopment } from '../config/environment';

// Network metadata
const NETWORK_CONFIG = {
  hardhat: {
    name: 'Hardhat Local',
    chainId: SUPPORTED_CHAINS.HARDHAT_LOCAL,
    isDev: true,
    rpcUrl: 'http://127.0.0.1:8545',
    priority: 2,
  },
  sepolia: {
    name: 'Sepolia Testnet', 
    chainId: SUPPORTED_CHAINS.SEPOLIA,
    isDev: false,
    priority: 1,
  },
} as const;

interface NetworkInfo {
  id: NetworkName;
  name: string;
  chainId: number;
  isDev: boolean;
  hasDeployment: boolean;
  isPending?: boolean;
}

export function useNetworks() {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const [pendingNetworkId, setPendingNetworkId] = useState<NetworkName>();

  // Use centralized environment detection from environment.ts
  const isProduction = !isDevelopment;

  // Get available networks
  const availableNetworks = useMemo((): NetworkInfo[] => {
    const contractNetworks = getAvailableNetworks();
    
    return contractNetworks
      .map((networkId): NetworkInfo => {
        const config = NETWORK_CONFIG[networkId];
        let hasDeployment = false;
        
        try {
          getDeployment(networkId, 'dev');
          hasDeployment = true;
        } catch {
          try {
            getDeployment(networkId, 'prod');
            hasDeployment = true;
          } catch {
            // No deployment found
          }
        }
        
        return {
          id: networkId,
          name: config.name,
          chainId: config.chainId,
          isDev: config.isDev,
          hasDeployment,
          isPending: isSwitchPending && pendingNetworkId === networkId,
        };
      })
      .filter(network => {
        if (isProduction && network.isDev) {
          return false;
        }
        return network.hasDeployment;
      })
      .sort((a, b) => NETWORK_CONFIG[a.id].priority - NETWORK_CONFIG[b.id].priority);
  }, [isSwitchPending, pendingNetworkId, isProduction]);

  // Current network info
  const currentNetwork = useMemo((): NetworkInfo | null => {
    if (!chainId) return null;
    
    const networkEntry = Object.entries(NETWORK_CONFIG).find(
      ([_, config]) => config.chainId === chainId
    );
    
    if (!networkEntry) return null;
    
    const [networkId, config] = networkEntry;
    const networkInfo = availableNetworks.find(n => n.id === networkId);
    
    return networkInfo || {
      id: networkId as NetworkName,
      name: config.name,
      chainId: config.chainId,
      isDev: config.isDev,
      hasDeployment: false,
    };
  }, [chainId, availableNetworks]);

  // Check if current network is supported
  const isNetworkSupported = useMemo(() => {
    return currentNetwork?.hasDeployment ?? false;
  }, [currentNetwork]);

  // Switch network function
  const switchToNetwork = useCallback(async (networkId: NetworkName): Promise<void> => {
    const networkConfig = NETWORK_CONFIG[networkId];
    if (!networkConfig) {
      toast.error(`Unknown network: ${networkId}`);
      return;
    }

    if (!switchChain) {
      toast.error('Wallet does not support network switching');
      return;
    }

    setPendingNetworkId(networkId);
    
    try {
      toast.loading(`🔄 Switching to ${networkConfig.name}...`, { id: 'network-switch' });
      
      await switchChain({ chainId: networkConfig.chainId });
      
      toast.success(`✅ Switched to ${networkConfig.name}!`, { id: 'network-switch' });
    } catch (error: any) {
      console.error('Network switch failed:', error);
      
      if (error.code === 4902) {
        if (networkId === 'hardhat') {
          const hardhatConfig = NETWORK_CONFIG.hardhat;
          toast.error(
            '⚠️ Please add Hardhat Local to MetaMask:\n' +
            `RPC URL: ${hardhatConfig.rpcUrl}\n` +
            `Chain ID: ${hardhatConfig.chainId}\n` +
            'Currency: ETH',
            { duration: 8000, id: 'network-switch' }
          );
        } else {
          toast.error('Please add this network to your wallet', { id: 'network-switch' });
        }
      } else if (error.code === 4001) {
        toast('Network switch cancelled', { id: 'network-switch' });
      } else {
        toast.error('Failed to switch network', { id: 'network-switch' });
      }
    } finally {
      setPendingNetworkId(undefined);
    }
  }, [switchChain]);

  // Get contract addresses for current network
  const getContractAddresses = useCallback(() => {
    if (!currentNetwork?.hasDeployment) return null;
    
    try {
      try {
        return getDeployment(currentNetwork.id, 'dev').addresses;
      } catch {
        return getDeployment(currentNetwork.id, 'prod').addresses;
      }
    } catch (error) {
      console.error('Failed to get contract addresses:', error);
      return null;
    }
  }, [currentNetwork]);

  return {
    // State
    currentNetwork,
    availableNetworks,
    isNetworkSupported,
    switchingNetwork: isSwitchPending,
    
    // Actions
    switchToNetwork,
    
    // Utils
    getContractAddresses,
  };
} 