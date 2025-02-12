import React from 'react';
import { useChainId } from 'wagmi';
import { useTokenContract } from '@/hooks/use-token-contract';
import { Button } from '@/components/ui/button';

const OpenSeaLink = () => {
  const chainId = useChainId();
  const tokenContract = useTokenContract();

  const getOpenSeaURL = () => {
    const baseURL = chainId === 1 
      ? 'https://opensea.io' 
      : 'https://testnets.opensea.io';
    
    return `${baseURL}/assets?search[query]=${tokenContract.address}`;
  };

  return (
    <Button 
      asChild
      className="flex items-center"
    >
      <a 
        href={getOpenSeaURL()} 
        target="_blank" 
        rel="noopener noreferrer"
      >
        OpenSea
      </a>
    </Button>
  );
};

export default OpenSeaLink;