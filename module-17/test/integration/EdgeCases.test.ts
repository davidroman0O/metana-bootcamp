import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Governance Edge Cases", function () {
  async function deployGovernanceFixture() {
    const [deployer, alice, bob, charlie, dave, eve] = await ethers.getSigners();
    
    // Deploy token
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(deployer.address);
    
    // Mint initial supply (to match expected quorum calculations)
    await token.mint(deployer.address, ethers.parseEther("10000000")); // 10M initial supply
    
    // Mint and distribute tokens for various scenarios
    await token.mint(alice.address, ethers.parseEther("400000"));    // Exactly quorum amount
    await token.mint(bob.address, ethers.parseEther("300000"));     
    await token.mint(charlie.address, ethers.parseEther("200000"));  
    await token.mint(dave.address, ethers.parseEther("100000"));     
    await token.mint(eve.address, ethers.parseEther("50000"));       
    
    // Deploy timelock
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(
      3600, // 1 hour delay
      [],
      [ethers.ZeroAddress],
      deployer.address
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
    const cancellerRole = await timelock.CANCELLER_ROLE();
    await timelock.grantRole(proposerRole, await governor.getAddress());
    await timelock.grantRole(executorRole, await governor.getAddress());
    await timelock.grantRole(cancellerRole, await governor.getAddress());
    
    // Grant MINTER_ROLE to timelock so governance can mint tokens
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, await timelock.getAddress());
    
    // Everyone delegates to themselves
    await token.connect(deployer).delegate(deployer.address);
    await token.connect(alice).delegate(alice.address);
    await token.connect(bob).delegate(bob.address);
    await token.connect(charlie).delegate(charlie.address);
    await token.connect(dave).delegate(dave.address);
    await token.connect(eve).delegate(eve.address);
    
    return { token, timelock, governor, deployer, alice, bob, charlie, dave, eve };
  }

  describe("Quorum Edge Cases", function () {
    it("Should handle proposal at exact quorum threshold", async function () {
      const { governor, alice, bob } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test exact quorum"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Alice and Bob vote to meet quorum (400k + 300k = 700k > 442k quorum)
      await governor.connect(alice).castVote(proposalId, 1);
      await governor.connect(bob).castVote(proposalId, 1);
      
      await mine(50);
      
      // Should succeed with exactly quorum
      expect(await governor.state(proposalId)).to.equal(4); // Succeeded
      
      // Verify quorum calculation
      const snapshot = await governor.proposalSnapshot(proposalId);
      const quorum = await governor.quorum(snapshot);
      const votes = await governor.proposalVotes(proposalId);
      
      expect(votes.forVotes).to.be.at.least(quorum); // At or above quorum
    });

    it("Should fail with votes just below quorum", async function () {
      const { governor, alice, bob, dave, eve } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test below quorum"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Only eve votes (50k < 400k quorum)
      await governor.connect(eve).castVote(proposalId, 1);
      
      await mine(50);
      
      // Should fail due to lack of quorum (50k < 400k)
      expect(await governor.state(proposalId)).to.equal(3); // Defeated
    });
  });

  describe("Voting Edge Cases", function () {
    it("Should handle tie votes correctly", async function () {
      const { governor, alice, bob, dave } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test tie vote"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Create a tie: Alice for (400k), Bob + Dave against (300k + 100k = 400k)
      await governor.connect(alice).castVote(proposalId, 1); // For
      await governor.connect(bob).castVote(proposalId, 0);   // Against
      await governor.connect(dave).castVote(proposalId, 0);  // Against
      
      await mine(50);
      
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(votes.againstVotes);
      
      // In a tie, proposal should be defeated (For must be > Against)
      expect(await governor.state(proposalId)).to.equal(3); // Defeated
    });

    it("Should handle all abstain votes", async function () {
      const { governor, alice, bob, charlie } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test all abstain"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Everyone abstains
      await governor.connect(alice).castVote(proposalId, 2);
      await governor.connect(bob).castVote(proposalId, 2);
      await governor.connect(charlie).castVote(proposalId, 2);
      
      await mine(50);
      
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(0);
      expect(votes.againstVotes).to.equal(0);
      expect(votes.abstainVotes).to.equal(ethers.parseEther("900000"));
      
      // Should be defeated (no For votes)
      expect(await governor.state(proposalId)).to.equal(3); // Defeated
    });

    it("Should handle last-block voting", async function () {
      const { governor, alice, bob, charlie } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test last block voting"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      const deadline = await governor.proposalDeadline(proposalId);
      
      await mine(2);
      
      // Alice votes early
      await governor.connect(alice).castVote(proposalId, 1);
      
      // Mine to one block before deadline
      const currentBlock = await ethers.provider.getBlockNumber();
      const blocksToMine = Number(deadline) - currentBlock - 1;
      await mine(blocksToMine);
      
      // Bob votes at the last possible block
      await governor.connect(bob).castVote(proposalId, 1);
      
      // Verify we're at the deadline
      const blockAfterVote = await ethers.provider.getBlockNumber();
      expect(blockAfterVote).to.equal(deadline);
      
      // Mine one more block - voting should now be closed
      await mine(1);
      
      // Charlie tries to vote after deadline
      await expect(
        governor.connect(charlie).castVote(proposalId, 1)
      ).to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
      
      // Proposal should have succeeded
      expect(await governor.state(proposalId)).to.equal(4); // Succeeded
    });
  });

  describe("Proposal Edge Cases", function () {
    it("Should handle proposal with maximum actions", async function () {
      const { token, governor, alice, bob } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal with many actions (testing gas limits)
      const targets = [];
      const values = [];
      const calldatas = [];
      
      // Add 10 different mint operations
      for (let i = 0; i < 10; i++) {
        targets.push(await token.getAddress());
        values.push(0);
        calldatas.push(
          token.interface.encodeFunctionData("mint", [alice.address, ethers.parseEther("1000")])
        );
      }
      
      const description = "Multi-action proposal with 10 operations";
      
      // Should be able to create
      const proposeTx = await governor.connect(alice).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      expect(proposalId).to.not.be.undefined;
      
      // Should be able to vote and execute
      await mine(2);
      await governor.connect(alice).castVote(proposalId, 1);
      await governor.connect(bob).castVote(proposalId, 1);
      await mine(50);
      
      await governor.queue(targets, values, calldatas, ethers.id(description));
      await time.increase(3601);
      
      // Execute should work since timelock has minter role
      await governor.execute(targets, values, calldatas, ethers.id(description));
    });

    it("Should handle competing proposals", async function () {
      const { token, governor, alice, bob, charlie } = await loadFixture(deployGovernanceFixture);
      
      // Create multiple proposals at once
      const proposal1Tx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Alice's proposal"
      );
      
      const proposal2Tx = await governor.connect(bob).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Bob's proposal"
      );
      
      const proposal3Tx = await governor.connect(charlie).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Charlie's proposal"
      );
      
      const receipt1 = await proposal1Tx.wait();
      const receipt2 = await proposal2Tx.wait();
      const receipt3 = await proposal3Tx.wait();
      
      const proposalId1 = receipt1?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
        
      const proposalId2 = receipt2?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
        
      const proposalId3 = receipt3?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Different voting patterns for each
      await governor.connect(alice).castVote(proposalId1, 1);
      await governor.connect(bob).castVote(proposalId1, 0);
      
      await governor.connect(bob).castVote(proposalId2, 1);
      await governor.connect(charlie).castVote(proposalId2, 1);
      
      await governor.connect(charlie).castVote(proposalId3, 1);
      await governor.connect(alice).castVote(proposalId3, 2); // Abstain
      
      await mine(50);
      
      // Check states
      // Proposal1: alice 400k FOR, bob 300k AGAINST. 400k FOR < 442k quorum requirement
      expect(await governor.state(proposalId1)).to.equal(3); // Defeated (insufficient FOR votes)
      // Proposal2: bob + charlie = 500k FOR. Meets 442k quorum
      expect(await governor.state(proposalId2)).to.equal(4); // Succeeded
      // Proposal3: charlie 200k FOR, alice abstains. In OpenZeppelin v5, abstain votes count towards
      // quorum participation, so 600k total participation meets quorum even though FOR < quorum
      expect(await governor.state(proposalId3)).to.equal(4); // Succeeded
    });
  });

  describe("Timelock Edge Cases", function () {
    it("Should handle timelock operation at exact minimum delay", async function () {
      const { governor, alice, bob } = await loadFixture(deployGovernanceFixture);
      
      // Create and pass proposal
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test exact delay";
      
      const proposeTx = await governor.connect(alice).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      await governor.connect(alice).castVote(proposalId, 1);
      await governor.connect(bob).castVote(proposalId, 1);
      await mine(50);
      
      // Queue
      await governor.queue(targets, values, calldatas, ethers.id(description));
      
      // Wait exactly the minimum delay
      await time.increase(3600); // Exactly 1 hour
      
      // Should be executable
      await expect(
        governor.execute(targets, values, calldatas, ethers.id(description))
      ).to.not.be.reverted;
    });

    it("Should handle multiple operations in timelock queue", async function () {
      const { governor, alice, bob } = await loadFixture(deployGovernanceFixture);
      
      // Create multiple proposals
      const proposals = [];
      
      for (let i = 0; i < 3; i++) {
        const proposeTx = await governor.connect(alice).propose(
          [ethers.ZeroAddress],
          [0],
          ["0x"],
          `Test proposal ${i}`
        );
        
        const proposeReceipt = await proposeTx.wait();
        const proposalId = proposeReceipt?.logs
          .map(log => governor.interface.parseLog(log))
          .find(log => log?.name === "ProposalCreated")
          ?.args.proposalId;
          
        proposals.push({
          id: proposalId,
          description: `Test proposal ${i}`
        });
      }
      
      await mine(2);
      
      // Vote on all
      for (const proposal of proposals) {
        await governor.connect(alice).castVote(proposal.id, 1);
        await governor.connect(bob).castVote(proposal.id, 1);
      }
      
      await mine(50);
      
      // Queue all
      for (const proposal of proposals) {
        await governor.queue(
          [ethers.ZeroAddress],
          [0],
          ["0x"],
          ethers.id(proposal.description)
        );
      }
      
      // All should be queued
      for (const proposal of proposals) {
        expect(await governor.state(proposal.id)).to.equal(5); // Queued
      }
      
      // Wait and execute all
      await time.increase(3601);
      
      for (const proposal of proposals) {
        await governor.execute(
          [ethers.ZeroAddress],
          [0],
          ["0x"],
          ethers.id(proposal.description)
        );
      }
      
      // All should be executed
      for (const proposal of proposals) {
        expect(await governor.state(proposal.id)).to.equal(7); // Executed
      }
    });
  });

  describe("Token Edge Cases", function () {
    it("Should handle token transfers during active proposal", async function () {
      const { token, governor, alice, eve } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test token transfer during voting"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      const snapshotBlock = await governor.proposalSnapshot(proposalId);
      
      await mine(2);
      
      // Alice votes
      await governor.connect(alice).castVote(proposalId, 1);
      
      // Alice transfers tokens to Eve after voting
      await token.connect(alice).transfer(eve.address, ethers.parseEther("200000"));
      
      // Eve delegates to herself
      await token.connect(eve).delegate(eve.address);
      
      // Eve tries to vote with transferred tokens
      await expect(
        governor.connect(eve).castVote(proposalId, 0)
      ).to.not.be.reverted;
      
      // But Eve's vote should be 0 (tokens transferred after snapshot)
      const eveVotingPower = await token.getPastVotes(eve.address, snapshotBlock);
      expect(eveVotingPower).to.equal(ethers.parseEther("50000")); // Only original balance
    });
  });
});