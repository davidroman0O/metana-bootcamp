import { useQuery, ApolloError } from '@apollo/client';

// Overview queries - the only ones we need for the simplified dashboard
import { 
  CASINO_DASHBOARD,
  ACTIVITY_FEED,
  SYSTEM_STATE_QUERY,
  DAILY_PERFORMANCE,
  type CasinoDashboardVariables,
  type ActivityFeedVariables,
  type DailyPerformanceVariables,
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