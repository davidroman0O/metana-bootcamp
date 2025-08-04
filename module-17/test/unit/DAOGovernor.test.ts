import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, mine, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { DAOGovernor } from "../../typechain-types";
import { TEST_PARAMS } from "../../config/governance-params";

describe("DAOGovernor", function () {
  async function createProposal(governor: DAOGovernor, proposer: any) {
    const targets = [ethers.ZeroAddress];
    const values = [0];
    const calldatas = ["0x"];
    const description = "Test Proposal";
    
    const tx = await governor.connect(proposer).propose(
      targets,
      values,
      calldatas,
      description
    );
    
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map(log => governor.interface.parseLog(log))
      .find(log => log?.name === "ProposalCreated");
    
    return event?.args.proposalId;
  }
  
  function getMinTokensForProposal(): bigint {
    // Ensure users have at least threshold + buffer for proposals
    const threshold = BigInt(TEST_PARAMS.proposalThreshold);
    return threshold > 0n ? threshold + ethers.parseEther("10000") : ethers.parseEther("100000");
  }

  async function deployGovernorFixture() {
    const [owner, proposer, voter1, voter2, voter3] = await ethers.getSigners();
    
    // Deploy token
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(owner.address);
    
    // Mint initial supply
    await token.mint(owner.address, ethers.parseEther("10000000"));
    
    // Deploy timelock
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(
      TEST_PARAMS.timelockDelay,
      [],
      [ethers.ZeroAddress], // Anyone can execute
      owner.address
    );
    
    // Deploy governor
    const Governor = await ethers.getContractFactory("DAOGovernor");
    const governor = await Governor.deploy(
      await token.getAddress(),
      await timelock.getAddress(),
      TEST_PARAMS.votingDelay,
      TEST_PARAMS.votingPeriod,
      TEST_PARAMS.proposalThreshold
    );
    
    // Setup roles
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(proposerRole, await governor.getAddress());
    await timelock.grantRole(executorRole, await governor.getAddress());
    
    // Distribute tokens and delegate
    const minTokens = getMinTokensForProposal();
    await token.transfer(proposer.address, minTokens);
    await token.transfer(voter1.address, ethers.parseEther("200000"));
    await token.transfer(voter2.address, ethers.parseEther("300000"));
    await token.transfer(voter3.address, ethers.parseEther("400000"));
    
    await token.connect(proposer).delegate(proposer.address);
    await token.connect(voter1).delegate(voter1.address);
    await token.connect(voter2).delegate(voter2.address);
    await token.connect(voter3).delegate(voter3.address);
    
    return { token, timelock, governor, owner, proposer, voter1, voter2, voter3 };
  }

  describe("Deployment", function () {
    it("Should set correct parameters", async function () {
      const { governor, token, timelock } = await loadFixture(deployGovernorFixture);
      
      expect(await governor.token()).to.equal(await token.getAddress());
      expect(await governor.timelock()).to.equal(await timelock.getAddress());
      expect(await governor.votingDelay()).to.equal(TEST_PARAMS.votingDelay);
      expect(await governor.votingPeriod()).to.equal(TEST_PARAMS.votingPeriod);
      expect(await governor.proposalThreshold()).to.equal(TEST_PARAMS.proposalThreshold);
    });

    it("Should set correct quorum", async function () {
      const { governor } = await loadFixture(deployGovernorFixture);
      
      // Quorum should match TEST_PARAMS
      expect(await governor["quorumNumerator()"]()).to.equal(TEST_PARAMS.quorumPercentage);
      expect(await governor.quorumDenominator()).to.equal(100);
    });
  });

  describe("Proposal Creation", function () {
    it("Should create a proposal", async function () {
      const { governor, proposer } = await loadFixture(deployGovernorFixture);
      
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test Proposal";
      
      await expect(
        governor.connect(proposer).propose(
          targets,
          values,
          calldatas,
          description
        )
      ).to.emit(governor, "ProposalCreated");
    });

    it("Should enforce proposal threshold", async function () {
      const { governor, voter1 } = await loadFixture(deployGovernorFixture);
      
      // voter1 has 200k tokens, threshold is 100k, so should work
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test Proposal";
      
      await expect(
        governor.connect(voter1).propose(
          targets,
          values,
          calldatas,
          description
        )
      ).to.emit(governor, "ProposalCreated");
    });

    it("Should reject proposals below threshold", async function () {
      const { governor, owner } = await loadFixture(deployGovernorFixture);
      
      // Owner has no delegated tokens
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test Proposal";
      
      if (TEST_PARAMS.proposalThreshold === "0") {
        // With zero threshold, anyone can propose
        await expect(
          governor.connect(owner).propose(
            targets,
            values,
            calldatas,
            description
          )
        ).to.emit(governor, "ProposalCreated");
      } else {
        // With non-zero threshold, should revert
        await expect(
          governor.connect(owner).propose(
            targets,
            values,
            calldatas,
            description
          )
        ).to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
      }
    });

    it("Should generate correct proposal ID", async function () {
      const { governor, proposer } = await loadFixture(deployGovernorFixture);
      
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test Proposal";
      
      // Calculate expected proposal ID
      const expectedId = await governor.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );
      
      const tx = await governor.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated");
      
      expect(event?.args.proposalId).to.equal(expectedId);
    });
  });

  describe("Voting", function () {
    it("Should allow voting after delay", async function () {
      const { governor, proposer, voter1 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      
      // Mine 1 block for voting delay
      await mine(TEST_PARAMS.votingDelay);
      
      await expect(
        governor.connect(voter1).castVote(proposalId, 1) // For
      ).to.emit(governor, "VoteCast");
    });

    it("Should reject voting before delay", async function () {
      const { governor, proposer, voter1 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      
      // Only test if there's actually a voting delay
      if (TEST_PARAMS.votingDelay > 0) {
        // Try to vote immediately
        await expect(
          governor.connect(voter1).castVote(proposalId, 1)
        ).to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
      } else {
        // With no delay, voting should work immediately
        await expect(
          governor.connect(voter1).castVote(proposalId, 1)
        ).to.emit(governor, "VoteCast");
      }
    });

    it("Should count votes correctly", async function () {
      const { governor, proposer, voter1, voter2, voter3 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(TEST_PARAMS.votingDelay);
      
      // Cast votes
      await governor.connect(voter1).castVote(proposalId, 1); // For
      await governor.connect(voter2).castVote(proposalId, 0); // Against
      await governor.connect(voter3).castVote(proposalId, 2); // Abstain
      
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("200000"));
      expect(votes.againstVotes).to.equal(ethers.parseEther("300000"));
      expect(votes.abstainVotes).to.equal(ethers.parseEther("400000"));
    });

    it("Should prevent double voting", async function () {
      const { governor, proposer, voter1 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(TEST_PARAMS.votingDelay);
      
      await governor.connect(voter1).castVote(proposalId, 1);
      
      // Try to vote again
      await expect(
        governor.connect(voter1).castVote(proposalId, 0)
      ).to.be.revertedWithCustomError(governor, "GovernorAlreadyCastVote");
    });

    it("Should allow voting with reason", async function () {
      const { governor, proposer, voter1 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(TEST_PARAMS.votingDelay);
      
      const reason = "I support this proposal because...";
      await expect(
        governor.connect(voter1).castVoteWithReason(proposalId, 1, reason)
      ).to.emit(governor, "VoteCast");
    });
  });

  describe("Proposal States", function () {
    it("Should transition through states correctly", async function () {
      const { governor, proposer, voter1, voter2 } = await loadFixture(deployGovernorFixture);
      
      // Create proposal
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test Proposal";
      
      const tx = await governor.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated");
      const proposalId = event?.args.proposalId;
      
      // State 0: Pending
      expect(await governor.state(proposalId)).to.equal(0);
      
      // Mine to reach voting period (need to mine past the voting delay)
      await mine(TEST_PARAMS.votingDelay + 1); // Mine 2 blocks to ensure we're past the voting delay
      
      // State 1: Active
      expect(await governor.state(proposalId)).to.equal(1);
      
      // Vote (more For than Against)
      await governor.connect(voter1).castVote(proposalId, 1); // 200k For
      await governor.connect(voter2).castVote(proposalId, 1); // 300k For
      
      // Mine past voting period
      await mine(TEST_PARAMS.votingPeriod);
      
      // State 4: Succeeded
      expect(await governor.state(proposalId)).to.equal(4);
      
      // Queue
      await governor.queue(targets, values, calldatas, ethers.id(description));
      
      // State 5: Queued
      expect(await governor.state(proposalId)).to.equal(5);
    });

    it("Should mark proposal as defeated", async function () {
      const { governor, proposer, voter1, voter2 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(TEST_PARAMS.votingDelay);
      
      // Vote Against > For
      await governor.connect(voter1).castVote(proposalId, 0); // 200k Against
      await governor.connect(voter2).castVote(proposalId, 0); // 300k Against
      
      await mine(TEST_PARAMS.votingPeriod);
      
      // State 3: Defeated
      expect(await governor.state(proposalId)).to.equal(3);
    });
  });

  describe("Quorum", function () {
    it("Should calculate quorum based on total supply", async function () {
      const { governor, token } = await loadFixture(deployGovernorFixture);
      
      const blockNumber = await ethers.provider.getBlockNumber();
      const quorum = await governor.quorum(blockNumber - 1);
      
      // Should be quorumPercentage% of total supply
      const totalSupply = await token.totalSupply();
      const expectedQuorum = totalSupply * BigInt(TEST_PARAMS.quorumPercentage) / 100n;
      expect(quorum).to.equal(expectedQuorum);
    });

    it("Should fail proposal below quorum", async function () {
      const { governor, proposer, token } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(TEST_PARAMS.votingDelay);
      
      // Only proposer votes - check if this meets quorum
      await governor.connect(proposer).castVote(proposalId, 1);
      
      await mine(TEST_PARAMS.votingPeriod);
      
      // Calculate if proposer's vote meets quorum
      const proposerBalance = await token.balanceOf(proposer.address);
      const totalSupply = await token.totalSupply();
      const quorumNeeded = totalSupply * BigInt(TEST_PARAMS.quorumPercentage) / 100n;
      
      if (proposerBalance < quorumNeeded) {
        // State 3: Defeated (due to quorum)
        expect(await governor.state(proposalId)).to.equal(3);
      } else {
        // State 4: Succeeded (met quorum)
        expect(await governor.state(proposalId)).to.equal(4);
      }
    });
  });

  describe("Execution", function () {
    it("Should execute through timelock", async function () {
      const { governor, proposer, voter1, voter2, voter3, timelock } = 
        await loadFixture(deployGovernorFixture);
      
      // Create proposal to update timelock delay
      const newDelay = 7200; // 2 hours
      const targets = [await timelock.getAddress()];
      const values = [0];
      const calldatas = [
        timelock.interface.encodeFunctionData("updateDelay", [newDelay])
      ];
      const description = "Update timelock delay";
      
      const tx = await governor.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated");
      const proposalId = event?.args.proposalId;
      
      // Vote
      await mine(TEST_PARAMS.votingDelay);
      await governor.connect(voter1).castVote(proposalId, 1);
      await governor.connect(voter2).castVote(proposalId, 1);
      await governor.connect(voter3).castVote(proposalId, 1);
      
      // Queue
      await mine(TEST_PARAMS.votingPeriod);
      await governor.queue(targets, values, calldatas, ethers.id(description));
      
      // Wait for timelock
      await time.increase(TEST_PARAMS.timelockDelay + 1);
      await mine(TEST_PARAMS.votingDelay);
      
      // Execute
      await governor.execute(targets, values, calldatas, ethers.id(description));
      
      // Verify execution
      expect(await timelock.getMinDelay()).to.equal(newDelay);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty proposals", async function () {
      const { governor, proposer } = await loadFixture(deployGovernorFixture);
      
      await expect(
        governor.connect(proposer).propose([], [], [], "Empty proposal")
      ).to.be.revertedWithCustomError(governor, "GovernorInvalidProposalLength");
    });

    it("Should handle mismatched array lengths", async function () {
      const { governor, proposer } = await loadFixture(deployGovernorFixture);
      
      await expect(
        governor.connect(proposer).propose(
          [ethers.ZeroAddress],
          [],
          ["0x"],
          "Mismatched arrays"
        )
      ).to.be.revertedWithCustomError(governor, "GovernorInvalidProposalLength");
    });
  });
});