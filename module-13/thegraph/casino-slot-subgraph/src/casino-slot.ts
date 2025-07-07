import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import {
  SpinInitiated,
  SpinCompleted,
  VRFTransaction,
  PlayerActivity,
  GameSessionStarted,
  GameSessionEnded,
  JackpotHit,
  PrizePoolStateChanged,
  ChipsTransacted,
  EmergencyWithdrawal,
  SystemConfigUpdated,
  PayoutTablesUpdated,
  ContractInitialized,
  EthWithdrawn,
  Transfer,
  Approval,
  OwnershipTransferred,
  Paused,
  Unpaused,
  Upgraded,
  Initialized
} from "../generated/CasinoSlot/CasinoSlot"

import {
  SpinInitiated as SpinInitiatedEntity,
  SpinCompleted as SpinCompletedEntity,
  VRFTransaction as VRFTransactionEntity,
  PlayerActivity as PlayerActivityEntity,
  ChipsTransacted as ChipsTransactedEntity,
  EmergencyWithdrawal as EmergencyWithdrawalEntity,
  GameSession,
  PrizePoolChange,
  JackpotWin,
  SystemConfigUpdate,
  Transfer as TransferEntity,
  Approval as ApprovalEntity,
  Player,
  Spin,
  CasinoMetrics,
  ReelStats,
  DailySnapshot,
  HourlySnapshot,
  VRFAnalytics,
  SystemState
} from "../generated/schema"

// Helper constants
const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)
const ZERO_BD = BigInt.fromI32(0).toBigDecimal()
const HUNDRED_BD = BigInt.fromI32(100).toBigDecimal()

// Helper functions
function getActiveSessionForPlayer(playerAddress: Bytes): GameSession | null {
  // In a real implementation, we'd query for active sessions
  // For now, we'll return null and sessions will be linked if available
  return null
}

function getDayId(timestamp: BigInt): string {
  let dayTimestamp = timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400))
  return dayTimestamp.toString()
}

function getHourId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.div(BigInt.fromI32(3600)).times(BigInt.fromI32(3600))
  return hourTimestamp.toString()
}

function getDayOfWeek(timestamp: BigInt): i32 {
  // Unix timestamp starts on Thursday (4), so we need to adjust
  let days = timestamp.div(BigInt.fromI32(86400))
  let dayOfWeek = days.plus(BigInt.fromI32(4)).mod(BigInt.fromI32(7))
  return dayOfWeek.toI32()
}

function getHourOfDay(timestamp: BigInt): i32 {
  let secondsInDay = timestamp.mod(BigInt.fromI32(86400))
  let hour = secondsInDay.div(BigInt.fromI32(3600))
  return hour.toI32()
}

function getOrCreatePlayer(address: Bytes): Player {
  let player = Player.load(address.toHex())
  if (player == null) {
    player = new Player(address.toHex())
    player.address = address
    player.totalSpins = ZERO_BI
    player.totalBet = ZERO_BI
    player.totalWon = ZERO_BI
    player.totalLost = ZERO_BI
    player.netProfit = ZERO_BI
    player.roi = ZERO_BD
    player.currentChipsBalance = ZERO_BI
    player.pendingWinnings = ZERO_BI
    player.totalWithdrawn = ZERO_BI
    player.winRate = ZERO_BD
    player.avgBetSize = ZERO_BD
    player.avgWinSize = ZERO_BD
    player.biggestWin = ZERO_BI
    player.biggestBet = ZERO_BI
    player.currentStreak = 0
    player.longestWinStreak = 0
    player.longestLossStreak = 0
    player.favoriteReelCount = 3
    player.reel3Spins = ZERO_BI
    player.reel4Spins = ZERO_BI
    player.reel5Spins = ZERO_BI
    player.reel6Spins = ZERO_BI
    player.reel7Spins = ZERO_BI
    player.lossCount = ZERO_BI
    player.smallWinCount = ZERO_BI
    player.mediumWinCount = ZERO_BI
    player.bigWinCount = ZERO_BI
    player.megaWinCount = ZERO_BI
    player.ultraWinCount = ZERO_BI
    player.specialComboCount = ZERO_BI
    player.jackpotCount = ZERO_BI
    player.firstSpinTimestamp = ZERO_BI
    player.lastSpinTimestamp = ZERO_BI
    player.totalSessionCount = ZERO_BI
    player.totalSessionDuration = ZERO_BI
    player.avgSessionDuration = ZERO_BD
    player.milestonesAchieved = []
    player.totalChipsPurchased = ZERO_BI
    player.totalChipsSwapped = ZERO_BI
    player.totalETHSpent = ZERO_BI
    player.totalETHReceived = ZERO_BI
    player.save()
  }
  return player as Player
}

function getOrCreateCasinoMetrics(): CasinoMetrics {
  let metrics = CasinoMetrics.load("global")
  if (metrics == null) {
    metrics = new CasinoMetrics("global")
    metrics.totalSpins = ZERO_BI
    metrics.totalBetsVolume = ZERO_BI
    metrics.totalPayoutsVolume = ZERO_BI
    metrics.totalHouseFees = ZERO_BI
    metrics.totalVRFMarkup = ZERO_BI
    metrics.totalSwapFees = ZERO_BI
    metrics.totalRevenue = ZERO_BI
    metrics.totalVRFCostsPaid = ZERO_BI
    metrics.totalJackpotsPaid = ZERO_BI
    metrics.totalCosts = ZERO_BI
    metrics.grossProfit = ZERO_BI
    metrics.netProfit = ZERO_BI
    metrics.profitMargin = ZERO_BD
    metrics.currentPrizePool = ZERO_BI
    metrics.contractETHBalance = ZERO_BI
    metrics.totalChipsSupply = ZERO_BI
    metrics.uniquePlayers = ZERO_BI
    metrics.activePlayers24h = ZERO_BI
    metrics.currentBaseChipPriceUSD = BigInt.fromI32(20)
    metrics.currentVRFCostUSD = BigInt.fromI32(600)
    metrics.currentVRFMarkupBP = BigInt.fromI32(1500)
    metrics.currentHouseEdgeBP = BigInt.fromI32(500)
    metrics.lastUpdateTimestamp = ZERO_BI
    metrics.lastUpdateBlock = ZERO_BI
    metrics.save()
  }
  return metrics as CasinoMetrics
}

