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
  
  player.save()
  
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.totalSpins = metrics.totalSpins.plus(ONE_BI)
  metrics.totalBetsVolume = metrics.totalBetsVolume.plus(event.params.betAmount)
  metrics.lastUpdateTimestamp = event.params.timestamp
  metrics.lastUpdateBlock = event.block.number
  
  // Check if this is a new player
  if (player.totalSpins.equals(ONE_BI)) {
    metrics.uniquePlayers = metrics.uniquePlayers.plus(ONE_BI)
  }
  
  metrics.save()
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
  }
  
  player.save()
  
  // Update casino metrics
  let metrics = getOrCreateCasinoMetrics()
  metrics.totalPayoutsVolume = metrics.totalPayoutsVolume.plus(event.params.payout)
  metrics.save()
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

// Simple stub handlers for other events that need minimal processing
export function handleGameSessionStarted(event: GameSessionStarted): void {}
export function handleGameSessionEnded(event: GameSessionEnded): void {}
export function handleJackpotHit(event: JackpotHit): void {}
export function handlePrizePoolStateChanged(event: PrizePoolStateChanged): void {}
export function handlePayoutTablesUpdated(event: PayoutTablesUpdated): void {}
export function handleContractInitialized(event: ContractInitialized): void {}
export function handleEthWithdrawn(event: EthWithdrawn): void {}
export function handleApproval(event: Approval): void {}
export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
export function handlePaused(event: Paused): void {}
export function handleUnpaused(event: Unpaused): void {}
export function handleUpgraded(event: Upgraded): void {}
export function handleInitialized(event: Initialized): void {}

// Helper function
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