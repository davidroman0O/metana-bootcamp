import React, { useState } from 'react';
import { Wallet, X } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  connecting: boolean;
  children?: React.ReactNode;
}

const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  connecting,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-600 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Wallet className="mr-2" size={20} />
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Connect your wallet to start playing the slot machine
          </p>

          {/* Connect Button */}
          <button
            onClick={onConnect}
            disabled={connecting}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 
                     disabled:cursor-not-allowed text-black font-bold rounded-lg px-6 py-3 
                     transition-all duration-200 hover:scale-105 disabled:hover:scale-100
                     flex items-center justify-center space-x-2"
          >
            {connecting ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet size={20} />
                <span>Connect MetaMask</span>
              </>
            )}
          </button>

          {/* Additional content */}
          {children}

          {/* Info */}
          <div className="text-xs text-gray-500 text-center">
            By connecting, you agree to our terms of service
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletModal; 