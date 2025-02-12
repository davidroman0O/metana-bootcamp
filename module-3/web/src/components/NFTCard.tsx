import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

  // Check if we have materials for forging
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

  const renderButtons = () => {
    console.log("Rendering buttons for token:", tokenId, "owned:", owned, "isBase:", isBase);
    
    if (isLoading) {
      return (
        <Button disabled className="w-full">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Processing...
        </Button>
      );
    }

    if (owned) {
      console.log("Token is owned, showing owned/trade buttons");
      return (
        <div className="flex gap-2">
          <Button disabled variant="outline" className="flex-1">
            Owned
          </Button>
          {tokenId < 3 && (
            <Button 
              onClick={() => {
                console.log("Trade button clicked for token:", tokenId);
                if (onTrade) onTrade(BigInt(tokenId));
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={!!countdown}
            >
              {countdown && countdown > 0 ? `Wait ${countdown}s` : "Trade"}
            </Button>
          )}
        </div>
      );
    }

    if (countdown && countdown > 0) {
      return (
        <Button disabled className="w-full">
          Wait {countdown}s
        </Button>
      );
    }

    if (isBase) {
      return (
        <Button 
          disabled={disabled} 
          onClick={() => onMint?.(BigInt(tokenId))}
          className="w-full"
        >
          Mint Token {tokenId}
        </Button>
      );
    }

    const hasRequiredMaterials = canForge();
    return (
      <Button 
        disabled={disabled || !hasRequiredMaterials}
        onClick={() => onForge?.(BigInt(tokenId))}
        className="w-full"
        title={!hasRequiredMaterials ? "Missing required materials" : undefined}
      >
        {hasRequiredMaterials ? "Forge" : "Missing Materials"}
      </Button>
    );
  };

  if (loading || !metadata) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-red-500">Failed to load NFT metadata</div>
        </CardContent>
      </Card>
    );
  }

  const { name, description, image, attributes } = metadata;
  const rarity = attributes.find(attr => attr.trait_type === 'Rarity')?.value;
  const element = attributes.find(attr => attr.trait_type === 'Element')?.value;
  const forgedFrom = attributes.find(attr => attr.trait_type === 'Forged From')?.value;

  const getBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'bg-gray-500';
      case 'Rare': return 'bg-blue-500';
      case 'Epic': return 'bg-purple-500';
      case 'Legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold">{name}</CardTitle>
          <span className={`px-2 py-1 rounded-full text-xs text-white ${getBadgeColor(rarity || "")}`}>
            {rarity}
          </span>
        </div>
        {element && (
          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs inline-block">
            {element}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-square mb-4 rounded-lg overflow-hidden">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        <CardDescription className="text-sm mb-4">
          {description}
        </CardDescription>
        {forgedFrom && (
          <div className="text-xs text-gray-500 mb-4">
            <span className="font-semibold">Forged From:</span> {forgedFrom}
          </div>
        )}
        {renderButtons()}
      </CardContent>
    </Card>
  );
};

export default NFTCard;