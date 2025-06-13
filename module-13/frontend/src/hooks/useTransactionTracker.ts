import { useState, useEffect, useCallback } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import toast from 'react-hot-toast';

export interface BuyChipTransaction {
  id: string;
  hash: `0x${string}`;
  ethAmount: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  account: Address;
  chainId: number;
  retryCount?: number;
}

const STORAGE_KEY = 'casino-slot-buy-transactions';
const MAX_RETRY_COUNT = 3;
const TRANSACTION_TIMEOUT = 300000; // 5 minutes

export function useTransactionTracker(account?: Address, chainId?: number) {
  const [transactions, setTransactions] = useState<BuyChipTransaction[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<BuyChipTransaction | null>(null);

  // Load transactions from localStorage on mount
  useEffect(() => {
    if (!account || !chainId) return;
    
    const savedTransactions = loadTransactionsFromStorage();
    const userTransactions = savedTransactions.filter(
      tx => tx.account === account && tx.chainId === chainId
    );
    
    setTransactions(userTransactions);
    
    // Find current pending transaction
    const pendingTx = userTransactions.find(tx => tx.status === 'pending');
    if (pendingTx) {
      setCurrentTransaction(pendingTx);
    }
  }, [account, chainId]);

  // Watch current transaction if there is one
  const { 
    data: receipt, 
    isLoading: isWaitingForReceipt, 
    isSuccess: receiptSuccess, 
    isError: receiptError,
    error: receiptErrorDetails
  } = useWaitForTransactionReceipt({
    hash: currentTransaction?.hash,
    query: {
      enabled: !!currentTransaction?.hash,
      retry: MAX_RETRY_COUNT,
    }
  });

  // Handle transaction receipt
  useEffect(() => {
    if (!currentTransaction) return;

    if (receiptSuccess && receipt) {
      console.log('✅ Buy CHIPS transaction confirmed!', receipt);
      updateTransactionStatus(currentTransaction.id, 'success');
      // Keep transaction visible for 5 seconds before clearing
      setTimeout(() => {
        setCurrentTransaction(null);
      }, 5000);
    } else if (receiptError) {
      console.error('❌ Buy CHIPS transaction failed:', receiptErrorDetails);
      updateTransactionStatus(currentTransaction.id, 'failed');
      // Don't auto-clear failed transactions - let user decide
    }
  }, [receiptSuccess, receiptError, receipt, receiptErrorDetails, currentTransaction]);

  // Clean up old transactions periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const savedTransactions = loadTransactionsFromStorage();
      const validTransactions = savedTransactions.filter(tx => {
        // Keep successful/failed transactions for 24 hours
        if (tx.status !== 'pending') {
          return (now - tx.timestamp) < 24 * 60 * 60 * 1000;
        }
        // Mark pending transactions as failed after timeout
        if ((now - tx.timestamp) > TRANSACTION_TIMEOUT) {
          tx.status = 'failed';
          return true;
        }
        return true;
      });
      
      if (validTransactions.length !== savedTransactions.length) {
        saveTransactionsToStorage(validTransactions);
      }
    };

    cleanup();
    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadTransactionsFromStorage = (): BuyChipTransaction[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading transactions from storage:', error);
      return [];
    }
  };

  const saveTransactionsToStorage = (transactions: BuyChipTransaction[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transactions to storage:', error);
    }
  };

  const addTransaction = useCallback((hash: `0x${string}`, ethAmount: string) => {
    if (!account || !chainId) return null;

    const transaction: BuyChipTransaction = {
      id: `${hash}-${Date.now()}`,
      hash,
      ethAmount,
      timestamp: Date.now(),
      status: 'pending',
      account,
      chainId,
      retryCount: 0
    };

    // Update local state
    setTransactions(prev => [transaction, ...prev]);
    setCurrentTransaction(transaction);

    // Update storage
    const allTransactions = loadTransactionsFromStorage();
    allTransactions.unshift(transaction);
    saveTransactionsToStorage(allTransactions);

    console.log('📝 Added buy CHIPS transaction to tracker:', transaction);
    return transaction;
  }, [account, chainId]);

  const updateTransactionStatus = useCallback((id: string, status: 'pending' | 'success' | 'failed') => {
    setTransactions(prev => 
      prev.map(tx => 
        tx.id === id ? { ...tx, status } : tx
      )
    );

    // Update storage
    const allTransactions = loadTransactionsFromStorage();
    const updatedTransactions = allTransactions.map(tx => 
      tx.id === id ? { ...tx, status } : tx
    );
    saveTransactionsToStorage(updatedTransactions);

    console.log(`📝 Updated transaction ${id} status to:`, status);
  }, []);

  const retryTransaction = useCallback((id: string) => {
    const transaction = transactions.find(tx => tx.id === id);
    if (transaction && transaction.status === 'failed') {
      updateTransactionStatus(id, 'pending');
      setCurrentTransaction(transaction);
    }
  }, [transactions, updateTransactionStatus]);

  const clearTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
    
    if (currentTransaction?.id === id) {
      setCurrentTransaction(null);
    }

    // Update storage
    const allTransactions = loadTransactionsFromStorage();
    const filteredTransactions = allTransactions.filter(tx => tx.id !== id);
    saveTransactionsToStorage(filteredTransactions);
  }, [currentTransaction]);

  const hasActiveBuyTransaction = !!currentTransaction && currentTransaction.status === 'pending';

  return {
    // State
    transactions,
    currentTransaction,
    hasActiveBuyTransaction,
    isWaitingForReceipt,
    
    // Actions
    addTransaction,
    updateTransactionStatus,
    retryTransaction,
    clearTransaction,
    
    // Transaction data
    currentTransactionEthAmount: currentTransaction?.ethAmount || '0',
    currentTransactionHash: currentTransaction?.hash,
    currentTransactionStatus: currentTransaction?.status || null,
  };
} 