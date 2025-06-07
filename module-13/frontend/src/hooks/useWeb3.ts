import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import type { Address } from 'viem'

interface UseWeb3Return {
  // State
  account: Address | undefined;
  chainId: number | undefined;
  balance: string;
  connecting: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Loading states
  balanceLoading: boolean;
  isSwitchPending: boolean;
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId: number) => Promise<void>;
  
  // Utilities
  formatAddress: (address?: string) => string;
  formatBalance: (balance: string, decimals?: number) => string;
  getNetworkName: (chainId?: number) => string;
}

export function useWeb3(): UseWeb3Return {
  // Wagmi hooks
  const { address: account, isConnected, isConnecting, isReconnecting } = useAccount()
  const { data: balanceData, isError: balanceError, isLoading: balanceLoading } = useBalance({
    address: account,
  })
  const chainId = useChainId()
  const { connect, connectors, error: connectError, isPending: isConnectPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, error: switchError, isPending: isSwitchPending } = useSwitchChain()

  // Derived state
  const balance = useMemo(() => {
    if (balanceData) {
      return balanceData.formatted
    }
    return '0'
  }, [balanceData])

  const connecting = isConnecting || isReconnecting || isConnectPending

  const error = useMemo(() => {
    if (connectError) return connectError.message
    if (switchError) return switchError.message
    if (balanceError) return 'Failed to fetch balance'
    return null
  }, [connectError, switchError, balanceError])

  // Connect wallet function
  const connectWallet = useCallback(async (): Promise<void> => {
    try {
      // Try to connect with the first available connector (usually injected/MetaMask)
      const injectedConnector = connectors.find(connector => 
        connector.id === 'injected' || connector.id === 'metaMask'
      )
      
      if (injectedConnector) {
        connect({ connector: injectedConnector })
        toast.success('Wallet connected successfully!')
      } else {
        toast.error('No wallet connector found. Please install MetaMask.')
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      toast.error('Failed to connect wallet')
    }
  }, [connect, connectors])

  // Disconnect wallet function
  const disconnectWallet = useCallback((): void => {
    disconnect()
    toast('Wallet disconnected')
  }, [disconnect])

  // Switch network function
  const switchNetwork = useCallback(async (targetChainId: number): Promise<void> => {
    try {
      await switchChain({ chainId: targetChainId })
      toast.success('Network switched successfully')
    } catch (err: any) {
      console.error('Failed to switch network:', err)
      
      if (err.code === 4902) {
        toast.error('Please add this network to your wallet')
      } else if (err.code === 4001) {
        toast('Network switch cancelled')
      } else {
        toast.error('Failed to switch network')
      }
    }
  }, [switchChain])

  // Helper functions
  const formatAddress = useCallback((address?: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [])

  const formatBalance = useCallback((balance: string, decimals: number = 4): string => {
    return parseFloat(balance).toFixed(decimals)
  }, [])

  const getNetworkName = useCallback((chainId?: number): string => {
    if (!chainId) return 'Unknown'
    
    const networks: Record<number, string> = {
      1: 'Mainnet',
      3: 'Ropsten',
      4: 'Rinkeby',
      5: 'Goerli',
      11155111: 'Sepolia',
      42: 'Kovan',
      137: 'Polygon',
      80001: 'Mumbai',
      31337: 'Hardhat Local'
    }
    return networks[chainId] || `Chain ${chainId}`
  }, [])

  return {
    // State
    account,
    chainId,
    balance,
    connecting,
    error,
    isConnected,
    
    // Loading states
    balanceLoading,
    isSwitchPending,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    
    // Utilities
    formatAddress,
    formatBalance,
    getNetworkName,
  }
} 