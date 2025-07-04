import {
  SpinRequested as SpinRequestedEvent,
  SpinResult as SpinResultEvent,
  WinningsWithdrawn as WinningsWithdrawnEvent,
  PrizePoolStateChanged as PrizePoolStateChangedEvent,
  ChipsPurchased as ChipsPurchasedEvent,
  EthWithdrawn as EthWithdrawnEvent,
  HouseFeeCollected as HouseFeeCollectedEvent,
  PlayerStatsUpdated as PlayerStatsUpdatedEvent,
  ContractInitialized as ContractInitializedEvent,
  WinningsCredited as WinningsCreditedEvent,
  PayoutTablesUpdated as PayoutTablesUpdatedEvent,
  Transfer as TransferEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent
} from "../generated/CasinoSlot/CasinoSlot"
import {
  SpinRequested,
  SpinResult,
  WinningsWithdrawn,
  PrizePoolStateChanged,
  ChipsPurchased,
  EthWithdrawn,
  HouseFeeCollected,
  PlayerStatsUpdated,
  ContractInitialized,
  WinningsCredited,
  PayoutTablesUpdated,
  Transfer,
  Paused,
  Unpaused,
  Player,
  DailyStat
} from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

// Helper function to get or create a player entity
function getOrCreatePlayer(playerAddress: Bytes): Player {
  let player = Player.load(playerAddress)
  if (player == null) {
    player = new Player(playerAddress)
    player.totalSpins = BigInt.fromI32(0)
    player.totalBet = BigInt.fromI32(0)
    player.totalWinnings = BigInt.fromI32(0)
    player.currentBalance = BigInt.fromI32(0)
    player.firstSpin = BigInt.fromI32(0)
    player.lastSpin = BigInt.fromI32(0)
  }
  return player
}

// Helper function to get or create daily stats
function getOrCreateDailyStat(timestamp: BigInt): DailyStat {
  // Create a date key (YYYY-MM-DD)
  let dayTimestamp = timestamp.minus(timestamp.mod(BigInt.fromI32(86400))) // Round to start of day
  let dailyStatId = Bytes.fromByteArray(Bytes.fromBigInt(dayTimestamp))
  
  let dailyStat = DailyStat.load(dailyStatId)
  if (dailyStat == null) {
    dailyStat = new DailyStat(dailyStatId)
    dailyStat.date = dayTimestamp
    dailyStat.totalSpins = BigInt.fromI32(0)
    dailyStat.totalBets = BigInt.fromI32(0)
    dailyStat.totalPayouts = BigInt.fromI32(0)
    dailyStat.uniquePlayers = BigInt.fromI32(0)
    dailyStat.houseFeesCollected = BigInt.fromI32(0)
  }
  return dailyStat
}

export function handleSpinRequested(event: SpinRequestedEvent): void {
  // Create SpinRequested entity
  let entity = new SpinRequested(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.requestId = event.params.requestId
  entity.player = event.params.player
  entity.reelCount = event.params.reelCount
  entity.betAmount = event.params.betAmount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Update player stats
  let player = getOrCreatePlayer(event.params.player)
  if (player.firstSpin.equals(BigInt.fromI32(0))) {
    player.firstSpin = event.block.timestamp
  }
  player.lastSpin = event.block.timestamp
  player.save()

  // Update daily stats
  let dailyStat = getOrCreateDailyStat(event.block.timestamp)
  dailyStat.totalSpins = dailyStat.totalSpins.plus(BigInt.fromI32(1))
  dailyStat.totalBets = dailyStat.totalBets.plus(event.params.betAmount)
  dailyStat.save()
}

export function handleSpinResult(event: SpinResultEvent): void {
  let entity = new SpinResult(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.requestId = event.params.requestId
  entity.player = event.params.player
  entity.reelCount = event.params.reelCount
  entity.reels = event.params.reels
  entity.payoutType = event.params.payoutType
  entity.payout = event.params.payout
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Update daily stats for payouts
  if (event.params.payout.gt(BigInt.fromI32(0))) {
    let dailyStat = getOrCreateDailyStat(event.block.timestamp)
    dailyStat.totalPayouts = dailyStat.totalPayouts.plus(event.params.payout)
    dailyStat.save()
  }
}

export function handleWinningsWithdrawn(event: WinningsWithdrawnEvent): void {
  let entity = new WinningsWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Update player current balance
  let player = getOrCreatePlayer(event.params.player)
  player.currentBalance = player.currentBalance.minus(event.params.amount)
  player.save()
}

export function handlePrizePoolStateChanged(event: PrizePoolStateChangedEvent): void {
  let entity = new PrizePoolStateChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newTotalPrizePool = event.params.newTotalPrizePool
  entity.amount = event.params.amount
  entity.reason = event.params.reason
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleChipsPurchased(event: ChipsPurchasedEvent): void {
  let entity = new ChipsPurchased(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.ethAmount = event.params.ethAmount
  entity.chipsAmount = event.params.chipsAmount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleEthWithdrawn(event: EthWithdrawnEvent): void {
  let entity = new EthWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleHouseFeeCollected(event: HouseFeeCollectedEvent): void {
  let entity = new HouseFeeCollected(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.requestId = event.params.requestId
  entity.player = event.params.player
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Update daily stats for house fees
  let dailyStat = getOrCreateDailyStat(event.block.timestamp)
  dailyStat.houseFeesCollected = dailyStat.houseFeesCollected.plus(event.params.amount)
  dailyStat.save()
}

export function handlePlayerStatsUpdated(event: PlayerStatsUpdatedEvent): void {
  let entity = new PlayerStatsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.totalSpins = event.params.totalSpins
  entity.totalWinnings = event.params.totalWinnings
  entity.totalBet = event.params.totalBet
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Update player entity with latest stats
  let player = getOrCreatePlayer(event.params.player)
  player.totalSpins = event.params.totalSpins
  player.totalWinnings = event.params.totalWinnings
  player.totalBet = event.params.totalBet
  player.save()
}

export function handleContractInitialized(event: ContractInitializedEvent): void {
  let entity = new ContractInitialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleWinningsCredited(event: WinningsCreditedEvent): void {
  let entity = new WinningsCredited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Update player current balance
  let player = getOrCreatePlayer(event.params.player)
  player.currentBalance = player.currentBalance.plus(event.params.amount)
  player.save()
}

export function handlePayoutTablesUpdated(event: PayoutTablesUpdatedEvent): void {
  let entity = new PayoutTablesUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newPayoutTables = event.params.newPayoutTables
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}
