import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

export async function createProposal(
  governor: any,
  proposer: any,
  description: string = "Test Proposal"
) {
  const targets = [ethers.ZeroAddress];
  const values = [0];
  const calldatas = ["0x"];
  
  const tx = await governor.connect(proposer).propose(
    targets,
    values,
    calldatas,
    description
  );
  
  const receipt = await tx.wait();
  const event = receipt?.logs
    .map((log: any) => governor.interface.parseLog(log))
    .find((log: any) => log?.name === "ProposalCreated");
  
  return event?.args.proposalId;
}

export async function passProposal(
  governor: any,
  proposalId: any,
  voters: any[]
) {
  // Vote
  for (const voter of voters) {
    await governor.connect(voter).castVote(proposalId, 1); // For
  }
  
  // Wait for voting period to end
  const votingPeriod = await governor.votingPeriod();
  await time.advanceBlockTo(
    await time.latestBlock() + Number(votingPeriod)
  );
}

export async function executeProposal(
  governor: any,
  _proposalId: any,
  description: string = "Test Proposal"
) {
  const targets = [ethers.ZeroAddress];
  const values = [0];
  const calldatas = ["0x"];
  
  // Queue
  await governor.queue(
    targets,
    values,
    calldatas,
    ethers.id(description)
  );
  
  // Wait for timelock
  const timelock = await ethers.getContractAt(
    "Timelock",
    await governor.timelock()
  );
  const delay = await timelock.getMinDelay();
  await time.increase(Number(delay));
  
  // Execute
  await governor.execute(
    targets,
    values,
    calldatas,
    ethers.id(description)
  );
}