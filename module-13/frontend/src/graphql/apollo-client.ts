import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { SUPPORTED_CHAINS, getDeployment } from '../config/contracts';

// Get subgraph URL based on chain ID
function getSubgraphUrl(chainId: number | undefined): string {
  if (!chainId) {
    // Default to localhost if no chain ID
    return 'http://localhost:8000/subgraphs/name/casino-slot-subgraph';
  }

  try {
    // Map chain ID to network name
    let networkName: 'hardhat' | 'sepolia' | 'mainnet';
    
    switch (chainId) {
      case SUPPORTED_CHAINS.HARDHAT:
        networkName = 'hardhat';
        break;
      case SUPPORTED_CHAINS.SEPOLIA:
        networkName = 'sepolia';
        break;
      case SUPPORTED_CHAINS.MAINNET:
        networkName = 'mainnet';
        break;
      default:
        console.warn(`Unsupported chain ID: ${chainId}, defaulting to localhost`);
        return 'http://localhost:8000/subgraphs/name/casino-slot-subgraph';
    }

    // Get deployment info for the network
    const deployment = getDeployment(networkName, 'dev');
    
    if (deployment.info.subgraphUrl) {
      return deployment.info.subgraphUrl;
    } else {
      console.warn(`No subgraph URL found for ${networkName}, defaulting to localhost`);
      return 'http://localhost:8000/subgraphs/name/casino-slot-subgraph';
    }
  } catch (error) {
    console.error('Error getting subgraph URL:', error);
    return 'http://localhost:8000/subgraphs/name/casino-slot-subgraph';
  }
}

// Create Apollo Client instance
function createApolloClient(uri: string) {
  const httpLink = createHttpLink({ uri });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      typePolicies: {
        Player: {
          keyFields: ['id'],
        },
        CasinoMetrics: {
          keyFields: ['id'],
        },
        DailySnapshot: {
          keyFields: ['id'],
        },
        Spin: {
          keyFields: ['id'],
        },
        LeaderboardEntry: {
          keyFields: ['id'],
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
    },
  });
}

// Hook to get Apollo Client based on current chain
export function useApolloClient() {
  const chainId = useChainId();
  
  const client = useMemo(() => {
    const uri = getSubgraphUrl(chainId);
    console.log(`Using subgraph URL for chain ${chainId}:`, uri);
    return createApolloClient(uri);
  }, [chainId]);

  return client;
}

// Static client for backward compatibility (defaults to localhost)
export const apolloClient = createApolloClient('http://localhost:8000/subgraphs/name/casino-slot-subgraph');

// Helper function to check if GraphQL endpoint is available
export const checkGraphQLConnection = async (chainId?: number): Promise<boolean> => {
  try {
    const uri = getSubgraphUrl(chainId);
    const response = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query HealthCheck {
            _meta {
              block {
                number
              }
            }
          }
        `,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('GraphQL connection check failed:', error);
    return false;
  }
};