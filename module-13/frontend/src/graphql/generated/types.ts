

export interface Player {
  id: string;
  address: string;
  totalSpins: string;
  totalBet: string;
  totalWon: string;
  totalLost: string;
  netProfit: string;
  roi: string;
  currentChipsBalance: string;
  pendingWinnings: string;
  totalWithdrawn: string;
  winRate: string;
  avgBetSize: string;
  avgWinSize: string;
  biggestWin: string;
  biggestBet: string;
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  favoriteReelCount: number;
  reel3Spins: string;
  reel4Spins: string;
  reel5Spins: string;
  reel6Spins: string;
  reel7Spins: string;
  lossCount: string;
  smallWinCount: string;
  mediumWinCount: string;
  bigWinCount: string;
  megaWinCount: string;
  ultraWinCount: string;
  specialComboCount: string;
  jackpotCount: string;
  firstSpinTimestamp: string;
  lastSpinTimestamp: string;
  totalSessionCount: string;
  totalSessionDuration: string;
  avgSessionDuration: string;
  milestonesAchieved: string[];
  totalChipsPurchased: string;
  totalChipsSwapped: string;
  totalETHSpent: string;
  totalETHReceived: string;
  spins?: Spin[];
  sessions?: GameSession[];
  chipsTransacted?: ChipsTransacted[];
  jackpotWins?: JackpotWin[];
}

export interface Spin {
  id: string;
  requestId: string;
  player: Player;
  reelCount: number;
  reels: number[];
  reelCombination: string;
  betAmount: string;
  payout: string;
  payoutType: number;
  payoutTypeName: string;
  netResult: string;
  isJackpot: boolean;
  vrfCostETH: string;
  houseFeeETH: string;
  prizePoolContribution: string;
  initiatedTimestamp: string;
  completedTimestamp: string;
  responseTime: string;
  displayInitiatedTimestamp?: string;
  displayCompletedTimestamp?: string;
  initiatedTimeAgo?: string;
  completedTimeAgo?: string;
  completedDate?: string;
  settled: boolean;
  transactionHash: string;
}

export interface CasinoMetrics {
  id: string;
  totalSpins: string;
  totalBetsVolume: string;
  totalPayoutsVolume: string;
  totalHouseFees: string;
  totalVRFMarkup: string;
  totalSwapFees: string;
  totalRevenue: string;
  totalVRFCostsPaid: string;
  totalJackpotsPaid: string;
  totalCosts: string;
  grossProfit: string;
  netProfit: string;
  profitMargin: string;
  currentPrizePool: string;
  contractETHBalance: string;
  totalChipsSupply: string;
  uniquePlayers: string;
  activePlayers24h: string;
  currentBaseChipPriceUSD: string;
  currentVRFCostUSD: string;
  currentVRFMarkupBP: string;
  currentHouseEdgeBP: string;
  lastUpdateTimestamp: string;
}

export interface DailySnapshot {
  id: string;
  date: string;
  displayDate?: string;
  formattedDate?: string;
  spinsCount: string;
  betsVolume: string;
  payoutsVolume: string;
  uniquePlayers: string;
  newPlayers: string;
  returningPlayers: string;
  houseFees: string;
  vrfMarkup: string;
  vrfCosts: string;
  jackpotsPaid: string;
  netProfit: string;
  chipsPurchased: string;
  chipsSwapped: string;
  ethIn: string;
  ethOut: string;
  avgWinRate: string;
  avgBetSize: string;
  biggestWin: string;
  biggestWinPlayer: string;
  reel3Spins: string;
  reel4Spins: string;
  reel5Spins: string;
  reel6Spins: string;
  reel7Spins: string;
  endingPrizePool: string;
  endingETHBalance: string;
  endingChipsSupply: string;
}

export interface HourlySnapshot {
  id: string;
  timestamp: string;
  displayTimestamp?: string;
  formattedDate?: string;
  hour: number;
  dayOfWeek: number;
  spinsCount: string;
  betsVolume: string;
  payoutsVolume: string;
  uniquePlayers: string;
  winRate: string;
  avgBetSize: string;
  netProfit: string;
}

export interface JackpotWin {
  id: string;
  player: Player;
  requestId: string;
  amount: string;
  prizePoolBefore: string;
  prizePoolAfter: string;
  timestamp: string;
  transactionHash: string;
}

export interface ChipsTransacted {
  id: string;
  player: Player;
  chipsAmount: string;
  ethValue: string;
  transactionType: 'purchase' | 'withdraw';
  exchangeRate: string;
  ethPriceUSD: string;
  timestamp: string;
  transactionHash: string;
}

export interface ReelStats {
  id: string;
  reelCount: number;
  totalSpins: string;
  totalBets: string;
  totalPayouts: string;
  uniquePlayers: string;
  winRate: string;
  avgBetSize: string;
  avgPayout: string;
  actualHouseEdge: string;
  lossCount: string;
  smallWinCount: string;
  mediumWinCount: string;
  bigWinCount: string;
  megaWinCount: string;
  ultraWinCount: string;
  specialComboCount: string;
  jackpotCount: string;
  lastJackpotTimestamp: string;
  lastJackpotPlayer: string;
  lastJackpotAmount: string;
  mostFrequentWin: string;
  mostFrequentLoss: string;
}

export interface GameSession {
  id: string;
  player: Player;
  sessionId: string;
  startTime: string;
  endTime: string;
  duration: string;
  spinsCount: string;
  totalBet: string;
  totalWon: string;
  netResult: string;
  endReason: string;
  isActive: boolean;
}

export interface SystemState {
  id: string;
  isPaused: boolean;
  owner: string;
  implementation: string;
  payoutTablesAddress: string;
  vrfWrapperAddress: string;
  ethPriceFeedAddress: string;
  lastSpinTimestamp: string;
  lastConfigUpdateTimestamp: string;
  deploymentBlock: string;
  deploymentTimestamp: string;
}

export interface VRFAnalytics {
  id: string;
  totalRequests: string;
  pendingRequests: string;
  fulfilledRequests: string;
  failedRequests: string;
  totalVRFCostETH: string;
  totalMarkupCollected: string;
  avgCostPerRequest: string;
  minCost: string;
  maxCost: string;
  avgResponseTime: string;
  minResponseTime: string;
  maxResponseTime: string;
  currentCallbackGasLimit: string;
  currentRequestConfirmations: string;
  lastRequestTimestamp: string;
  lastFulfillmentTimestamp: string;
}

export interface VRFTransaction {
  id: string;
  requestId: string;
  estimatedCost: string;
  actualCost: string;
  markup: string;
  ethPriceUSD: string;
  timestamp: string;
  transactionHash: string;
}

export interface SystemConfigUpdate {
  id: string;
  parameter: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  transactionHash: string;
}

export interface EmergencyWithdrawal {
  id: string;
  player: Player;
  amount: string;
  reason: string;
  timestamp: string;
  transactionHash: string;
}

export interface PrizePoolChange {
  id: string;
  amount: string;
  reason: string;
  reasonName: string;
  timestamp: string;
  newTotalPrizePool: string;
  transactionHash: string;
}

export interface LeaderboardEntry {
  id: string;
  player: Player;
  category: string;
  period: string;
  rank: number;
  value: string;
  lastUpdated: string;
}