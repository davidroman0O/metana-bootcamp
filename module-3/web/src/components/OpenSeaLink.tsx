import React from 'react';
import { useChainId } from 'wagmi';
import { useTokenContract } from '@/hooks/use-token-contract';
import { Button } from '@/components/ui/button';

const OpenSeaLink = () => {
  const chainId = useChainId();
  const tokenContract = useTokenContract();

  // Hide button on Anvil network (31337)
  if (chainId === 31337) {
    return null;
  }

  // Only show for Polygon mainnet (137)
  if (chainId !== 137) {
    return null;
  }

  return (
    <Button 
      asChild
      className="flex items-center"
    >
      <a 
        href={`https://opensea.io/collection/dwarf-metana-forge`}
        target="_blank" 
        rel="noopener noreferrer"
      >
        OpenSea
      </a>
    </Button>
  );
}

export default OpenSeaLink;