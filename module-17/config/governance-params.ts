/**
 * Governance Parameters Configuration
 * 
 * This file centralizes all governance timing parameters for easy switching
 * between test and production environments.
 * 
 * IMPORTANT: Test Suite Constraints
 * The test suite has been made resilient to parameter changes, but some constraints apply:
 * 
 * - votingDelay: 0 to any reasonable value (tests adapt)
 * - votingPeriod: ≥5 blocks (some tests create multiple proposals)
 * - timelockDelay: ≥0 seconds (0 is supported but some tests will skip)
 * - proposalThreshold: 0 to ~500k tokens (higher values need fixture updates)
 * - quorumPercentage: 1-50% (higher values may cause some proposals to fail)
 * 
 * For extreme values outside these ranges, some tests may fail or skip.
 * My current deadline to finish that module is constrainted so I won't be able to fix those "issues". 
 */

export interface GovernanceParams {
  votingDelay: number;        // In blocks
  votingPeriod: number;       // In blocks
  timelockDelay: number;      // In seconds
  proposalThreshold: string;  // In tokens (wei)
  quorumPercentage: number;   // Percentage (4 = 4%)
}

// Test parameters - allows complete governance cycle in ~15 minutes
export const TEST_PARAMS: GovernanceParams = {
  votingDelay: 1,             // 1 block
  votingPeriod: 20,           // 20 blocks  
  timelockDelay: 300,         // 300 seconds (5 minutes)
  proposalThreshold: "1000000000000000000000",    // 1,000 tokens
  quorumPercentage: 4         // 4% quorum
};

// Production parameters - standard DAO timings
export const PRODUCTION_PARAMS: GovernanceParams = {
  //// If it was real production, these values would be more realistic
  // votingDelay: 1,             // 1 block (~12 seconds)
  // votingPeriod: 50400,        // ~1 week (50,400 blocks)
  // timelockDelay: 172800,      // 2 days
  // proposalThreshold: "100000000000000000000000", // 100,000 tokens (1%)
  // quorumPercentage: 4         // 4% quorum
  //// But for the sake of this module, we will use the same values as test
  votingDelay: 1,             // 1 block
  votingPeriod: 20,           // 20 blocks  
  timelockDelay: 300,         // 300 seconds (5 minutes)
  proposalThreshold: "1000000000000000000000",    // 1,000 tokens
  quorumPercentage: 4         // 4% quorum
};

// Get parameters based on environment
export function getGovernanceParams(): GovernanceParams {
  const isTestMode = process.env.GOVERNANCE_MODE === 'test' || 
                     process.env.NODE_ENV === 'test' ||
                     process.env.HARDHAT_NETWORK === 'localhost' ||
                     process.env.HARDHAT_NETWORK === 'hardhat';
  
  return isTestMode ? TEST_PARAMS : PRODUCTION_PARAMS;
}

// Helper to display params in human-readable format
export function formatParams(params: GovernanceParams): object {
  return {
    votingDelay: `${params.votingDelay} blocks (~${params.votingDelay * 12} seconds)`,
    votingPeriod: `${params.votingPeriod} blocks (~${params.votingPeriod * 12 / 60} minutes)`,
    timelockDelay: `${params.timelockDelay} seconds (${params.timelockDelay / 60} minutes)`,
    proposalThreshold: `${Number(params.proposalThreshold) / 1e18} tokens`,
    quorumPercentage: `${params.quorumPercentage}%`
  };
}