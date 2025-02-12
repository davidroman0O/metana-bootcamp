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
    console.log('Attempting to mint token:', tokenId.toString());
    setProcessingTokenId(Number(tokenId));
    try {
      await freeMint(tokenId);
      console.log('Minting successful for token:', tokenId.toString());
    } catch (error) {
      console.error('Minting failed:', error);
    } finally {
      setProcessingTokenId(null);
    }
  };

  const handleForge = async (tokenId: bigint) => {
    console.log('Attempting to forge token:', tokenId.toString());
    setProcessingTokenId(Number(tokenId));
    try {
      // Check and handle approval first
      const isApproved = await isApprovedForAll(forgeContract.address);
      console.log('Forge approval status:', isApproved);
      
      if (!isApproved) {
        console.log('Requesting forge approval...');
        setIsApproving(true);
        await setApprovalForAll(forgeContract.address);
        console.log('Forge approval granted');
      }

      await forge(tokenId);
      console.log('Forging successful for token:', tokenId.toString());
    } catch (error) {
      console.error('Forging failed:', error);
    } finally {
      setProcessingTokenId(null);
      setIsApproving(false);
    }
  };

  const handleTrade = async (tokenId: bigint) => {
    console.log("Trade initiated for token:", tokenId.toString());
    try {
      // Check and handle approval first
      const isApproved = await isApprovedForAll(forgeContract.address);
      console.log('Trade approval status:', isApproved);
      
      if (!isApproved) {
        console.log('Requesting trade approval...');
        setIsApproving(true);
        await setApprovalForAll(forgeContract.address);
        console.log('Trade approval granted');
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
    console.log(`Attempting to trade token ${tradingTokenId} for token ${baseTokenId.toString()}`);
    setProcessingTokenId(tradingTokenId);
    try {
      await trade(BigInt(tradingTokenId), baseTokenId);
      console.log('Trade successful');
      setTradeModalOpen(false);
    } catch (error) {
      console.error('Trade failed:', error);
    } finally {
      setProcessingTokenId(null);
      setTradingTokenId(null);
      setIsApproving(false);
    }
  };

  // Convert tokens array to a balance map for easier access
  const balanceMap = tokens.reduce((acc, token) => {
    acc[token.tokenId.toString()] = token.balance;
    return acc;
  }, {} as Record<string, bigint>);

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Base Materials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((tokenId) => (
              <NFTCard
                key={tokenId}
                tokenId={tokenId}
                balance={tokens.find(t => t.tokenId === BigInt(tokenId))?.balance || BigInt(0)}
                onMint={handleFreeMint}
                onTrade={handleTrade}
                disabled={!!txHash || isApproving}
                countdown={countdown}
                isLoading={isLoading && processingTokenId === tokenId}
                allBalances={balanceMap}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Forge Equipment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[3, 4, 5, 6].map((tokenId) => (
              <NFTCard
                key={tokenId}
                tokenId={tokenId}
                balance={tokens.find(t => t.tokenId === BigInt(tokenId))?.balance || BigInt(0)}
                onForge={handleForge}
                disabled={!!txHash || isApproving}
                isLoading={isLoading && processingTokenId === tokenId}
                allBalances={balanceMap}
              />
            ))}
          </div>
        </div>
      </div>

      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => {
          setTradeModalOpen(false);
          setTradingTokenId(null);
        }}
        onTrade={handleTradeConfirm}
        tradingTokenId={tradingTokenId}
        allBalances={balanceMap}
      />
    </>
  );
};

export default ForgeInterface;