function getOrCreateReelStats(reelCount: i32): ReelStats {
  let id = reelCount.toString()
  let stats = ReelStats.load(id)
  if (stats == null) {
    stats = new ReelStats(id)
    stats.reelCount = reelCount
    stats.totalSpins = ZERO_BI
    stats.totalBets = ZERO_BI
    stats.totalPayouts = ZERO_BI
    stats.uniquePlayers = ZERO_BI
    stats.winRate = ZERO_BD
    stats.avgBetSize = ZERO_BD
    stats.avgPayout = ZERO_BD
    stats.actualHouseEdge = ZERO_BD
    stats.lossCount = ZERO_BI
    stats.smallWinCount = ZERO_BI
    stats.mediumWinCount = ZERO_BI
    stats.bigWinCount = ZERO_BI
    stats.megaWinCount = ZERO_BI
    stats.ultraWinCount = ZERO_BI
    stats.specialComboCount = ZERO_BI
    stats.jackpotCount = ZERO_BI
    stats.lastJackpotTimestamp = ZERO_BI
    stats.lastJackpotPlayer = null
    stats.lastJackpotAmount = ZERO_BI
    stats.mostFrequentWin = null
    stats.mostFrequentLoss = null
    stats.save()
  }
  return stats as ReelStats
}

function getOrCreateVRFAnalytics(): VRFAnalytics {
  let analytics = VRFAnalytics.load("global")
  if (analytics == null) {
    analytics = new VRFAnalytics("global")
    analytics.totalRequests = ZERO_BI
    analytics.pendingRequests = ZERO_BI
    analytics.fulfilledRequests = ZERO_BI
    analytics.failedRequests = ZERO_BI
    analytics.totalVRFCostETH = ZERO_BI
    analytics.totalMarkupCollected = ZERO_BI
    analytics.avgCostPerRequest = ZERO_BD
    analytics.minCost = ZERO_BI
    analytics.maxCost = ZERO_BI
    analytics.avgResponseTime = ZERO_BI
    analytics.minResponseTime = ZERO_BI
    analytics.maxResponseTime = ZERO_BI
    analytics.currentCallbackGasLimit = BigInt.fromI32(2500000)
    analytics.currentRequestConfirmations = 3
    analytics.lastRequestTimestamp = ZERO_BI
    analytics.lastFulfillmentTimestamp = ZERO_BI
    analytics.save()
  }
  return analytics as VRFAnalytics
}

function getOrCreateDailySnapshot(timestamp: BigInt): DailySnapshot {
  let dayId = getDayId(timestamp)
  let snapshot = DailySnapshot.load(dayId)
  if (snapshot == null) {
    snapshot = new DailySnapshot(dayId)
    snapshot.date = BigInt.fromString(dayId)
    snapshot.spinsCount = ZERO_BI
    snapshot.betsVolume = ZERO_BI
    snapshot.payoutsVolume = ZERO_BI
    snapshot.uniquePlayers = ZERO_BI
    snapshot.newPlayers = ZERO_BI
    snapshot.returningPlayers = ZERO_BI
    snapshot.houseFees = ZERO_BI
    snapshot.vrfMarkup = ZERO_BI
    snapshot.vrfCosts = ZERO_BI
    snapshot.jackpotsPaid = ZERO_BI
    snapshot.netProfit = ZERO_BI
    snapshot.chipsPurchased = ZERO_BI
    snapshot.chipsSwapped = ZERO_BI
    snapshot.ethIn = ZERO_BI
    snapshot.ethOut = ZERO_BI
    snapshot.avgWinRate = ZERO_BD
    snapshot.avgBetSize = ZERO_BD
    snapshot.biggestWin = ZERO_BI
    snapshot.biggestWinPlayer = null
    snapshot.reel3Spins = ZERO_BI
    snapshot.reel4Spins = ZERO_BI
    snapshot.reel5Spins = ZERO_BI
    snapshot.reel6Spins = ZERO_BI
    snapshot.reel7Spins = ZERO_BI
    snapshot.endingPrizePool = ZERO_BI
    snapshot.endingETHBalance = ZERO_BI
    snapshot.endingChipsSupply = ZERO_BI
    snapshot.save()
  }
  return snapshot as DailySnapshot
}

function getOrCreateHourlySnapshot(timestamp: BigInt): HourlySnapshot {
  let hourId = getHourId(timestamp)
  let snapshot = HourlySnapshot.load(hourId)
  if (snapshot == null) {
    snapshot = new HourlySnapshot(hourId)
    snapshot.timestamp = BigInt.fromString(hourId)
    snapshot.hour = getHourOfDay(timestamp)
    snapshot.dayOfWeek = getDayOfWeek(timestamp)
    snapshot.spinsCount = ZERO_BI
    snapshot.betsVolume = ZERO_BI
    snapshot.payoutsVolume = ZERO_BI
    snapshot.uniquePlayers = ZERO_BI
    snapshot.winRate = ZERO_BD
    snapshot.avgBetSize = ZERO_BD
    snapshot.netProfit = ZERO_BI
    snapshot.save()
  }
  return snapshot as HourlySnapshot
}

function getOrCreateSystemState(): SystemState {
  let state = SystemState.load("current")
  if (state == null) {
    state = new SystemState("current")
    state.isPaused = false
    state.owner = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    state.implementation = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    state.payoutTablesAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    state.vrfWrapperAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    state.ethPriceFeedAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    state.lastSpinTimestamp = ZERO_BI
    state.lastConfigUpdateTimestamp = ZERO_BI
    state.deploymentBlock = ZERO_BI
    state.deploymentTimestamp = ZERO_BI
    state.save()
  }
  return state as SystemState
}

