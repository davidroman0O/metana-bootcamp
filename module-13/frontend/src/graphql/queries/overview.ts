import { gql, TypedDocumentNode } from '@apollo/client';
import type { 
  CasinoMetrics, 
  DailySnapshot, 
  JackpotWin, 
  Spin,
  SystemState 
} from '../generated/types';

// Query Variables
export interface CasinoDashboardVariables {
  dailySnapshotsFirst?: number;
  dailySnapshotsOrderBy?: string;
  dailySnapshotsOrderDirection?: 'asc' | 'desc';
  jackpotWinsFirst?: number;
  jackpotWinsOrderBy?: string;
  jackpotWinsOrderDirection?: 'asc' | 'desc';
}

export interface CasinoDashboardResult {
  casinoMetrics: CasinoMetrics;
  dailySnapshots: DailySnapshot[];
  jackpotWins: JackpotWin[];
}

export const CASINO_DASHBOARD: TypedDocumentNode<CasinoDashboardResult, CasinoDashboardVariables> = gql`
  query CasinoDashboard(
    $dailySnapshotsFirst: Int = 1
    $dailySnapshotsOrderBy: String = "date"
    $dailySnapshotsOrderDirection: String = "desc"
    $jackpotWinsFirst: Int = 5
    $jackpotWinsOrderBy: String = "timestamp"
    $jackpotWinsOrderDirection: String = "desc"
  ) {
    casinoMetrics(id: "global") {
      id
      totalSpins
      totalBetsVolume
      totalPayoutsVolume
      netProfit
      profitMargin
      uniquePlayers
      activePlayers24h
      currentPrizePool
      contractETHBalance
      totalRevenue
      totalCosts
      totalHouseFees
      totalVRFMarkup
      totalChipsSupply
    }
    
    dailySnapshots(
      first: $dailySnapshotsFirst
      orderBy: $dailySnapshotsOrderBy
      orderDirection: $dailySnapshotsOrderDirection
    ) {
      id
      date
      displayDate
      spinsCount
      betsVolume
      payoutsVolume
      uniquePlayers
      netProfit
      biggestWin
      biggestWinPlayer
      houseFees
      vrfMarkup
      avgWinRate
      avgBetSize
    }
    
    jackpotWins(
      first: $jackpotWinsFirst
      orderBy: $jackpotWinsOrderBy
      orderDirection: $jackpotWinsOrderDirection
    ) {
      id
      requestId
      amount
      player {
        id
        address
      }
      timestamp
      prizePoolBefore
      prizePoolAfter
    }
  }
`;

// Spin Details Query
export interface SpinDetailsVariables {
  requestId: string;
}

export interface SpinDetailsResult {
  spin: {
    id: string;
    reelCount: number;
    reelCombination: string;
  } | null;
}

export const SPIN_DETAILS = gql`
  query SpinDetails($requestId: ID!) {
    spin(id: $requestId) {
      id
      reelCount
      reelCombination
    }
  }
`;

// Activity Feed Query
export interface ActivityFeedVariables {
  recentSpinsCount?: number;
  bigWinThreshold?: string;
  bigWinsCount?: number;
  todayTimestamp?: string;
}

export interface ActivityFeedResult {
  recentSpins: Spin[];
  bigWinsToday: Spin[];
}

export const ACTIVITY_FEED: TypedDocumentNode<ActivityFeedResult, ActivityFeedVariables> = gql`
  query ActivityFeed(
    $recentSpinsCount: Int = 10
    $bigWinThreshold: BigInt = "1000000000000000000000"
    $bigWinsCount: Int = 5
    $todayTimestamp: BigInt
    $recentSpinsOrderBy: String = "completedTimestamp"
    $recentSpinsOrderDirection: String = "desc"
    $bigWinsOrderBy: String = "payout"
    $bigWinsOrderDirection: String = "desc"
  ) {
    recentSpins: spins(
      first: $recentSpinsCount
      orderBy: $recentSpinsOrderBy
      orderDirection: $recentSpinsOrderDirection
      where: { settled: true }
    ) {
      id
      player {
        id
        address
      }
      betAmount
      payout
      payoutTypeName
      isJackpot
      completedTimestamp
      displayCompletedTimestamp
      completedTimeAgo
      completedDate
      reelCombination
      reelCount
      netResult
    }
    
    bigWinsToday: spins(
      first: $bigWinsCount
      orderBy: $bigWinsOrderBy
      orderDirection: $bigWinsOrderDirection
      where: { 
        payout_gte: $bigWinThreshold
        settled: true
        completedTimestamp_gte: $todayTimestamp
      }
    ) {
      id
      player {
        id
        address
      }
      payout
      payoutTypeName
      completedTimestamp
      displayCompletedTimestamp
      completedTimeAgo
      completedDate
      betAmount
      netResult
      isJackpot
    }
  }
`;

