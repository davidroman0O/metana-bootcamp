import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Governance Flow Integration", function () {
  async function deployGovernanceFixture() {
    const [deployer, alice, bob, charlie, dave, eve] = await ethers.getSigners();
    
    // Deploy token
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(deployer.address);
    
    // Mint and distribute tokens
    await token.mint(deployer.address, ethers.parseEther("1000000")); // 1M to deployer
    await token.mint(alice.address, ethers.parseEther("500000"));    // 500k to alice
    await token.mint(bob.address, ethers.parseEther("300000"));      // 300k to bob
    await token.mint(charlie.address, ethers.parseEther("200000"));  // 200k to charlie
    
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
    
    return { token, timelock, governor, deployer, alice, bob, charlie, dave, eve };
  }

  describe("Complete Governance Cycle", function () {
    it("Should complete full governance cycle: propose, vote, queue, execute", async function () {
      const { token, governor, deployer, alice, bob, charlie } = 
        await loadFixture(deployGovernanceFixture);
      
      // 1. Create proposal to mint more tokens
      const mintAmount = ethers.parseEther("1000000"); // 1M new tokens
      const targets = [await token.getAddress()];
      const values = [0];
      const calldatas = [
        token.interface.encodeFunctionData("mint", [deployer.address, mintAmount])
      ];
      const description = "Mint 1M additional tokens for development fund";
      
      console.log("Creating proposal...");
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
      
      console.log("Proposal created with ID:", proposalId);
      
      // Check initial state
      expect(await governor.state(proposalId)).to.equal(0); // Pending
      
      // 2. Wait for voting to start
      await mine(2);
      expect(await governor.state(proposalId)).to.equal(1); // Active
      
      // 3. Cast votes
      console.log("Voting...");
      await governor.connect(alice).castVote(proposalId, 1);    // For (500k)
      await governor.connect(bob).castVote(proposalId, 1);      // For (300k)
      await governor.connect(charlie).castVote(proposalId, 0);  // Against (200k)
      
      // Check votes
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("800000"));
      expect(votes.againstVotes).to.equal(ethers.parseEther("200000"));
      
      // 4. Wait for voting period to end
      await mine(50);
      expect(await governor.state(proposalId)).to.equal(4); // Succeeded
      
      // 5. Queue the proposal
      console.log("Queueing proposal...");
      await governor.queue(targets, values, calldatas, ethers.id(description));
      expect(await governor.state(proposalId)).to.equal(5); // Queued
      
      // 6. Wait for timelock delay
      await time.increase(3601); // 1 hour + 1 second
      
      // 7. Execute the proposal
      console.log("Executing proposal...");
      const tokenSupplyBefore = await token.totalSupply();
      
      await governor.execute(targets, values, calldatas, ethers.id(description));
      expect(await governor.state(proposalId)).to.equal(7); // Executed
      
      // 8. Verify execution
      const tokenSupplyAfter = await token.totalSupply();
      expect(tokenSupplyAfter - tokenSupplyBefore).to.equal(mintAmount);
      
      console.log("Governance cycle completed successfully!");
    });

    it("Should handle proposal with multiple actions", async function () {
      const { token, timelock, governor, alice, bob } = 
        await loadFixture(deployGovernanceFixture);
      
      // Create proposal with multiple actions
      const targets = [
        await token.getAddress(),
        await governor.getAddress(),
        await timelock.getAddress()
      ];
      const values = [0, 0, 0];
      const calldatas = [
        token.interface.encodeFunctionData("mint", [alice.address, ethers.parseEther("50000")]),
        governor.interface.encodeFunctionData("setProposalThreshold", [ethers.parseEther("50000")]),
        timelock.interface.encodeFunctionData("updateDelay", [7200]) // 2 hours
      ];
      const description = "Multi-action proposal: mint tokens, update threshold, increase timelock delay";
      
      // Create and vote
      const proposeTx = await governor.connect(alice).propose(targets, values, calldatas, description);
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      await governor.connect(alice).castVote(proposalId, 1);
      await governor.connect(bob).castVote(proposalId, 1);
      
      // Queue and execute
      await mine(50);
      await governor.queue(targets, values, calldatas, ethers.id(description));
      await time.increase(3601);
      await governor.execute(targets, values, calldatas, ethers.id(description));
      
      // Verify all actions executed
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("550000")); // 500k + 50k
      expect(await governor.proposalThreshold()).to.equal(ethers.parseEther("50000"));
      expect(await timelock.getMinDelay()).to.equal(7200);
    });
  });

  describe("Voting Scenarios", function () {
    it("Should handle vote changes with reason", async function () {
      const { governor, alice, bob } = await loadFixture(deployGovernanceFixture);
      
      // Create a simple proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test proposal for vote changes"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Vote with reason
      await governor.connect(alice).castVoteWithReason(
        proposalId,
        1,
        "I support this proposal because it improves the protocol"
      );
      
      // Another voter votes against with reason
      await governor.connect(bob).castVoteWithReason(
        proposalId,
        0,
        "I oppose this proposal due to insufficient community discussion"
      );
      
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("500000"));
      expect(votes.againstVotes).to.equal(ethers.parseEther("300000"));
    });

    it("Should handle late voting properly", async function () {
      const { governor, alice, bob, charlie } = await loadFixture(deployGovernanceFixture);
      
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test late voting"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Alice votes early
      await governor.connect(alice).castVote(proposalId, 1);
      
      // Bob votes in the middle
      await mine(25);
      await governor.connect(bob).castVote(proposalId, 1);
      
      // Charlie votes near the end
      await mine(20); // Total: 2 + 25 + 20 = 47 blocks (still within voting period)
      
      // Verify we're still in voting period
      const currentState = await governor.state(proposalId);
      expect(currentState).to.equal(1); // Should still be Active
      
      await governor.connect(charlie).castVote(proposalId, 2); // Abstain
      
      // All votes should be counted
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("800000"));     // Alice 500k + Bob 300k
      expect(votes.abstainVotes).to.equal(ethers.parseEther("200000")); // Charlie 200k
    });
  });

  describe("Delegation Scenarios", function () {
    it("Should handle complex delegation chains", async function () {
      const { token, governor, alice, bob, charlie, dave, eve } = 
        await loadFixture(deployGovernanceFixture);
      
      // Remember: Alice 500k, Bob 300k, Charlie 200k, Dave 0, Eve 0
      // Charlie has already delegated to himself in the fixture
      
      // Alice and Bob delegate to Charlie
      await token.connect(alice).delegate(charlie.address);
      await token.connect(bob).delegate(charlie.address);
      
      // Charlie now has his own + alice's + bob's voting power
      expect(await token.getVotes(charlie.address)).to.equal(
        ethers.parseEther("1000000") // 200k + 500k + 300k
      );
      
      // Create a proposal
      // Charlie proposes since alice delegated her voting power
      const proposeTx = await governor.connect(charlie).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test delegation voting"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Charlie votes with combined voting power
      await governor.connect(charlie).castVote(proposalId, 1);
      
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("1000000")); // Charlie has 200k + alice 500k + bob 300k
    });

    it("Should handle delegation changes during voting", async function () {
      const { token, governor, alice, bob, charlie } = 
        await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test delegation changes"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // Charlie changes delegation after snapshot but before voting
      await token.connect(charlie).delegate(bob.address);
      
      // Bob votes - should NOT include Charlie's tokens (delegation after snapshot)
      await governor.connect(bob).castVote(proposalId, 1);
      
      const votes = await governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.parseEther("300000")); // Only Bob's original tokens
    });
  });

  describe("Error Cases", function () {
    it("Should revert when executing proposal too early", async function () {
      const { governor, alice, bob } = await loadFixture(deployGovernanceFixture);
      
      // Create and pass proposal
      const targets = [ethers.ZeroAddress];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test early execution";
      
      const proposeTx = await governor.connect(alice).propose(targets, values, calldatas, description);
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
      
      // Try to execute immediately (should fail)
      await expect(
        governor.execute(targets, values, calldatas, ethers.id(description))
      ).to.be.reverted; // Will revert because timelock delay not met
    });

    it("Should fail proposal that doesn't meet quorum", async function () {
      const { governor, alice, eve } = await loadFixture(deployGovernanceFixture);
      
      // Create proposal
      const proposeTx = await governor.connect(alice).propose(
        [ethers.ZeroAddress],
        [0],
        ["0x"],
        "Test quorum failure"
      );
      
      const proposeReceipt = await proposeTx.wait();
      const proposalId = proposeReceipt?.logs
        .map(log => governor.interface.parseLog(log))
        .find(log => log?.name === "ProposalCreated")
        ?.args.proposalId;
      
      await mine(2);
      
      // No one votes, so quorum won't be met
      
      // Wait for voting to end
      await mine(50);
      
      // Proposal should be defeated due to lack of quorum
      expect(await governor.state(proposalId)).to.equal(3); // Defeated
    });
  });
});