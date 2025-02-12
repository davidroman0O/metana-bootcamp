import { useState, useEffect } from 'react';

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
}

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

// Convert ipfs:// URL to gateway URL
const ipfsToHttp = (ipfsUrl: string): string => {
  if (!ipfsUrl) return '';
  const ipfsHash = ipfsUrl.replace('ipfs://', '');
  return `${IPFS_GATEWAY}${ipfsHash}`;
};

export const useNFTMetadata = (tokenId: number) => {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const baseUrl = 'ipfs://bafybeihx2hcoh5pfuth7jw3winzc7l727zpieftswqibutaepwk6nbqsn4';
        const response = await fetch(ipfsToHttp(`${baseUrl}/${tokenId}`));
        if (!response.ok) throw new Error('Failed to fetch metadata');
        const data = await response.json();
        
        // Convert IPFS image URL to HTTP gateway URL
        const metadata = {
          ...data,
          image: ipfsToHttp(data.image)
        };
        
        setMetadata(metadata);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metadata'));
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenId]);

  return { metadata, loading, error };
};