import React, { useState } from 'react';
import NFTCard from './NFTCard';
import TradeModal from './TradeModal';
import { useForgeContract } from '@/hooks/use-forge-contract';
import { useToken } from '@/hooks/use-token';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { usePublicClient } from "wagmi";
import {wagmiConfig} from "@/wagmi.config"

interface Token {
  tokenId: bigint;
  balance: bigint;
}

interface ForgeInterfaceProps {
  tokens: Token[];
  forge: (tokenId: bigint) => Promise<any>;
  trade: (tokenId: bigint, baseTokenId: bigint) => Promise<any>;
  freeMint: (tokenId: bigint) => Promise<any>;
  isLoading: boolean;
  txHash: string | null;
  countdown?: number;
  openModal: boolean;
  from: bigint;
  to: bigint;
  handleForge: (tokenId: bigint) => Promise<void>;
  handleTradeApproval: (tokenId: bigint) => Promise<void>;
  handleTrade: (tokenId: bigint) => Promise<void>;
  handleCancelTrade: () => void;
}

const ForgeInterface: React.FC<ForgeInterfaceProps> = ({
  tokens,
  forge,
  trade,
  freeMint,
  isLoading,
  txHash,
  countdown,
  openModal,
  from,
  to,
  handleForge,
  handleTrade,
  handleTradeApproval,
  handleCancelTrade
}) => {
  const [processingTokenId, setProcessingTokenId] = useState<number | null>(null);
  const [tradingTokenId, setTradingTokenId] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const handleFreeMint = async (tokenId: bigint) => {
    setProcessingTokenId(Number(tokenId));
    try {
      await freeMint(tokenId);
    } catch (error) {
      console.error('Minting failed:', error);
    } finally {
      setProcessingTokenId(null);
    }
  };

  const handleCloseModal = () => {
    handleCancelTrade();
    setTradingTokenId(null);
    setProcessingTokenId(null);
    setIsApproving(false);
  };

  const balanceMap = tokens.reduce((acc, token) => {
    acc[token.tokenId.toString()] = token.balance;
    return acc;
  }, {} as Record<string, bigint>);

  return (
    <>
      <div className="py-8">
        <div className="space-y-8">
          {/* Base Materials Section */}
          <div>
            <h2 className="text-xl font-bold mb-4">Base Materials</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((tokenId) => (
                <NFTCard
                  key={tokenId}
                  tokenId={tokenId}
                  balance={tokens.find(t => t.tokenId === BigInt(tokenId))?.balance || BigInt(0)}
                  onMint={async (tokenId: bigint) => {
                    setIsBusy(true);
                    try {
                      await handleFreeMint(tokenId);
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  onTrade={async (tokenId: bigint) => {
                    setIsBusy(true);
                    try {
                      await handleTradeApproval(tokenId);
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  disabled={!!txHash || isApproving || isBusy}
                  countdown={countdown}
                  isLoading={isLoading && processingTokenId === tokenId}
                  allBalances={balanceMap}
                />
              ))}
            </div>
          </div>

          {/* Forge Equipment Section */}
          <div>
            <h2 className="text-xl font-bold mb-4">Forge Equipment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[3, 4, 5, 6].map((tokenId) => (
                <div key={tokenId} className="flex flex-col">
                  <NFTCard
                    tokenId={tokenId}
                    balance={tokens.find(t => t.tokenId === BigInt(tokenId))?.balance || BigInt(0)}
                    onForge={async (tokenId: bigint) => {
                      setIsBusy(true);
                      try {
                        await handleForge(tokenId);
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    disabled={!!txHash || isApproving || isBusy}
                    isLoading={isLoading && processingTokenId === tokenId}
                    allBalances={balanceMap}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TradeModal
        isOpen={openModal}
        onClose={handleCloseModal}
        disabled={isBusy}
        onTrade={async (baseTokenId: bigint) => {
          setIsBusy(true);
          try {
            await handleTrade(baseTokenId);
          } finally {
            setIsBusy(false);
          }
        }}
        tradingTokenId={from}
        allBalances={balanceMap}
      />
    </>
  );
};

export default ForgeInterface;