// System State Query
export interface SystemStateVariables {}

export interface SystemStateResult {
  systemState: SystemState;
}

export const SYSTEM_STATE_QUERY: TypedDocumentNode<SystemStateResult, SystemStateVariables> = gql`
  query SystemState {
    systemState(id: "current") {
      id
      isPaused
      owner
      implementation
      payoutTablesAddress
      vrfWrapperAddress
      ethPriceFeedAddress
      lastSpinTimestamp
      lastConfigUpdateTimestamp
      deploymentBlock
      deploymentTimestamp
    }
  }
`;

// Daily Performance Query
export interface DailyPerformanceVariables {
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface DailyPerformanceResult {
  dailySnapshots: DailySnapshot[];
}

export const DAILY_PERFORMANCE: TypedDocumentNode<DailyPerformanceResult, DailyPerformanceVariables> = gql`
  query DailyPerformance(
    $days: Int = 1000
    $startDate: BigInt
    $endDate: BigInt
    $orderBy: String = "date"
    $orderDirection: String = "asc"
  ) {
    dailySnapshots(
      first: $days
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      date
      displayDate
      formattedDate
      spinsCount
      betsVolume
      payoutsVolume
      uniquePlayers
      newPlayers
      returningPlayers
      houseFees
      vrfMarkup
      vrfCosts
      jackpotsPaid
      netProfit
      chipsPurchased
      chipsSwapped
      ethIn
      ethOut
      avgWinRate
      avgBetSize
      biggestWin
      biggestWinPlayer
      reel3Spins
      reel4Spins
      reel5Spins
      reel6Spins
      reel7Spins
      endingPrizePool
      endingETHBalance
      endingChipsSupply
    }
  }
`;

// Hourly Activity Query
export interface HourlyActivityVariables {
  hours?: number;
  dayOfWeek?: number;
  startTimestamp?: string;
}

export interface HourlyActivityResult {
  hourlySnapshots: import('../generated/types').HourlySnapshot[];
}

export const HOURLY_ACTIVITY: TypedDocumentNode<HourlyActivityResult, HourlyActivityVariables> = gql`
  query HourlyActivity(
    $hours: Int = 24
    $dayOfWeek: Int
    $startTimestamp: BigInt
    $orderBy: String = "timestamp"
    $orderDirection: String = "desc"
  ) {
    hourlySnapshots(
      first: $hours
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: {
        dayOfWeek: $dayOfWeek
        timestamp_gte: $startTimestamp
      }
    ) {
      id
      timestamp
      hour
      dayOfWeek
      spinsCount
      betsVolume
      payoutsVolume
      uniquePlayers
      winRate
      avgBetSize
      netProfit
    }
  }
`;

// Active Players Query
export interface ActivePlayers24hVariables {
  timestamp24hAgo: string;
}

export interface ActivePlayers24hResult {
  players: Array<{ id: string }>;
}

export const ACTIVE_PLAYERS_24H: TypedDocumentNode<ActivePlayers24hResult, ActivePlayers24hVariables> = gql`
  query ActivePlayers24h($timestamp24hAgo: BigInt!) {
    players(where: { lastSpinTimestamp_gte: $timestamp24hAgo }) {
      id
    }
  }
`;

// Meta Query for blockchain timestamp
export interface BlockchainMetaResult {
  _meta: {
    block: {
      number: number;
      timestamp: number;
    };
  };
}

export const BLOCKCHAIN_META = gql`
  query BlockchainMeta {
    _meta {
      block {
        number
        timestamp
      }
    }
  }
`;

// Reel Distribution Query - Simplified to just get spins in last 24h
export interface ReelDistribution24hVariables {
  timestamp24hAgo: string;
}

export interface ReelDistribution24hResult {
  spins: Array<{
    id: string;
    reelCount: number;
  }>;
}

export const REEL_DISTRIBUTION_24H = gql`
  query ReelDistribution24h($timestamp24hAgo: BigInt!) {
    spins(
      where: { 
        settled: true, 
        completedTimestamp_gte: $timestamp24hAgo 
      }
      first: 1000
    ) {
      id
      reelCount
    }
  }
`;