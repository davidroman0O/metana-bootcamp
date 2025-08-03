import { TEST_PARAMS } from "../../config/governance-params";

/**
 * Helper functions for tests to handle different parameter configurations
 */

export function shouldRunComplexVotingTests(): boolean {
  // Complex voting tests need enough blocks to do multiple voting rounds
  return TEST_PARAMS.votingPeriod >= 10;
}

export function shouldRunVotingDelayTests(): boolean {
  // Voting delay tests only make sense when there's actually a delay
  return TEST_PARAMS.votingDelay > 0;
}

// Removed shouldRunMultiProposalTests - tests now adapt to any voting period

export function getTestSafeVotingBlocks(): number {
  // Returns a safe number of blocks to mine during voting that won't exceed the period
  return Math.max(1, Math.floor(TEST_PARAMS.votingPeriod / 4));
}