import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

export function useWallet() {
  const { address: account, isConnected, isConnecting, isReconnecting } = useAccount();
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address: account,
  });
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const connecting = isConnecting || isReconnecting;
  const balance = balanceData?.formatted || '0';

  const connectWallet = useCallback(() => {
    const injectedConnector = connectors.find(connector => 
      connector.id === 'injected' || connector.id === 'metaMask'
    );
    
    if (injectedConnector) {
      connect({ connector: injectedConnector });
      toast.success('🦊 Wallet connected!');
    } else {
      toast.error('No wallet found. Please install MetaMask.');
    }
  }, [connect, connectors]);

  const disconnectWallet = useCallback(() => {
    try {
      console.log('Disconnecting wallet...');
      
      // First, call the wagmi disconnect function
      disconnect();
      
      // Clear any wagmi-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('wagmi') || key.includes('wallet') || key.includes('connect')) {
          localStorage.removeItem(key);
        }
      });
      
      // Show toast notification
      toast('👋 Wallet disconnected');
      
      // Force reload the page after a short delay to ensure complete state reset
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect]);

  const formatAddress = useCallback((address?: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const formatBalance = useCallback((balance: string, decimals: number = 4): string => {
    return parseFloat(balance).toFixed(decimals);
  }, []);

  return {
    // State
    account,
    isConnected,
    connecting,
    balance,
    balanceLoading,
    
    // Actions
    connectWallet,
    disconnectWallet,
    
    // Utils
    formatAddress,
    formatBalance,
  };
} 