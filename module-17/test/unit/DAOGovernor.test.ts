import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { DAOGovernor } from "../../typechain-types";

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
      3600, // 1 hour delay
      [],
      [ethers.ZeroAddress], // Anyone can execute
      owner.address
    );
    
    // Deploy governor
    const Governor = await ethers.getContractFactory("DAOGovernor");
    const governor = await Governor.deploy(
      await token.getAddress(),
      await timelock.getAddress(),
      1, // 1 block voting delay
      50, // 50 blocks voting period
      ethers.parseEther("100000") // 1% proposal threshold
    );
    
    // Setup roles
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(proposerRole, await governor.getAddress());
    await timelock.grantRole(executorRole, await governor.getAddress());
    
    // Distribute tokens and delegate
    await token.transfer(proposer.address, ethers.parseEther("100000"));
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
      expect(await governor.votingDelay()).to.equal(1);
      expect(await governor.votingPeriod()).to.equal(50);
      expect(await governor.proposalThreshold()).to.equal(ethers.parseEther("100000"));
    });

    it("Should set correct quorum", async function () {
      const { governor } = await loadFixture(deployGovernorFixture);
      
      // Default quorum is 4%
      expect(await governor["quorumNumerator()"]()).to.equal(4);
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
      
      await expect(
        governor.connect(owner).propose(
          targets,
          values,
          calldatas,
          description
        )
      ).to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
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
      await mine(1);
      
      await expect(
        governor.connect(voter1).castVote(proposalId, 1) // For
      ).to.emit(governor, "VoteCast");
    });

    it("Should reject voting before delay", async function () {
      const { governor, proposer, voter1 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      
      // Try to vote immediately
      await expect(
        governor.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
    });

    it("Should count votes correctly", async function () {
      const { governor, proposer, voter1, voter2, voter3 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(1);
      
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
      await mine(1);
      
      await governor.connect(voter1).castVote(proposalId, 1);
      
      // Try to vote again
      await expect(
        governor.connect(voter1).castVote(proposalId, 0)
      ).to.be.revertedWithCustomError(governor, "GovernorAlreadyCastVote");
    });

    it("Should allow voting with reason", async function () {
      const { governor, proposer, voter1 } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(1);
      
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
      await mine(2); // Mine 2 blocks to ensure we're past the voting delay
      
      // State 1: Active
      expect(await governor.state(proposalId)).to.equal(1);
      
      // Vote (more For than Against)
      await governor.connect(voter1).castVote(proposalId, 1); // 200k For
      await governor.connect(voter2).castVote(proposalId, 1); // 300k For
      
      // Mine past voting period
      await mine(50);
      
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
      await mine(1);
      
      // Vote Against > For
      await governor.connect(voter1).castVote(proposalId, 0); // 200k Against
      await governor.connect(voter2).castVote(proposalId, 0); // 300k Against
      
      await mine(50);
      
      // State 3: Defeated
      expect(await governor.state(proposalId)).to.equal(3);
    });
  });

  describe("Quorum", function () {
    it("Should calculate quorum based on total supply", async function () {
      const { governor } = await loadFixture(deployGovernorFixture);
      
      const blockNumber = await ethers.provider.getBlockNumber();
      const quorum = await governor.quorum(blockNumber - 1);
      
      // 4% of 10M = 400k
      expect(quorum).to.equal(ethers.parseEther("400000"));
    });

    it("Should fail proposal below quorum", async function () {
      const { governor, proposer } = await loadFixture(deployGovernorFixture);
      
      const proposalId = await createProposal(governor, proposer);
      await mine(1);
      
      // Only proposer votes (100k < 400k quorum)
      await governor.connect(proposer).castVote(proposalId, 1);
      
      await mine(50);
      
      // State 3: Defeated (due to quorum)
      expect(await governor.state(proposalId)).to.equal(3);
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
      await mine(1);
      await governor.connect(voter1).castVote(proposalId, 1);
      await governor.connect(voter2).castVote(proposalId, 1);
      await governor.connect(voter3).castVote(proposalId, 1);
      
      // Queue
      await mine(50);
      await governor.queue(targets, values, calldatas, ethers.id(description));
      
      // Wait for timelock
      await ethers.provider.send("evm_increaseTime", [3601]);
      await mine(1);
      
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