import React from 'react';
import { Button } from '@/components/ui/button';
import { useNFTMetadata } from '@/hooks/use-nft-metadata';
import { Loader2 } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrade: (baseTokenId: bigint) => Promise<void>;
  tradingTokenId: number | null;
  allBalances: Record<string, bigint>; 
}

const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onTrade,
  tradingTokenId,
  allBalances,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  console.log("TradeModal rendered with:", { isOpen, tradingTokenId });
  
  if (!isOpen) return null;

  const baseMaterials = [
    { id: 0, name: "Molten Core Ingot" },
    { id: 1, name: "Refined Obsidian Shard" },
    { id: 2, name: "Raw Etherium Ore" }
  ].filter(material => 
    material.id !== tradingTokenId && 
    !(allBalances[material.id.toString()] > BigInt(0))  // Filter out owned materials
  );

  const handleTrade = async (baseTokenId: number) => {
    console.log("Trade attempt:", { from: tradingTokenId, to: baseTokenId });
    setIsLoading(true);
    try {
      await onTrade(BigInt(baseTokenId));
      onClose();
    } catch (error) {
      console.error('Trade failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Trade Material</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Select which base material you'd like to receive
        </p>

        <div className="space-y-2">
          {baseMaterials.map((material) => (
            <Button
              key={material.id}
              onClick={() => handleTrade(material.id)}
              disabled={isLoading}
              className="w-full flex items-center justify-between"
            >
              <span>Trade for {material.name}</span>
              {isLoading && <Loader2 className="animate-spin -mr-1 ml-3 h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeModal;