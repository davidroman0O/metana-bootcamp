// Query variable types for all our GraphQL queries

export interface DailyPerformanceVariables {
  days?: number;
}

export interface PlayerProfileVariables {
  playerAddress: string;
}

export interface PlayerSpinsVariables {
  playerAddress: string;
  first?: number;
}

export interface SearchPlayersVariables {
  addressContains: string;
}

export interface RevenueAnalyticsVariables {
  days?: number;
}

export interface RecentSpinsVariables {
  first?: number;
}

export interface BigWinsVariables {
  minPayout?: string;
}

export interface VRFTransactionsVariables {
  first?: number;
}

export interface LeaderboardVariables {
  period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
}

export interface WhalePlayersVariables {
  minBet?: string;
  recentTimestamp?: string;
}

export interface TimeRangeVariables {
  startDate?: string;
  endDate?: string;
}

export interface PaginationVariables {
  first?: number;
  skip?: number;
}

// Helper function to get timestamp for relative dates
export const getTimestamp = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return Math.floor(date.getTime() / 1000).toString();
};

// Default values
export const DEFAULT_PAGINATION = {
  first: 20,
  skip: 0,
};

export const DEFAULT_TIME_RANGES = {
  day: getTimestamp(1),
  week: getTimestamp(7),
  month: getTimestamp(30),
  quarter: getTimestamp(90),
};

export const DEFAULT_THRESHOLDS = {
  bigWin: '1000000000000000000000', // 1000 CHIPS
  whaleThreshold: '10000000000000000000000', // 10,000 CHIPS
  minSpinsForStats: '10',
};