import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { SUPPORTED_CHAINS, getDeployment } from '../config/contracts';

// Get subgraph config (URL and API key) based on chain ID
function getSubgraphConfig(chainId: number | undefined): { url: string; apiKey?: string } {
  if (!chainId) {
    // Default to Sepolia if no chain ID (most common use case)
    console.log('No chainId provided, defaulting to Sepolia subgraph');
    try {
      const deployment = getDeployment('sepolia', 'dev');
      return {
        url: deployment.info.subgraphUrl || 'https://api.studio.thegraph.com/query/115919/casino-slot/version/latest',
        apiKey: deployment.info.subgraphApiKey
      };
    } catch {
      return { url: 'https://api.studio.thegraph.com/query/115919/casino-slot/version/latest' };
    }
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
        return { url: 'http://localhost:8000/subgraphs/name/casino-slot-subgraph' };
    }

    // Get deployment info for the network
    const deployment = getDeployment(networkName, 'dev');
    
    if (deployment.info.subgraphUrl) {
      return {
        url: deployment.info.subgraphUrl,
        apiKey: deployment.info.subgraphApiKey
      };
    } else {
      console.warn(`No subgraph URL found for ${networkName}, defaulting to localhost`);
      return { url: 'http://localhost:8000/subgraphs/name/casino-slot-subgraph' };
    }
  } catch (error) {
    console.error('Error getting subgraph config:', error);
    return { url: 'http://localhost:8000/subgraphs/name/casino-slot-subgraph' };
  }
}

// Create Apollo Client instance
function createApolloClient(uri: string, apiKey?: string) {
  const httpLink = createHttpLink({ uri });

  // Create auth link if API key is provided
  const authLink = apiKey
    ? setContext((_, { headers }) => {
        return {
          headers: {
            ...headers,
            authorization: `Bearer ${apiKey}`,
          },
        };
      })
    : null;

  // Use auth link if available, otherwise just http link
  const link = authLink ? authLink.concat(httpLink) : httpLink;

  return new ApolloClient({
    link,
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
    const config = getSubgraphConfig(chainId);
    console.log(`Using subgraph URL for chain ${chainId}:`, config.url);
    if (config.apiKey) {
      console.log('Using API key authentication for The Graph');
    }
    return createApolloClient(config.url, config.apiKey);
  }, [chainId]);

  return client;
}

// Static client for backward compatibility (defaults to localhost)
export const apolloClient = createApolloClient('http://localhost:8000/subgraphs/name/casino-slot-subgraph');

// Helper function to check if GraphQL endpoint is available
export const checkGraphQLConnection = async (chainId?: number): Promise<boolean> => {
  try {
    const config = getSubgraphConfig(chainId);
    
    // Skip localhost checks if we're on Sepolia
    if (chainId === SUPPORTED_CHAINS.SEPOLIA && config.url.includes('localhost')) {
      console.log('Skipping localhost health check for Sepolia network');
      return true;
    }
    
    // Build headers with auth if API key is present
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    
    // For any hosted subgraph (Studio or decentralized), use a simpler health check
    if (config.url.includes('api.studio.thegraph.com') || config.url.includes('gateway.thegraph.com')) {
      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `{ _meta { block { number } } }`,
          }),
        });
        return response.ok;
      } catch (error) {
        // Hosted subgraphs might block CORS, but that's ok - we'll assume it's available
        console.log('Hosted subgraph health check blocked by CORS, assuming available');
        return true;
      }
    }
    
    // For localhost, do the full health check
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
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
    // If it's a hosted URL and we get a network error, assume it's CORS and return true
    if (chainId === SUPPORTED_CHAINS.SEPOLIA) {
      return true;
    }
    return false;
  }
};