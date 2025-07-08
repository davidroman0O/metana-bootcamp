import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// GraphQL endpoint for local Graph node
const httpLink = createHttpLink({
  uri: 'http://localhost:8000/subgraphs/name/casino-slot-subgraph',
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
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

// Helper function to check if GraphQL endpoint is available
export const checkGraphQLConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:8000/subgraphs/name/casino-slot-subgraph', {
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