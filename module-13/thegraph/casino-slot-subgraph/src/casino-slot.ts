import {
  Approval as ApprovalEvent,
  ChipsPurchased as ChipsPurchasedEvent,
  Initialized as InitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  PayoutTablesUpdated as PayoutTablesUpdatedEvent,
  PrizePoolUpdated as PrizePoolUpdatedEvent,
  SpinRequested as SpinRequestedEvent,
  SpinResult as SpinResultEvent,
  Transfer as TransferEvent,
  Unpaused as UnpausedEvent,
  Upgraded as UpgradedEvent,
  WinningsWithdrawn as WinningsWithdrawnEvent
} from "../generated/CasinoSlot/CasinoSlot"
import {
  Approval,
  ChipsPurchased,
  Initialized,
  OwnershipTransferred,
  Paused,
  PayoutTablesUpdated,
  PrizePoolUpdated,
  SpinRequested,
  SpinResult,
  Transfer,
  Unpaused,
  Upgraded,
  WinningsWithdrawn
} from "../generated/schema"

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.spender = event.params.spender
  entity.value = event.params.value

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

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

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

export function handlePayoutTablesUpdated(
  event: PayoutTablesUpdatedEvent
): void {
  let entity = new PayoutTablesUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newPayoutTables = event.params.newPayoutTables

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePrizePoolUpdated(event: PrizePoolUpdatedEvent): void {
  let entity = new PrizePoolUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newTotal = event.params.newTotal

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSpinRequested(event: SpinRequestedEvent): void {
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

export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.implementation = event.params.implementation

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
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
}