// Event Handlers

export function handleSpinInitiated(event: SpinInitiated): void {
  let player = getOrCreatePlayer(event.params.player)
  let spin = new Spin(event.params.requestId.toString())
  
  // Initialize spin entity
  spin.requestId = event.params.requestId
  spin.player = player.id
  spin.reelCount = event.params.reelCount
  spin.reels = []
  spin.reelCombination = ""
  spin.betAmount = event.params.betAmount
  spin.payout = ZERO_BI
  spin.payoutType = 0
  spin.payoutTypeName = "PENDING"
  spin.netResult = ZERO_BI.minus(event.params.betAmount)
  spin.vrfCostETH = event.params.vrfCostETH
  spin.houseFeeETH = event.params.houseFeeETH
  spin.prizePoolContribution = event.params.prizePoolContribution
  spin.initiatedTimestamp = event.params.timestamp
  spin.completedTimestamp = null
  spin.responseTime = null
  spin.settled = false
  spin.isJackpot = false
  spin.initiatedBlockNumber = event.block.number
  spin.completedBlockNumber = null
  spin.initiatedTxHash = event.transaction.hash
  spin.completedTxHash = null
  spin.save()
  
  // Create SpinInitiated event entity
  let spinInitiatedEntity = new SpinInitiatedEntity(event.params.requestId.toString() + "-" + event.transaction.hash.toHex())
  spinInitiatedEntity.requestId = event.params.requestId
  spinInitiatedEntity.player = player.id
  spinInitiatedEntity.reelCount = event.params.reelCount
  spinInitiatedEntity.betAmount = event.params.betAmount
  spinInitiatedEntity.vrfCostETH = event.params.vrfCostETH
  spinInitiatedEntity.houseFeeETH = event.params.houseFeeETH
  spinInitiatedEntity.prizePoolContribution = event.params.prizePoolContribution
  spinInitiatedEntity.timestamp = event.params.timestamp
  spinInitiatedEntity.blockNumber = event.block.number
  spinInitiatedEntity.transactionHash = event.transaction.hash
  spinInitiatedEntity.save()
  
  // Update player stats
  player.totalSpins = player.totalSpins.plus(ONE_BI)
  player.totalBet = player.totalBet.plus(event.params.betAmount)
  player.lastSpinTimestamp = event.params.timestamp
  
  if (player.firstSpinTimestamp.equals(ZERO_BI)) {
    player.firstSpinTimestamp = event.params.timestamp
  }
  
  // Update biggest bet if applicable
  if (event.params.betAmount.gt(player.biggestBet)) {
    player.biggestBet = event.params.betAmount
  }
  
  // Track reel preferences
  if (event.params.reelCount == 3) {
    player.reel3Spins = player.reel3Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 4) {
    player.reel4Spins = player.reel4Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 5) {
    player.reel5Spins = player.reel5Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 6) {
    player.reel6Spins = player.reel6Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 7) {
    player.reel7Spins = player.reel7Spins.plus(ONE_BI)
  }
  
  // Update favorite reel count
  let maxSpins = player.reel3Spins
  let favoriteReel = 3
  
  if (player.reel4Spins.gt(maxSpins)) {
    maxSpins = player.reel4Spins
    favoriteReel = 4
  }
  if (player.reel5Spins.gt(maxSpins)) {
    maxSpins = player.reel5Spins
    favoriteReel = 5
  }
  if (player.reel6Spins.gt(maxSpins)) {
    maxSpins = player.reel6Spins
    favoriteReel = 6
  }
  if (player.reel7Spins.gt(maxSpins)) {
    maxSpins = player.reel7Spins
    favoriteReel = 7
  }
  
  player.favoriteReelCount = favoriteReel
  
  player.save()
  
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.totalSpins = metrics.totalSpins.plus(ONE_BI)
  metrics.totalBetsVolume = metrics.totalBetsVolume.plus(event.params.betAmount)
  metrics.lastUpdateTimestamp = event.params.timestamp
  metrics.lastUpdateBlock = event.block.number
  
  // Track revenue from house fees
  metrics.totalHouseFees = metrics.totalHouseFees.plus(event.params.houseFeeETH)
  metrics.totalRevenue = metrics.totalRevenue.plus(event.params.houseFeeETH)
  
  // Track VRF costs (will get markup in VRFTransaction event)
  metrics.totalVRFCostsPaid = metrics.totalVRFCostsPaid.plus(event.params.vrfCostETH)
  metrics.totalCosts = metrics.totalCosts.plus(event.params.vrfCostETH)
  
  // Update prize pool contribution
  metrics.currentPrizePool = metrics.currentPrizePool.plus(event.params.prizePoolContribution)
  
  // Check if this is a new player
  if (player.totalSpins.equals(ONE_BI)) {
    metrics.uniquePlayers = metrics.uniquePlayers.plus(ONE_BI)
  }
  
  // Update profitability metrics
  metrics.grossProfit = metrics.totalRevenue.minus(metrics.totalCosts)
  metrics.netProfit = metrics.grossProfit
  if (metrics.totalRevenue.gt(ZERO_BI)) {
    metrics.profitMargin = metrics.netProfit.toBigDecimal().times(HUNDRED_BD).div(metrics.totalRevenue.toBigDecimal())
  }
  
  metrics.save()
  
  // Update reel stats
  let reelStats = getOrCreateReelStats(event.params.reelCount)
  reelStats.totalSpins = reelStats.totalSpins.plus(ONE_BI)
  reelStats.totalBets = reelStats.totalBets.plus(event.params.betAmount)
  
  // Track unique players for this reel count
  // In a real implementation, we'd maintain a separate mapping
  // For now, we'll increment on first spin for this reel
  
  // Update average bet size
  if (reelStats.totalSpins.gt(ZERO_BI)) {
    reelStats.avgBetSize = reelStats.totalBets.toBigDecimal().div(reelStats.totalSpins.toBigDecimal())
  }
  
  reelStats.save()
  
  // Update VRF analytics
  let vrfAnalytics = getOrCreateVRFAnalytics()
  vrfAnalytics.totalRequests = vrfAnalytics.totalRequests.plus(ONE_BI)
  vrfAnalytics.pendingRequests = vrfAnalytics.pendingRequests.plus(ONE_BI)
  vrfAnalytics.lastRequestTimestamp = event.params.timestamp
  vrfAnalytics.save()
  
  // Update daily snapshot
  let dailySnapshot = getOrCreateDailySnapshot(event.params.timestamp)
  dailySnapshot.spinsCount = dailySnapshot.spinsCount.plus(ONE_BI)
  dailySnapshot.betsVolume = dailySnapshot.betsVolume.plus(event.params.betAmount)
  dailySnapshot.houseFees = dailySnapshot.houseFees.plus(event.params.houseFeeETH)
  dailySnapshot.vrfCosts = dailySnapshot.vrfCosts.plus(event.params.vrfCostETH)
  
  // Track reel distribution
  if (event.params.reelCount == 3) {
    dailySnapshot.reel3Spins = dailySnapshot.reel3Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 4) {
    dailySnapshot.reel4Spins = dailySnapshot.reel4Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 5) {
    dailySnapshot.reel5Spins = dailySnapshot.reel5Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 6) {
    dailySnapshot.reel6Spins = dailySnapshot.reel6Spins.plus(ONE_BI)
  } else if (event.params.reelCount == 7) {
    dailySnapshot.reel7Spins = dailySnapshot.reel7Spins.plus(ONE_BI)
  }
  
  // Check if new player today
  if (player.firstSpinTimestamp.equals(event.params.timestamp)) {
    dailySnapshot.newPlayers = dailySnapshot.newPlayers.plus(ONE_BI)
  }
  
  // Update ending state from metrics
  dailySnapshot.endingPrizePool = metrics.currentPrizePool
  dailySnapshot.endingETHBalance = metrics.contractETHBalance
  dailySnapshot.endingChipsSupply = metrics.totalChipsSupply
  
  // Calculate average bet size
  if (dailySnapshot.spinsCount.gt(ZERO_BI)) {
    dailySnapshot.avgBetSize = dailySnapshot.betsVolume.toBigDecimal().div(dailySnapshot.spinsCount.toBigDecimal())
  }
  
  dailySnapshot.save()
  
  // Update hourly snapshot
  let hourlySnapshot = getOrCreateHourlySnapshot(event.params.timestamp)
  hourlySnapshot.spinsCount = hourlySnapshot.spinsCount.plus(ONE_BI)
  hourlySnapshot.betsVolume = hourlySnapshot.betsVolume.plus(event.params.betAmount)
  
  // Calculate average bet size
  if (hourlySnapshot.spinsCount.gt(ZERO_BI)) {
    hourlySnapshot.avgBetSize = hourlySnapshot.betsVolume.toBigDecimal().div(hourlySnapshot.spinsCount.toBigDecimal())
  }
  
  hourlySnapshot.save()
  
  // Update system state
  let systemState = getOrCreateSystemState()
  systemState.lastSpinTimestamp = event.params.timestamp
  systemState.save()
}

