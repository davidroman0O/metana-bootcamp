import { useQuery, ApolloError } from '@apollo/client';

// Overview queries - the only ones we need for the simplified dashboard
import { 
  CASINO_DASHBOARD,
  ACTIVITY_FEED,
  SYSTEM_STATE_QUERY,
  DAILY_PERFORMANCE,
  ACTIVE_PLAYERS_24H,
  BLOCKCHAIN_META,
  type CasinoDashboardVariables,
  type ActivityFeedVariables,
  type DailyPerformanceVariables,
  type ActivePlayers24hVariables,
  type ActivePlayers24hResult,
  type BlockchainMetaResult,
} from '../../graphql/queries/overview';

// Utility functions
export const getTimestamp = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return Math.floor(date.getTime() / 1000).toString();
};

export const getCurrentTimestamp = (): string => {
  return Math.floor(Date.now() / 1000).toString();
};

export const formatGraphQLError = (error: ApolloError | undefined): string => {
  if (!error) return 'Unknown error';
  
  if (error.networkError) {
    return 'Network error: Unable to connect to the server';
  }
  
  if (error.graphQLErrors?.length > 0) {
    return error.graphQLErrors[0].message;
  }
  
  return error.message || 'An unexpected error occurred';
};

// Generic hook types
export interface QueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<any>;
}

// Overview Dashboard Hooks
export function useCasinoDashboard(variables?: CasinoDashboardVariables) {
  return useQuery(CASINO_DASHBOARD, {
    variables,
    pollInterval: 60000, // Refresh every minute
  });
}

export function useActivityFeed(variables?: ActivityFeedVariables) {
  const defaultVariables: ActivityFeedVariables = {
    recentSpinsCount: 10,
    bigWinThreshold: '1000000000000000000000', // 1000 CHIPS
    bigWinsCount: 5,
    todayTimestamp: getTimestamp(1),
  };

  return useQuery(ACTIVITY_FEED, {
    variables: { ...defaultVariables, ...variables },
    pollInterval: 30000, // Refresh every 30 seconds
  });
}

export function useSystemState() {
  return useQuery(SYSTEM_STATE_QUERY, {
    pollInterval: 60000,
  });
}

export function useDailyPerformance(variables?: DailyPerformanceVariables) {
  return useQuery(DAILY_PERFORMANCE, {
    variables: {
      // Get all available snapshots by default, let the component decide how many to display
      days: 1000,
      ...variables,
    },
  });
}

export function useActivePlayers24h() {
  // First get the blockchain timestamp
  const { data: metaData } = useQuery<BlockchainMetaResult>(BLOCKCHAIN_META, {
    pollInterval: 60000, // Update every minute
  });
  
  // Calculate 24 hours ago from blockchain time
  const timestamp24hAgo = metaData?._meta?.block?.timestamp 
    ? (metaData._meta.block.timestamp - 24 * 60 * 60).toString()
    : '0';
  
  // Query active players
  const { data, loading, error } = useQuery<ActivePlayers24hResult, ActivePlayers24hVariables>(
    ACTIVE_PLAYERS_24H,
    {
      variables: { timestamp24hAgo },
      skip: !metaData?._meta?.block?.timestamp,
      pollInterval: 60000, // Update every minute
    }
  );
  
  return {
    count: data?.players?.length || 0,
    loading: loading || !metaData,
    error,
  };
}