import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';

// Admin addresses from environment variable
const ADMIN_ADDRESSES = process.env.REACT_APP_ADMIN_ADDRESSES?.split(',').map(addr => addr.toLowerCase()) || [
  // Default admin addresses for development
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', // Hardhat account 0
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', // Hardhat account 1
  '0x92145c8e548A87DFd716b1FD037a5e476a1f2a86',
];

export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  const isAdmin = address ? ADMIN_ADDRESSES.includes(address.toLowerCase()) : false;

  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to access the admin dashboard');
      navigate('/');
      return;
    }

    if (!isAdmin && address) {
      toast.error('Access denied: Admin privileges required');
      navigate('/');
    }
  }, [isConnected, isAdmin, address, navigate]);

  return {
    isAdmin,
    isConnected,
    address,
  };
}

// Component wrapper for admin routes
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdminAuth();

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}