export function handleSpinCompleted(event: SpinCompleted): void {
  let spin = Spin.load(event.params.requestId.toString())
  if (spin == null) {
    log.error("Spin not found for requestId: {}", [event.params.requestId.toString()])
    return
  }
  
  let player = getOrCreatePlayer(event.params.player)
  
  // Update spin entity
  let reels: i32[] = []
  for (let i = 0; i < event.params.reels.length; i++) {
    reels.push(event.params.reels[i].toI32())
  }
  spin.reels = reels
  
  // Create reel combination string
  let reelStrings: string[] = []
  for (let i = 0; i < reels.length; i++) {
    reelStrings.push(reels[i].toString())
  }
  spin.reelCombination = reelStrings.join("-")
  
  spin.payout = event.params.payout
  spin.payoutType = event.params.payoutType
  spin.payoutTypeName = getPayoutTypeName(event.params.payoutType)
  spin.netResult = event.params.payout.minus(spin.betAmount)
  spin.completedTimestamp = event.block.timestamp
  spin.responseTime = event.block.timestamp.minus(spin.initiatedTimestamp)
  spin.settled = true
  spin.isJackpot = event.params.isJackpot
  spin.completedBlockNumber = event.block.number
  spin.completedTxHash = event.transaction.hash
  spin.save()
  
  // Create SpinCompleted event entity
  let spinCompletedEntity = new SpinCompletedEntity(event.params.requestId.toString() + "-" + event.transaction.hash.toHex())
  spinCompletedEntity.requestId = event.params.requestId
  spinCompletedEntity.player = player.id
  spinCompletedEntity.reelCount = event.params.reelCount
  spinCompletedEntity.reels = reels
  spinCompletedEntity.reelCombination = reelStrings.join("-")
  spinCompletedEntity.payoutType = event.params.payoutType
  spinCompletedEntity.payoutTypeName = getPayoutTypeName(event.params.payoutType)
  spinCompletedEntity.payout = event.params.payout
  spinCompletedEntity.isJackpot = event.params.isJackpot
  spinCompletedEntity.timestamp = event.block.timestamp
  spinCompletedEntity.blockNumber = event.block.number
  spinCompletedEntity.transactionHash = event.transaction.hash
  spinCompletedEntity.save()
  
  // Update player stats
  if (event.params.payout.gt(ZERO_BI)) {
    player.totalWon = player.totalWon.plus(event.params.payout)
    player.pendingWinnings = player.pendingWinnings.plus(event.params.payout)
    
    // Update biggest win if applicable
    if (event.params.payout.gt(player.biggestWin)) {
      player.biggestWin = event.params.payout
    }
  } else {
    // Track losses
    player.totalLost = player.totalLost.plus(spin.betAmount)
  }
  
  // Update win/loss distribution based on payout type
  if (event.params.payoutType == 0) {
    player.lossCount = player.lossCount.plus(ONE_BI)
  } else if (event.params.payoutType == 1) {
    player.smallWinCount = player.smallWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 2) {
    player.mediumWinCount = player.mediumWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 3) {
    player.bigWinCount = player.bigWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 4) {
    player.megaWinCount = player.megaWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 5) {
    player.ultraWinCount = player.ultraWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 6) {
    player.specialComboCount = player.specialComboCount.plus(ONE_BI)
  } else if (event.params.payoutType == 7) {
    player.jackpotCount = player.jackpotCount.plus(ONE_BI)
  }
  
  // Update streak tracking
  if (event.params.payoutType == 0) {
    // Loss - negative streak
    if (player.currentStreak > 0) {
      // Was on a win streak, now starting a loss streak
      player.currentStreak = -1
    } else {
      // Continue loss streak
      player.currentStreak = player.currentStreak - 1
    }
    
    // Update longest loss streak if current is longer
    let absStreak = -player.currentStreak
    if (absStreak > player.longestLossStreak) {
      player.longestLossStreak = absStreak
    }
  } else {
    // Win - positive streak
    if (player.currentStreak < 0) {
      // Was on a loss streak, now starting a win streak
      player.currentStreak = 1
    } else {
      // Continue win streak
      player.currentStreak = player.currentStreak + 1
    }
    
    // Update longest win streak if current is longer
    if (player.currentStreak > player.longestWinStreak) {
      player.longestWinStreak = player.currentStreak
    }
  }
  
  // Update net profit
  player.netProfit = player.totalWon.minus(player.totalBet)
  
  // Calculate win rate (wins / totalSpins * 100)
  let winCount = player.totalSpins.minus(player.lossCount)
  if (player.totalSpins.gt(ZERO_BI)) {
    player.winRate = winCount.toBigDecimal().times(HUNDRED_BD).div(player.totalSpins.toBigDecimal())
  }
  
  // Calculate average bet size
  if (player.totalSpins.gt(ZERO_BI)) {
    player.avgBetSize = player.totalBet.toBigDecimal().div(player.totalSpins.toBigDecimal())
  }
  
  // Calculate average win size
  if (winCount.gt(ZERO_BI)) {
    player.avgWinSize = player.totalWon.toBigDecimal().div(winCount.toBigDecimal())
  }
  
  // Calculate ROI ((totalWon - totalBet) / totalBet * 100)
  if (player.totalBet.gt(ZERO_BI)) {
    player.roi = player.netProfit.toBigDecimal().times(HUNDRED_BD).div(player.totalBet.toBigDecimal())
  }
  
  player.save()
  
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.totalPayoutsVolume = metrics.totalPayoutsVolume.plus(event.params.payout)
  metrics.save()
  
  // Update reel stats
  let reelStats = getOrCreateReelStats(event.params.reelCount)
  reelStats.totalPayouts = reelStats.totalPayouts.plus(event.params.payout)
  
  // Update win/loss distribution
  if (event.params.payoutType == 0) {
    reelStats.lossCount = reelStats.lossCount.plus(ONE_BI)
  } else if (event.params.payoutType == 1) {
    reelStats.smallWinCount = reelStats.smallWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 2) {
    reelStats.mediumWinCount = reelStats.mediumWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 3) {
    reelStats.bigWinCount = reelStats.bigWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 4) {
    reelStats.megaWinCount = reelStats.megaWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 5) {
    reelStats.ultraWinCount = reelStats.ultraWinCount.plus(ONE_BI)
  } else if (event.params.payoutType == 6) {
    reelStats.specialComboCount = reelStats.specialComboCount.plus(ONE_BI)
  } else if (event.params.payoutType == 7) {
    reelStats.jackpotCount = reelStats.jackpotCount.plus(ONE_BI)
    reelStats.lastJackpotTimestamp = event.block.timestamp
    reelStats.lastJackpotPlayer = event.params.player
    reelStats.lastJackpotAmount = event.params.payout
  }
  
  // Calculate win rate
  let reelWinCount = reelStats.totalSpins.minus(reelStats.lossCount)
  if (reelStats.totalSpins.gt(ZERO_BI)) {
    reelStats.winRate = reelWinCount.toBigDecimal().times(HUNDRED_BD).div(reelStats.totalSpins.toBigDecimal())
  }
  
  // Calculate average payout
  if (reelWinCount.gt(ZERO_BI)) {
    reelStats.avgPayout = reelStats.totalPayouts.toBigDecimal().div(reelWinCount.toBigDecimal())
  }
  
  // Calculate actual house edge
  if (reelStats.totalBets.gt(ZERO_BI)) {
    let houseProfit = reelStats.totalBets.minus(reelStats.totalPayouts)
    reelStats.actualHouseEdge = houseProfit.toBigDecimal().times(HUNDRED_BD).div(reelStats.totalBets.toBigDecimal())
  }
  
  // Track most frequent combinations (simplified - in production would use a map)
  if (event.params.payoutType > 0) {
    reelStats.mostFrequentWin = spin.reelCombination
  } else {
    reelStats.mostFrequentLoss = spin.reelCombination
  }
  
  reelStats.save()
  
  // Update VRF analytics for fulfillment
  let vrfAnalytics = getOrCreateVRFAnalytics()
  vrfAnalytics.pendingRequests = vrfAnalytics.pendingRequests.minus(ONE_BI)
  vrfAnalytics.fulfilledRequests = vrfAnalytics.fulfilledRequests.plus(ONE_BI)
  vrfAnalytics.lastFulfillmentTimestamp = event.block.timestamp
  
  // Calculate response time
  if (spin.initiatedTimestamp.gt(ZERO_BI) && spin.responseTime !== null) {
    let responseTime = spin.responseTime as BigInt
    
    // Update min response time
    if (vrfAnalytics.minResponseTime.equals(ZERO_BI) || responseTime.lt(vrfAnalytics.minResponseTime)) {
      vrfAnalytics.minResponseTime = responseTime
    }
    
    // Update max response time
    if (responseTime.gt(vrfAnalytics.maxResponseTime)) {
      vrfAnalytics.maxResponseTime = responseTime
    }
    
    // Calculate average response time
    if (vrfAnalytics.fulfilledRequests.gt(ZERO_BI)) {
      let totalResponseTime = vrfAnalytics.avgResponseTime.times(vrfAnalytics.fulfilledRequests.minus(ONE_BI)).plus(responseTime)
      vrfAnalytics.avgResponseTime = totalResponseTime.div(vrfAnalytics.fulfilledRequests)
    }
  }
  
  vrfAnalytics.save()
  
  // Update daily snapshot
  let dailySnapshot = getOrCreateDailySnapshot(event.block.timestamp)
  dailySnapshot.payoutsVolume = dailySnapshot.payoutsVolume.plus(event.params.payout)
  
  // Update biggest win if applicable
  if (event.params.payout.gt(dailySnapshot.biggestWin)) {
    dailySnapshot.biggestWin = event.params.payout
    dailySnapshot.biggestWinPlayer = event.params.player
  }
  
  // Calculate net profit for the day
  dailySnapshot.netProfit = dailySnapshot.houseFees.plus(dailySnapshot.vrfMarkup).minus(dailySnapshot.vrfCosts).minus(dailySnapshot.jackpotsPaid)
  
  // Calculate win rate
  let totalSpins = dailySnapshot.spinsCount
  let wins = dailySnapshot.spinsCount.minus(dailySnapshot.payoutsVolume.equals(ZERO_BI) ? ZERO_BI : ONE_BI) // Simplified
  if (totalSpins.gt(ZERO_BI)) {
    dailySnapshot.avgWinRate = wins.toBigDecimal().times(HUNDRED_BD).div(totalSpins.toBigDecimal())
  }
  
  dailySnapshot.save()
  
  // Update hourly snapshot
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block.timestamp)
  hourlySnapshot.payoutsVolume = hourlySnapshot.payoutsVolume.plus(event.params.payout)
  
  // Calculate net profit
  hourlySnapshot.netProfit = hourlySnapshot.betsVolume.minus(hourlySnapshot.payoutsVolume)
  
  // Calculate win rate
  if (hourlySnapshot.spinsCount.gt(ZERO_BI)) {
    let hourlyWins = event.params.payout.gt(ZERO_BI) ? ONE_BI : ZERO_BI
    // This is simplified - in production, you'd track wins separately
    hourlySnapshot.winRate = ZERO_BD // Placeholder
  }
  
  hourlySnapshot.save()
}

