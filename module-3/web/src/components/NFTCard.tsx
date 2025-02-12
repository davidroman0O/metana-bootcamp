import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNFTMetadata } from '@/hooks/use-nft-metadata';
import { Loader2 } from 'lucide-react';

interface NFTCardProps {
  tokenId: number;
  balance: bigint;
  onMint?: (tokenId: bigint) => void;
  onForge?: (tokenId: bigint) => void;
  onTrade?: (tokenId: bigint) => void;
  disabled?: boolean;
  countdown?: number | undefined;
  isLoading?: boolean;
  allBalances?: Record<string, bigint>;
}

const NFTCard: React.FC<NFTCardProps> = ({
  tokenId,
  balance,
  onMint,
  onForge,
  onTrade,
  disabled,
  countdown,
  isLoading,
  allBalances = {}
}) => {
  const { metadata, loading, error } = useNFTMetadata(tokenId);
  const isBase = tokenId < 3;
  const owned = balance > BigInt(0);

  const canForge = () => {
    if (isBase) return false;
    
    const requirements: Record<number, number[]> = {
        3: [0, 1],    // Blazing Obsidian Blade needs tokens 0 and 1
        4: [1, 2],    // Runestone Bulwark needs tokens 1 and 2
        5: [0, 2],    // Molten Gauntlet needs tokens 0 and 2
        6: [0, 1, 2]  // Crown needs all three base materials
    };

    const requiredMaterials = requirements[tokenId];
    if (!requiredMaterials) return false;

    return requiredMaterials.every(materialId => 
      (allBalances[materialId.toString()] || BigInt(0)) > BigInt(0)
    );
  };

  const renderButton = () => {
    if (isLoading) {
      return (
        <Button disabled variant="secondary" className="w-full">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Processing...
        </Button>
      );
    }

    if (owned) {
      return (
        <div className="flex gap-2">
          <Button disabled variant="secondary" className="w-full">
            Owned
          </Button>
          {isBase && (
            <Button 
              onClick={() => onTrade?.(BigInt(tokenId))}
              variant="secondary"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={disabled || (typeof countdown === 'number' && countdown > 0)}
            >
              Trade
            </Button>
          )}
        </div>
      );
    }

    if (isBase) {
      return (
        <Button 
          disabled={disabled || (typeof countdown === 'number' && countdown > 0)}
          onClick={() => onMint?.(BigInt(tokenId))}
          variant="default"
          className="w-full"
        >
          Mint
        </Button>
      );
    }

    const hasRequiredMaterials = canForge();
    return (
      <Button 
        disabled={disabled || !hasRequiredMaterials}
        onClick={() => onForge?.(BigInt(tokenId))}
        variant="default"
        className="w-full"
      >
        {hasRequiredMaterials ? "Forge" : "Missing Materials"}
      </Button>
    );
  };

  if (loading || !metadata) {
    return (
      <Card className="w-full h-48 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-48 flex items-center justify-center bg-white">
        <div className="text-red-500">Failed to load NFT metadata</div>
      </Card>
    );
  }

  const { name, description, image, attributes } = metadata;
  const rarity = attributes.find(attr => attr.trait_type === 'Rarity')?.value;
  const element = attributes.find(attr => attr.trait_type === 'Element')?.value;
  const forgedFrom = attributes.find(attr => attr.trait_type === 'Forged From')?.value;

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'bg-gray-500 text-white';
      case 'Rare': return 'bg-blue-500 text-white';
      case 'Epic': return 'bg-purple-500 text-white';
      case 'Legendary': return 'bg-amber-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="w-full bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{name}</h3>
              <p className="text-sm text-gray-500">{element}</p>
            </div>
            <span className={`px-2 py-1 rounded-md text-xs ${getRarityStyle(rarity || '')}`}>
              {rarity}
            </span>
          </div>
        </div>

        <div className="relative aspect-square bg-gray-100">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {description}
          </p>
          {forgedFrom && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Requires:</span> {forgedFrom}
            </p>
          )}
          {renderButton()}
        </div>
      </CardContent>
    </Card>
  );
};

export default NFTCard;