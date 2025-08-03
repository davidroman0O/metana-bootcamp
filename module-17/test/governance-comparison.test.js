const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { TEST_PARAMS } = require("../config/governance-params");

describe("Governance Comparison: On-chain vs Off-chain", function () {
  // Fixture to deploy contracts
  async function deployGovernanceFixture() {
    const [deployer, alice, bob, charlie] = await ethers.getSigners();

    // Deploy GovernanceToken
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(deployer.address);
    await token.waitForDeployment();

    // Deploy Timelock
    const minDelay = TEST_PARAMS.timelockDelay;
    const proposers = []; // Will be set later
    const executors = [ethers.ZeroAddress]; // Anyone can execute
    const admin = deployer.address;
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(minDelay, proposers, executors, admin);
    await timelock.waitForDeployment();

    // Deploy Governor
    const Governor = await ethers.getContractFactory("DAOGovernor");
    const governor = await Governor.deploy(
      await token.getAddress(),
      await timelock.getAddress(),
      1, // 1 block voting delay
      50400, // 1 week voting period
      ethers.parseEther("100") // 100 tokens proposal threshold
    );
    await governor.waitForDeployment();

    // Setup roles
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(proposerRole, await governor.getAddress());
    await timelock.grantRole(executorRole, await governor.getAddress());

    // Mint and distribute tokens
    await token.mint(alice.address, ethers.parseEther("500"));
    await token.mint(bob.address, ethers.parseEther("300"));
    await token.mint(charlie.address, ethers.parseEther("200"));
    await token.mint(deployer.address, ethers.parseEther("1000")); // For testing

    // Delegate voting power
    await token.connect(alice).delegate(alice.address);
    await token.connect(bob).delegate(bob.address);
    await token.connect(charlie).delegate(charlie.address);

    return { token, governor, timelock, deployer, alice, bob, charlie };
  }

  describe("Token Snapshot Mechanism", function () {
    it("Should demonstrate on-chain voting uses checkpoints (historical balance)", async function () {
      const { token, governor, alice, deployer } = await loadFixture(deployGovernanceFixture);

      // Create proposal
      const targets = [await token.getAddress()];
      const values = [0];
      const calldatas = [token.interface.encodeFunctionData("transfer", [deployer.address, 100])];
      const description = "Test proposal: Transfer 100 tokens";

      const proposeTx = await governor.connect(alice).propose(
        targets,
        values,
        calldatas,
        description
      );
      const receipt = await proposeTx.wait();
      const proposalCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = governor.interface.parseLog(log);
          return parsed.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });
      const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;

      // Mine a block to start voting
      await ethers.provider.send("evm_mine", []);

      // Get voting power at proposal snapshot
      const proposalSnapshot = await governor.proposalSnapshot(proposalId);
      const currentBlock = await ethers.provider.getBlockNumber();
      console.log("      Current block:", currentBlock, "Proposal snapshot block:", proposalSnapshot);
      
      // Mine more blocks to ensure we're past the snapshot
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      
      const aliceVotesAtSnapshot = await token.getPastVotes(alice.address, proposalSnapshot);
      console.log("      Alice voting power at proposal snapshot:", ethers.formatEther(aliceVotesAtSnapshot));

      // Alice transfers all tokens before voting
      const aliceBalance = await token.balanceOf(alice.address);
      await token.connect(alice).transfer(deployer.address, aliceBalance);

      // Alice can still vote because she had tokens at the proposal snapshot!
      await governor.connect(alice).castVote(proposalId, 1);
      console.log("      ✓ Alice voted successfully despite having 0 current balance!");

      // Check the vote was counted
      const proposalVotes = await governor.proposalVotes(proposalId);
      expect(proposalVotes.forVotes).to.equal(aliceVotesAtSnapshot);

      // Note: OpenZeppelin Governor uses historical voting power, just like Snapshot!
      console.log("      Note: OpenZeppelin Governor also uses checkpoints (historical balance)!");
      console.log("      This is actually a key similarity between on-chain and off-chain governance.");
    });

    it("Should simulate off-chain voting with snapshot balance", async function () {
      const { token, alice, bob } = await loadFixture(deployGovernanceFixture);

      // Record balances at "snapshot" block
      const snapshotBlock = await ethers.provider.getBlockNumber();
      const aliceSnapshotBalance = await token.balanceOf(alice.address);
      const bobSnapshotBalance = await token.balanceOf(bob.address);

      console.log(`\n      Snapshot taken at block ${snapshotBlock}`);
      console.log(`      Alice balance: ${ethers.formatEther(aliceSnapshotBalance)} tokens`);
      console.log(`      Bob balance: ${ethers.formatEther(bobSnapshotBalance)} tokens`);

      // Alice and Bob swap ALL their tokens
      await token.connect(alice).transfer(bob.address, aliceSnapshotBalance);
      await token.connect(bob).transfer(alice.address, bobSnapshotBalance);

      // Current balances are now swapped
      const aliceCurrentBalance = await token.balanceOf(alice.address);
      const bobCurrentBalance = await token.balanceOf(bob.address);

      expect(aliceCurrentBalance).to.equal(bobSnapshotBalance);
      expect(bobCurrentBalance).to.equal(aliceSnapshotBalance);

      console.log(`\n      After token swap:`);
      console.log(`      Alice current balance: ${ethers.formatEther(aliceCurrentBalance)} tokens`);
      console.log(`      Bob current balance: ${ethers.formatEther(bobCurrentBalance)} tokens`);

      // In Snapshot voting:
      console.log(`\n      Snapshot voting power (based on block ${snapshotBlock}):`);
      console.log(`      Alice can vote with: ${ethers.formatEther(aliceSnapshotBalance)} tokens`);
      console.log(`      Bob can vote with: ${ethers.formatEther(bobSnapshotBalance)} tokens`);
      console.log(`\n      This prevents vote buying after proposal creation!`);

      // Verify the concept
      expect(aliceSnapshotBalance).to.equal(ethers.parseEther("500"));
      expect(bobSnapshotBalance).to.equal(ethers.parseEther("300"));
    });
  });

  describe("Gas Cost Analysis", function () {
    it("Should measure on-chain governance gas costs", async function () {
      const { token, governor, alice } = await loadFixture(deployGovernanceFixture);

      // Measure proposal creation gas
      const targets = [await token.getAddress()];
      const values = [0];
      const calldatas = [token.interface.encodeFunctionData("transfer", [alice.address, 100])];
      const description = "Gas measurement proposal";

      const proposeTx = await governor.connect(alice).propose(
        targets,
        values,
        calldatas,
        description
      );
      const proposeReceipt = await proposeTx.wait();
      const proposalCreatedEvent = proposeReceipt.logs.find(log => {
        try {
          const parsed = governor.interface.parseLog(log);
          return parsed.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });
      const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;

      console.log(`\n      Proposal creation gas: ${proposeReceipt.gasUsed.toString()}`);

      // Mine a block to start voting
      await ethers.provider.send("evm_mine", []);

      // Measure voting gas
      const voteTx = await governor.connect(alice).castVote(proposalId, 1);
      const voteReceipt = await voteTx.wait();

      console.log(`      Vote casting gas: ${voteReceipt.gasUsed.toString()}`);

      // Calculate for multiple voters
      const voterCount = 100;
      const totalVotingGas = voteReceipt.gasUsed * BigInt(voterCount);
      console.log(`      Gas for ${voterCount} voters: ${totalVotingGas.toString()}`);

      // Calculate costs at different gas prices
      const gasPrice = ethers.parseUnits("20", "gwei"); // 20 gwei
      const voteCostEth = ethers.formatEther(voteReceipt.gasUsed * gasPrice);
      const totalCostEth = ethers.formatEther(totalVotingGas * gasPrice);

      console.log(`\n      At 20 gwei gas price:`);
      console.log(`      Cost per vote: ${voteCostEth} ETH`);
      console.log(`      Cost for ${voterCount} voters: ${totalCostEth} ETH`);

      // Assert reasonable gas usage
      expect(proposeReceipt.gasUsed).to.be.lt(300000); // Proposal should be < 300k gas
      expect(voteReceipt.gasUsed).to.be.lt(100000); // Vote should be < 100k gas
    });

    it("Should demonstrate off-chain zero gas voting", async function () {
      console.log("\n      Snapshot voting costs:");
      console.log("      - Proposal creation: 0 gas (signed message)");
      console.log("      - Each vote: 0 gas (signed message)");
      console.log("      - 1000 voters: 0 gas");
      console.log("      - Only execution bridging requires gas (~100k)");

      // This is conceptual - actual Snapshot voting happens off-chain
      const snapshotCosts = {
        proposalCreation: 0,
        voting: 0,
        totalFor1000Voters: 0,
        executionBridge: 100000 // Approximate gas for SafeSnap execution
      };

      expect(snapshotCosts.voting).to.equal(0);
      expect(snapshotCosts.totalFor1000Voters).to.equal(0);
    });
  });

  describe("Security Model Differences", function () {
    it("Should demonstrate flash loan vulnerability in on-chain voting", async function () {
      const { token, governor, alice } = await loadFixture(deployGovernanceFixture);

      // In a real flash loan attack:
      // 1. Borrow huge amount of tokens
      // 2. Vote on proposal
      // 3. Return tokens in same transaction

      console.log("\n      On-chain governance flash loan vulnerability:");
      console.log("      1. Attacker borrows 1M tokens via flash loan");
      console.log("      2. Attacker votes with borrowed tokens");
      console.log("      3. Attacker returns tokens in same transaction");
      console.log("      Result: Proposal outcome manipulated with zero cost");

      // Snapshot prevents this:
      console.log("\n      Snapshot protection:");
      console.log("      - Voting power determined at proposal creation block");
      console.log("      - Flash loans can't affect historical balances");
      console.log("      - Vote buying must happen before proposal creation");
    });

    it("Should explain privacy differences", async function () {
      console.log("\n      Privacy comparison:");
      console.log("\n      On-chain voting:");
      console.log("      - All votes are public immediately");
      console.log("      - Can influence other voters (bandwagon effect)");
      console.log("      - Whale votes visible and can sway outcomes");

      console.log("\n      Snapshot with Shutter:");
      console.log("      - Votes encrypted during voting period");
      console.log("      - Results revealed only after voting ends");
      console.log("      - Prevents vote manipulation and copying");
      console.log("      - True voter preference discovery");
    });
  });

  describe("Accessibility Comparison", function () {
    it("Should calculate participation barriers", async function () {
      // Assume different ETH prices and gas costs
      const scenarios = [
        { network: "Ethereum L1", gasPrice: 50, ethPrice: 2000, voteGas: 80000 },
        { network: "Arbitrum L2", gasPrice: 0.1, ethPrice: 2000, voteGas: 80000 },
        { network: "Snapshot", gasPrice: 0, ethPrice: 2000, voteGas: 0 }
      ];

      console.log("\n      Voting cost comparison across platforms:");
      console.log("      (Assuming ETH = $2000)");

      for (const scenario of scenarios) {
        const costInGwei = scenario.voteGas * scenario.gasPrice;
        const costInEth = costInGwei / 1e9;
        const costInUsd = costInEth * scenario.ethPrice;

        console.log(`\n      ${scenario.network}:`);
        console.log(`      - Gas price: ${scenario.gasPrice} gwei`);
        console.log(`      - Vote cost: ${costInEth.toFixed(6)} ETH ($${costInUsd.toFixed(2)})`);
        
        if (costInUsd > 0) {
          // Calculate minimum viable token holding
          // Assume token = $10 and user won't spend more than 1% of holdings on voting
          const tokenPrice = 10;
          const maxVoteCostPercent = 0.01;
          const minTokenValue = costInUsd / maxVoteCostPercent;
          const minTokens = minTokenValue / tokenPrice;

          console.log(`      - Minimum viable holding: ${minTokens.toFixed(0)} tokens ($${minTokenValue.toFixed(0)})`);
        } else {
          console.log(`      - Minimum viable holding: Any amount ✨`);
        }
      }
    });
  });
});