export function handleChipsTransacted(event: ChipsTransacted): void {
  let player = getOrCreatePlayer(event.params.player)
  
  // Create ChipsTransacted entity
  let transaction = new ChipsTransactedEntity(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  transaction.player = player.id
  transaction.transactionType = event.params.transactionType
  transaction.chipsAmount = event.params.chipsAmount
  transaction.ethValue = event.params.ethValue
  transaction.exchangeRate = event.params.exchangeRate
  transaction.ethPriceUSD = event.params.ethPriceUSD
  transaction.timestamp = event.block.timestamp
  transaction.blockNumber = event.block.number
  transaction.transactionHash = event.transaction.hash
  transaction.save()
  
  // Update player stats based on transaction type
  if (event.params.transactionType == "purchase") {
    player.totalChipsPurchased = player.totalChipsPurchased.plus(event.params.chipsAmount)
    player.totalETHSpent = player.totalETHSpent.plus(event.params.ethValue)
    player.currentChipsBalance = player.currentChipsBalance.plus(event.params.chipsAmount)
  } else if (event.params.transactionType == "withdraw") {
    player.totalETHReceived = player.totalETHReceived.plus(event.params.ethValue)
    player.currentChipsBalance = player.currentChipsBalance.minus(event.params.chipsAmount)
  }
  
  player.save()
  
  // Update casino metrics for swap transactions
  let metrics = getOrCreateCasinoMetrics()
  
  if (event.params.transactionType == "purchase") {
    // Track ETH coming in
    metrics.contractETHBalance = metrics.contractETHBalance.plus(event.params.ethValue)
    metrics.totalChipsSupply = metrics.totalChipsSupply.plus(event.params.chipsAmount)
  } else if (event.params.transactionType == "withdraw" || event.params.transactionType == "swap") {
    // Track ETH going out
    metrics.contractETHBalance = metrics.contractETHBalance.minus(event.params.ethValue)
    metrics.totalChipsSupply = metrics.totalChipsSupply.minus(event.params.chipsAmount)
    
    // Calculate swap fee (if any) - this would be the difference between expected and actual
    // For now, we'll assume a small fee is built into the exchange rate
    // In a real implementation, you'd calculate this based on the contract's fee structure
  }
  
  metrics.save()
  
  // Update daily snapshot
  let dailySnapshot = getOrCreateDailySnapshot(event.block.timestamp)
  
  if (event.params.transactionType == "purchase") {
    dailySnapshot.chipsPurchased = dailySnapshot.chipsPurchased.plus(event.params.chipsAmount)
    dailySnapshot.ethIn = dailySnapshot.ethIn.plus(event.params.ethValue)
  } else if (event.params.transactionType == "withdraw" || event.params.transactionType == "swap") {
    dailySnapshot.chipsSwapped = dailySnapshot.chipsSwapped.plus(event.params.chipsAmount)
    dailySnapshot.ethOut = dailySnapshot.ethOut.plus(event.params.ethValue)
  }
  
  dailySnapshot.save()
}

export function handleTransfer(event: Transfer): void {
  let transfer = new TransferEntity(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.timestamp = event.block.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash
  transfer.save()
  
  // Update balances
  let zeroAddressHex = "0x0000000000000000000000000000000000000000"
  
  if (event.params.from.toHex() != zeroAddressHex) {
    let fromPlayer = getOrCreatePlayer(event.params.from)
    fromPlayer.currentChipsBalance = fromPlayer.currentChipsBalance.minus(event.params.value)
    fromPlayer.save()
  }
  
  if (event.params.to.toHex() != zeroAddressHex) {
    let toPlayer = getOrCreatePlayer(event.params.to)
    toPlayer.currentChipsBalance = toPlayer.currentChipsBalance.plus(event.params.value)
    toPlayer.save()
  }
}

// New event handlers for updated contract events
export function handleVRFTransaction(event: VRFTransaction): void {
  let vrfEntity = new VRFTransactionEntity(event.params.requestId.toString() + "-" + event.transaction.hash.toHex())
  vrfEntity.requestId = event.params.requestId
  vrfEntity.estimatedCost = event.params.estimatedCost
  vrfEntity.actualCost = event.params.actualCost
  vrfEntity.markup = event.params.markup
  vrfEntity.ethPriceUSD = event.params.ethPriceUSD
  vrfEntity.timestamp = event.block.timestamp
  vrfEntity.blockNumber = event.block.number
  vrfEntity.transactionHash = event.transaction.hash
  vrfEntity.save()
  
  // Update casino metrics with VRF markup revenue
  let metrics = getOrCreateCasinoMetrics()
  metrics.totalVRFMarkup = metrics.totalVRFMarkup.plus(event.params.markup)
  metrics.totalRevenue = metrics.totalRevenue.plus(event.params.markup)
  
  // Update profitability metrics
  metrics.grossProfit = metrics.totalRevenue.minus(metrics.totalCosts)
  metrics.netProfit = metrics.grossProfit
  if (metrics.totalRevenue.gt(ZERO_BI)) {
    metrics.profitMargin = metrics.netProfit.toBigDecimal().times(HUNDRED_BD).div(metrics.totalRevenue.toBigDecimal())
  }
  
  metrics.save()
  
  // Update VRF analytics with cost data
  let vrfAnalytics = getOrCreateVRFAnalytics()
  vrfAnalytics.totalVRFCostETH = vrfAnalytics.totalVRFCostETH.plus(event.params.actualCost)
  vrfAnalytics.totalMarkupCollected = vrfAnalytics.totalMarkupCollected.plus(event.params.markup)
  
  // Update min/max costs
  if (vrfAnalytics.minCost.equals(ZERO_BI) || event.params.actualCost.lt(vrfAnalytics.minCost)) {
    vrfAnalytics.minCost = event.params.actualCost
  }
  if (event.params.actualCost.gt(vrfAnalytics.maxCost)) {
    vrfAnalytics.maxCost = event.params.actualCost
  }
  
  // Calculate average cost per request
  if (vrfAnalytics.fulfilledRequests.gt(ZERO_BI)) {
    vrfAnalytics.avgCostPerRequest = vrfAnalytics.totalVRFCostETH.toBigDecimal().div(vrfAnalytics.fulfilledRequests.toBigDecimal())
  }
  
  vrfAnalytics.save()
  
  // Update daily snapshot with VRF markup
  let dailySnapshot = getOrCreateDailySnapshot(event.block.timestamp)
  dailySnapshot.vrfMarkup = dailySnapshot.vrfMarkup.plus(event.params.markup)
  dailySnapshot.save()
}

export function handlePlayerActivity(event: PlayerActivity): void {
  let player = getOrCreatePlayer(event.params.player)
  
  let activityEntity = new PlayerActivityEntity(event.params.player.toHex() + "-" + event.params.milestone + "-" + event.transaction.hash.toHex())
  activityEntity.player = player.id
  activityEntity.totalSpins = event.params.totalSpins
  activityEntity.totalBet = event.params.totalBet
  activityEntity.totalWon = event.params.totalWon
  activityEntity.sessionSpins = event.params.sessionSpins
  activityEntity.sessionBet = event.params.sessionBet
  activityEntity.sessionWon = event.params.sessionWon
  activityEntity.milestone = event.params.milestone
  activityEntity.timestamp = event.block.timestamp
  activityEntity.blockNumber = event.block.number
  activityEntity.transactionHash = event.transaction.hash
  activityEntity.save()
  
  // Update player milestone tracking
  let milestones = player.milestonesAchieved
  milestones.push(event.params.milestone)
  player.milestonesAchieved = milestones
  player.save()
}

export function handleEmergencyWithdrawal(event: EmergencyWithdrawal): void {
  let player = getOrCreatePlayer(event.params.player)
  
  let emergencyEntity = new EmergencyWithdrawalEntity(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  emergencyEntity.player = player.id
  emergencyEntity.amount = event.params.amount
  emergencyEntity.reason = event.params.reason
  emergencyEntity.timestamp = event.block.timestamp
  emergencyEntity.blockNumber = event.block.number
  emergencyEntity.transactionHash = event.transaction.hash
  emergencyEntity.save()
}

export function handleSystemConfigUpdated(event: SystemConfigUpdated): void {
  let configEntity = new SystemConfigUpdate(event.params.parameter + "-" + event.block.number.toString())
  configEntity.parameter = event.params.parameter
  configEntity.oldValue = event.params.oldValue
  configEntity.newValue = event.params.newValue
  configEntity.timestamp = event.block.timestamp
  configEntity.blockNumber = event.block.number
  configEntity.transactionHash = event.transaction.hash
  configEntity.save()
}

// Game session tracking
export function handleGameSessionStarted(event: GameSessionStarted): void {
  let player = getOrCreatePlayer(event.params.player)
  let sessionId = event.params.player.toHex() + "-" + event.params.sessionId.toString()
  
  let session = new GameSession(sessionId)
  session.player = player.id
  session.sessionId = event.params.sessionId
  session.startTime = event.params.timestamp
  session.endTime = null
  session.duration = null
  session.spinsCount = ZERO_BI
  session.totalBet = ZERO_BI
  session.totalWon = ZERO_BI
  session.netResult = ZERO_BI
  session.endReason = null
  session.isActive = true
  session.save()
  
  // Update player session count
  player.totalSessionCount = player.totalSessionCount.plus(ONE_BI)
  player.save()
}

export function handleGameSessionEnded(event: GameSessionEnded): void {
  let sessionId = event.params.player.toHex() + "-" + event.params.sessionId.toString()
  let session = GameSession.load(sessionId)
  
  if (session == null) {
    log.error("Session not found for id: {}", [sessionId])
    return
  }
  
  let player = getOrCreatePlayer(event.params.player)
  
  // Update session
  session.endTime = event.block.timestamp
  session.duration = event.block.timestamp.minus(session.startTime)
  session.spinsCount = event.params.spinsCount
  session.totalBet = event.params.totalBet
  session.totalWon = event.params.totalWon
  session.netResult = event.params.totalWon.minus(event.params.totalBet)
  session.endReason = event.params.endReason
  session.isActive = false
  session.save()
  
  // Update player session duration tracking
  if (session.duration !== null) {
    player.totalSessionDuration = player.totalSessionDuration.plus(session.duration as BigInt)
    if (player.totalSessionCount.gt(ZERO_BI)) {
      player.avgSessionDuration = player.totalSessionDuration.toBigDecimal().div(player.totalSessionCount.toBigDecimal())
    }
  }
  player.save()
}
export function handleJackpotHit(event: JackpotHit): void {
  let player = getOrCreatePlayer(event.params.player)
  
  // Create JackpotWin entity
  let jackpotWin = new JackpotWin(event.params.requestId.toString() + "-" + event.transaction.hash.toHex())
  jackpotWin.player = player.id
  jackpotWin.requestId = event.params.requestId
  jackpotWin.amount = event.params.amount
  jackpotWin.prizePoolBefore = event.params.prizePoolBefore
  jackpotWin.prizePoolAfter = event.params.prizePoolAfter
  jackpotWin.timestamp = event.block.timestamp
  jackpotWin.blockNumber = event.block.number
  jackpotWin.transactionHash = event.transaction.hash
  jackpotWin.save()
  
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.totalJackpotsPaid = metrics.totalJackpotsPaid.plus(event.params.amount)
  metrics.totalCosts = metrics.totalCosts.plus(event.params.amount)
  metrics.currentPrizePool = event.params.prizePoolAfter
  
  // Update profitability
  metrics.grossProfit = metrics.totalRevenue.minus(metrics.totalCosts)
  metrics.netProfit = metrics.grossProfit
  if (metrics.totalRevenue.gt(ZERO_BI)) {
    metrics.profitMargin = metrics.netProfit.toBigDecimal().times(HUNDRED_BD).div(metrics.totalRevenue.toBigDecimal())
  }
  
  metrics.save()
  
  // Update daily snapshot with jackpot
  let dailySnapshot = getOrCreateDailySnapshot(event.block.timestamp)
  dailySnapshot.jackpotsPaid = dailySnapshot.jackpotsPaid.plus(event.params.amount)
  dailySnapshot.save()
}

export function handlePrizePoolStateChanged(event: PrizePoolStateChanged): void {
  // Create PrizePoolChange entity
  let change = new PrizePoolChange(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  change.newTotalPrizePool = event.params.newTotalPrizePool
  change.amount = event.params.amount
  change.reason = event.params.reason
  change.reasonName = getPrizePoolChangeReasonName(event.params.reason)
  change.timestamp = event.block.timestamp
  change.blockNumber = event.block.number
  change.transactionHash = event.transaction.hash
  change.save()
  
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.currentPrizePool = event.params.newTotalPrizePool
  metrics.save()
}
export function handlePayoutTablesUpdated(event: PayoutTablesUpdated): void {
  let systemState = getOrCreateSystemState()
  systemState.payoutTablesAddress = event.params.newPayoutTables
  systemState.lastConfigUpdateTimestamp = event.block.timestamp
  systemState.save()
}

export function handleContractInitialized(event: ContractInitialized): void {
  let systemState = getOrCreateSystemState()
  systemState.deploymentBlock = event.block.number
  systemState.deploymentTimestamp = event.block.timestamp
  systemState.save()
}

export function handleEthWithdrawn(event: EthWithdrawn): void {
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.contractETHBalance = metrics.contractETHBalance.minus(event.params.amount)
  metrics.save()
}

export function handleApproval(event: Approval): void {
  let approval = new ApprovalEntity(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  approval.owner = event.params.owner
  approval.spender = event.params.spender
  approval.value = event.params.value
  approval.timestamp = event.block.timestamp
  approval.blockNumber = event.block.number
  approval.transactionHash = event.transaction.hash
  approval.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let systemState = getOrCreateSystemState()
  systemState.owner = event.params.newOwner
  systemState.save()
}

export function handlePaused(event: Paused): void {
  let systemState = getOrCreateSystemState()
  systemState.isPaused = true
  systemState.save()
}

export function handleUnpaused(event: Unpaused): void {
  let systemState = getOrCreateSystemState()
  systemState.isPaused = false
  systemState.save()
}

export function handleUpgraded(event: Upgraded): void {
  let systemState = getOrCreateSystemState()
  systemState.implementation = event.params.implementation
  systemState.save()
}

export function handleInitialized(event: Initialized): void {
  // This is handled by ContractInitialized
}

// Helper functions
function getPayoutTypeName(payoutType: i32): string {
  if (payoutType == 0) return "LOSE"
  if (payoutType == 1) return "SMALL_WIN"
  if (payoutType == 2) return "MEDIUM_WIN"
  if (payoutType == 3) return "BIG_WIN"
  if (payoutType == 4) return "MEGA_WIN"
  if (payoutType == 5) return "ULTRA_WIN"
  if (payoutType == 6) return "SPECIAL_COMBO"
  if (payoutType == 7) return "JACKPOT"
  return "UNKNOWN"
}

function getPrizePoolChangeReasonName(reason: i32): string {
  if (reason == 0) return "SPIN_CONTRIBUTION"
  if (reason == 1) return "JACKPOT_PAYOUT"
  if (reason == 2) return "ETH_DEPOSIT"
  if (reason == 3) return "VRF_PAYMENT"
  return "UNKNOWN"
}