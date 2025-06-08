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
    disconnect();
    toast('👋 Wallet disconnected');
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