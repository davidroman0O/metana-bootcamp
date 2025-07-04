import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
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
} from "../generated/CasinoSlot/CasinoSlot"

export function createApprovalEvent(
  owner: Address,
  spender: Address,
  value: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return approvalEvent
}

export function createChipsPurchasedEvent(
  player: Address,
  ethAmount: BigInt,
  chipsAmount: BigInt
): ChipsPurchased {
  let chipsPurchasedEvent = changetype<ChipsPurchased>(newMockEvent())

  chipsPurchasedEvent.parameters = new Array()

  chipsPurchasedEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  chipsPurchasedEvent.parameters.push(
    new ethereum.EventParam(
      "ethAmount",
      ethereum.Value.fromUnsignedBigInt(ethAmount)
    )
  )
  chipsPurchasedEvent.parameters.push(
    new ethereum.EventParam(
      "chipsAmount",
      ethereum.Value.fromUnsignedBigInt(chipsAmount)
    )
  )

  return chipsPurchasedEvent
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  )

  return initializedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createPayoutTablesUpdatedEvent(
  newPayoutTables: Address
): PayoutTablesUpdated {
  let payoutTablesUpdatedEvent = changetype<PayoutTablesUpdated>(newMockEvent())

  payoutTablesUpdatedEvent.parameters = new Array()

  payoutTablesUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newPayoutTables",
      ethereum.Value.fromAddress(newPayoutTables)
    )
  )

  return payoutTablesUpdatedEvent
}

export function createPrizePoolUpdatedEvent(
  newTotal: BigInt
): PrizePoolUpdated {
  let prizePoolUpdatedEvent = changetype<PrizePoolUpdated>(newMockEvent())

  prizePoolUpdatedEvent.parameters = new Array()

  prizePoolUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newTotal",
      ethereum.Value.fromUnsignedBigInt(newTotal)
    )
  )

  return prizePoolUpdatedEvent
}

export function createSpinRequestedEvent(
  requestId: BigInt,
  player: Address,
  reelCount: i32,
  betAmount: BigInt
): SpinRequested {
  let spinRequestedEvent = changetype<SpinRequested>(newMockEvent())

  spinRequestedEvent.parameters = new Array()

  spinRequestedEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  spinRequestedEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  spinRequestedEvent.parameters.push(
    new ethereum.EventParam(
      "reelCount",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(reelCount))
    )
  )
  spinRequestedEvent.parameters.push(
    new ethereum.EventParam(
      "betAmount",
      ethereum.Value.fromUnsignedBigInt(betAmount)
    )
  )

  return spinRequestedEvent
}

export function createSpinResultEvent(
  requestId: BigInt,
  player: Address,
  reelCount: i32,
  reels: Array<BigInt>,
  payoutType: i32,
  payout: BigInt
): SpinResult {
  let spinResultEvent = changetype<SpinResult>(newMockEvent())

  spinResultEvent.parameters = new Array()

  spinResultEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  spinResultEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  spinResultEvent.parameters.push(
    new ethereum.EventParam(
      "reelCount",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(reelCount))
    )
  )
  spinResultEvent.parameters.push(
    new ethereum.EventParam(
      "reels",
      ethereum.Value.fromUnsignedBigIntArray(reels)
    )
  )
  spinResultEvent.parameters.push(
    new ethereum.EventParam(
      "payoutType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(payoutType))
    )
  )
  spinResultEvent.parameters.push(
    new ethereum.EventParam("payout", ethereum.Value.fromUnsignedBigInt(payout))
  )

  return spinResultEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  value: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return transferEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}

export function createUpgradedEvent(implementation: Address): Upgraded {
  let upgradedEvent = changetype<Upgraded>(newMockEvent())

  upgradedEvent.parameters = new Array()

  upgradedEvent.parameters.push(
    new ethereum.EventParam(
      "implementation",
      ethereum.Value.fromAddress(implementation)
    )
  )

  return upgradedEvent
}

export function createWinningsWithdrawnEvent(
  player: Address,
  amount: BigInt
): WinningsWithdrawn {
  let winningsWithdrawnEvent = changetype<WinningsWithdrawn>(newMockEvent())

  winningsWithdrawnEvent.parameters = new Array()

  winningsWithdrawnEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  winningsWithdrawnEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return winningsWithdrawnEvent
}
