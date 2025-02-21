import React, { useState } from 'react';
import NFTCard from './NFTCard';
import TradeModal from './TradeModal';
import { useForgeContract } from '@/hooks/use-forge-contract';
import { useToken } from '@/hooks/use-token';

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
}

const ForgeInterface: React.FC<ForgeInterfaceProps> = ({
  tokens,
  forge,
  trade,
  freeMint,
  isLoading,
  txHash,
  countdown
}) => {
  const [processingTokenId, setProcessingTokenId] = useState<number | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradingTokenId, setTradingTokenId] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const forgeContract = useForgeContract();
  const { setApprovalForAll, isApprovedForAll } = useToken();

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

  const handleForge = async (tokenId: bigint) => {
    setProcessingTokenId(Number(tokenId));
    try {
      const isApproved = await isApprovedForAll(forgeContract.address);
      if (!isApproved) {
        setIsApproving(true);
        await setApprovalForAll(forgeContract.address);
      }
      await forge(tokenId);
    } catch (error) {
      console.error('Forging failed:', error);
    } finally {
      setProcessingTokenId(null);
      setIsApproving(false);
    }
  };

  const handleTrade = async (tokenId: bigint) => {
    console.log('handleTrade called with tokenId:', tokenId); // Debug log
    try {
      const isApproved = await isApprovedForAll(forgeContract.address);
      if (!isApproved) {
        setIsApproving(true);
        await setApprovalForAll(forgeContract.address);
      }
      setTradingTokenId(Number(tokenId));
      setTradeModalOpen(true);
    } catch (error) {
      console.error("Error in handleTrade:", error);
      setIsApproving(false);
    }
  };

  const handleTradeConfirm = async (baseTokenId: bigint) => {
    if (tradingTokenId === null) return;
    setProcessingTokenId(tradingTokenId);
    try {
      await trade(BigInt(tradingTokenId), baseTokenId);
    } catch (error) {
      console.error('Trade failed:', error);
    } finally {
      setProcessingTokenId(null);
      setTradingTokenId(null);
      setIsApproving(false);
      setTradeModalOpen(false); // Make sure modal closes on both success and failure
    }
  };

  const handleCloseModal = () => {
    setTradeModalOpen(false);
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
                  onMint={handleFreeMint}
                  onTrade={handleTrade}
                  disabled={!!txHash || isApproving || isLoading}
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
                <NFTCard
                  key={tokenId}
                  tokenId={tokenId}
                  balance={tokens.find(t => t.tokenId === BigInt(tokenId))?.balance || BigInt(0)}
                  onForge={handleForge}
                  onTrade={handleTrade}
                  disabled={!!txHash || isApproving || isLoading}
                  isLoading={isLoading && processingTokenId === tokenId}
                  allBalances={balanceMap}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <TradeModal
        isOpen={tradeModalOpen}
        onClose={handleCloseModal}
        onTrade={handleTradeConfirm}
        tradingTokenId={tradingTokenId}
        allBalances={balanceMap}
      />
    </>
  );
};

export default ForgeInterface;