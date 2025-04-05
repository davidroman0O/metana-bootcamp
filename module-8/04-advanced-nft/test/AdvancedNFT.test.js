const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("AdvancedNFT", function () {
  let advancedNFT;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let merkleTree;
  let merkleRoot;

  function createMerkleTree(addresses) {
    const leaves = addresses.map((addr, index) => 
      ethers.utils.solidityKeccak256(["address", "uint256"], [addr, index])
    );
    
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    return tree;
  }

  function getProof(address, index) {
    const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [address, index]);
    return merkleTree.getHexProof(leaf);
  }

  async function waitForBlocks(count) {
    // Mine the required number of blocks
    for (let i = 0; i < count; i++) {
      await ethers.provider.send("evm_mine", []);
    }
  }

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    const whitelistAddresses = [addr1.address, addr2.address, ...addrs.slice(0, 5).map(a => a.address)];
    merkleTree = createMerkleTree(whitelistAddresses);
    merkleRoot = merkleTree.getHexRoot();
    
    const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
    advancedNFT = await AdvancedNFT.deploy(
      "AdvancedNFT",
      "ANFT",
      "https://whocares.wtf/api/token/",
      merkleRoot
    );
    await advancedNFT.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await advancedNFT.owner()).to.equal(owner.address);
    });

    it("Should set the correct initial state", async function () {
      expect(await advancedNFT.state()).to.equal(0); // State.Inactive
    });
    
    it("Should set the merkle root correctly", async function () {
      expect(await advancedNFT.merkleRoot()).to.equal(merkleRoot);
    });
  });

  describe("State Machine", function () {
    it("Should allow owner to change state", async function () {
      await advancedNFT.setState(1); // Set to PrivateSale
      expect(await advancedNFT.state()).to.equal(1);
      
      await advancedNFT.setState(2); // Set to PublicSale
      expect(await advancedNFT.state()).to.equal(2);
    });
    
    it("Should not allow non-owner to change state", async function () {
      await expect(
        advancedNFT.connect(addr1).setState(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Merkle Tree Airdrop", function () {
    beforeEach(async function () {
      await advancedNFT.setState(1); // PrivateSale
    });
    
    it("Should allow whitelisted address to claim with bitmap", async function () {
      const index = 0; // addr1 is at index 0
      const proof = getProof(addr1.address, index);
      
      await advancedNFT.connect(addr1).claimWithBitmap(index, proof);
      
      expect(await advancedNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await advancedNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await advancedNFT.totalSupply()).to.equal(1);
    });
    
    it("Should allow whitelisted address to claim with mapping", async function () {
      const index = 0; // addr1 is at index 0
      const proof = getProof(addr1.address, index);
      
      await advancedNFT.connect(addr1).claimWithMapping(index, proof);
      
      expect(await advancedNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await advancedNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await advancedNFT.totalSupply()).to.equal(1);
    });
    
    it("Should not allow double claiming with bitmap", async function () {
      const index = 0;
      const proof = getProof(addr1.address, index);
      
      await advancedNFT.connect(addr1).claimWithBitmap(index, proof);
      
      await expect(
        advancedNFT.connect(addr1).claimWithBitmap(index, proof)
      ).to.be.revertedWith("Already claimed");
    });
    
    it("Should not allow double claiming with mapping", async function () {
      const index = 0;
      const proof = getProof(addr1.address, index);
      
      await advancedNFT.connect(addr1).claimWithMapping(index, proof);
      
      await expect(
        advancedNFT.connect(addr1).claimWithMapping(index, proof)
      ).to.be.revertedWith("Already claimed");
    });
    
    it("Should measure gas usage difference between bitmap and mapping", async function () {
      const index1 = 0;
      const proof1 = getProof(addr1.address, index1);
      
      const tx1 = await advancedNFT.connect(addr1).claimWithBitmap(index1, proof1);
      const receipt1 = await tx1.wait();
      const bitmapEvent = receipt1.events.find(e => e.event === "GasUsed");
      
      // Deploy a new instance for the mapping test
      const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
      const advancedNFT2 = await AdvancedNFT.deploy(
        "AdvancedNFT",
        "ANFT",
        "https://whocares.wtf/api/token/",
        merkleRoot
      );
      await advancedNFT2.deployed();
      
      await advancedNFT2.setState(1); // PrivateSale
      
      const index2 = 0;
      const proof2 = getProof(addr1.address, index2);
      
      const tx2 = await advancedNFT2.connect(addr1).claimWithMapping(index2, proof2);
      const receipt2 = await tx2.wait();
      const mappingEvent = receipt2.events.find(e => e.event === "GasUsed");
      
      console.log(`Gas used with bitmap: ${bitmapEvent.args.gasUsed}`);
      console.log(`Gas used with mapping: ${mappingEvent.args.gasUsed}`);
    });
  });

  describe("Public Sale", function () {
    beforeEach(async function () {
      await advancedNFT.setState(2); // PublicSale
    });
    
    it("Should allow anyone to mint during public sale", async function () {
      await advancedNFT.connect(addr1).publicMint(
        1,
        { value: ethers.utils.parseEther("0.08") }
      );
      
      expect(await advancedNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await advancedNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await advancedNFT.totalSupply()).to.equal(1);
    });
    
    it("Should allow batch minting during public sale", async function () {
      await advancedNFT.connect(addr1).publicMint(
        3,
        { value: ethers.utils.parseEther("0.24") } // 0.08 * 3
      );
      
      expect(await advancedNFT.balanceOf(addr1.address)).to.equal(3);
      expect(await advancedNFT.totalSupply()).to.equal(3);
      
      // Check sequential token IDs
      expect(await advancedNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await advancedNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await advancedNFT.ownerOf(2)).to.equal(addr1.address);
    });
    
    it("Should not allow minting with insufficient funds", async function () {
      await expect(
        advancedNFT.connect(addr1).publicMint(
          1,
          { value: ethers.utils.parseEther("0.05") }
        )
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Commit-Reveal Scheme", function () {
    beforeEach(async function () {
      // Mint a token for testing
      await advancedNFT.setState(2); // PublicSale
      
      await advancedNFT.connect(addr1).publicMint(
        1,
        { value: ethers.utils.parseEther("0.08") }
      );
    });
    
    it("Should return unrevealed tokenURI before reveal", async function () {
      const tokenURI = await advancedNFT.tokenURI(0);
      expect(tokenURI).to.equal("https://whocares.wtf/api/token/unrevealed");
    });
    
    it("Should allow users to submit a commit", async function () {
      const secret = ethers.utils.formatBytes32String("secret");
      
      // Calculate commitment hash manually
      const commitmentHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, secret]
      );
      
      // Submit commitment
      await advancedNFT.connect(addr1).commit(commitmentHash);
      
      // Verify commitment was stored
      const commitment = await advancedNFT.commitments(addr1.address);
      expect(commitment.commit).to.equal(commitmentHash);
      expect(commitment.isRevealed).to.equal(false);
    });
    
    it("Should not allow reveal before BLOCKS_FOR_REVEAL blocks", async function () {
      const secret = ethers.utils.formatBytes32String("secret");
      
      // Calculate commitment hash manually
      const commitmentHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, secret]
      );
      
      // Submit commitment
      await advancedNFT.connect(addr1).commit(commitmentHash);
      
      // Try to reveal immediately
      await expect(
        advancedNFT.connect(addr1).reveal(secret)
      ).to.be.revertedWith("Not enough blocks passed");
    });
    
    it("Should not allow non-committer to reveal", async function () {
      const secret = ethers.utils.formatBytes32String("secret");
      
      // Calculate commitment hash manually
      const commitmentHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, secret]
      );
      
      // Submit commitment
      await advancedNFT.connect(addr1).commit(commitmentHash);
      
      // Wait for blocks
      await waitForBlocks(10);
      
      // Try to reveal from a different address
      await expect(
        advancedNFT.connect(addr2).reveal(secret)
      ).to.be.revertedWith("Not committed");
    });
    
    it("Should allow reveal after BLOCKS_FOR_REVEAL blocks and update state", async function () {
      const secret = ethers.utils.formatBytes32String("secret");
      
      // Calculate commitment hash manually
      const commitmentHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, secret]
      );
      
      // Submit commitment
      await advancedNFT.connect(addr1).commit(commitmentHash);
      
      // Wait for blocks
      await waitForBlocks(10);
      
      // Reveal
      await advancedNFT.connect(addr1).reveal(secret);
      
      // Check state was updated
      expect(await advancedNFT.state()).to.equal(4); // State.Revealed
      
      // Check commitment was marked as revealed
      const commitment = await advancedNFT.commitments(addr1.address);
      expect(commitment.isRevealed).to.equal(true);
      
      // Check new token was minted
      expect(await advancedNFT.totalSupply()).to.equal(2);
      expect(await advancedNFT.balanceOf(addr1.address)).to.equal(2);
    });
  });

  describe("Multicall", function () {
    beforeEach(async function () {
      await advancedNFT.setState(2); // PublicSale
      
      // Mint some tokens to addr1
      await advancedNFT.connect(addr1).publicMint(
        3,
        { value: ethers.utils.parseEther("0.24") }
      );
    });
    
    it("Should handle multiple transfers in one multicall", async function () {
      // Encode transfer calls
      const transferData1 = await advancedNFT.connect(addr1).getTransferData(addr2.address, 0);
      const transferData2 = await advancedNFT.connect(addr1).getTransferData(addr2.address, 1);
      
      // Execute multicall
      await advancedNFT.connect(addr1).multicall([transferData1, transferData2]);
      
      // Verify transfers
      expect(await advancedNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await advancedNFT.balanceOf(addr2.address)).to.equal(2);
      expect(await advancedNFT.ownerOf(0)).to.equal(addr2.address);
      expect(await advancedNFT.ownerOf(1)).to.equal(addr2.address);
      expect(await advancedNFT.ownerOf(2)).to.equal(addr1.address);
    });
    
    it("Should provide helper function for transfer data", async function () {
      // Test the getTransferData helper
      const transferData = await advancedNFT.connect(addr1).getTransferData(addr2.address, 0);
      
      // Execute the transfer using multicall
      await advancedNFT.connect(addr1).multicall([transferData]);
      
      // Verify the transfer
      expect(await advancedNFT.ownerOf(0)).to.equal(addr2.address);
    });
    
    it("Should process calls in batch to save gas", async function () {
      // Generate transfer calls
      const transferData1 = await advancedNFT.connect(addr1).getTransferData(addr2.address, 0);
      const transferData2 = await advancedNFT.connect(addr1).getTransferData(addr2.address, 1);
      
      // Execute and measure gas
      const tx = await advancedNFT.connect(addr1).multicall([transferData1, transferData2]);
      const receipt = await tx.wait();
      
      console.log(`Gas used for batch transfer of 2 tokens: ${receipt.gasUsed.toString()}`);
    });
  });

  describe("Contributor Management and Withdrawals", function () {
    beforeEach(async function () {
      await advancedNFT.setState(2); // PublicSale
      
      // Mint some tokens to generate revenue
      await advancedNFT.connect(addr1).publicMint(
        3,
        { value: ethers.utils.parseEther("0.24") }
      );
    });
    
    it("Should add contributors correctly", async function () {
      // Remove the owner first
      await advancedNFT.removeContributor(owner.address);
      
      // Add two contributors
      await advancedNFT.addContributor(addr1.address, 3000); // 30%
      await advancedNFT.addContributor(addr2.address, 7000); // 70%
      
      // Check total shares
      expect(await advancedNFT.totalShares()).to.equal(10000);
    });
    
    it("Should allocate and withdraw funds correctly", async function () {
      // Setup contributors
      await advancedNFT.removeContributor(owner.address);
      await advancedNFT.addContributor(addr1.address, 5000); // 50%
      await advancedNFT.addContributor(addr2.address, 5000); // 50%
      
      // Track initial balances
      const initialBalance1 = await ethers.provider.getBalance(addr1.address);
      const initialBalance2 = await ethers.provider.getBalance(addr2.address);
      
      // Allocate funds
      await advancedNFT.allocateFunds();
      
      // Check pending withdrawals
      const pending1 = await advancedNFT.pendingWithdrawals(addr1.address);
      const pending2 = await advancedNFT.pendingWithdrawals(addr2.address);
      
      expect(pending1).to.equal(ethers.utils.parseEther("0.12")); // 50% of 0.24 ETH
      expect(pending2).to.equal(ethers.utils.parseEther("0.12")); // 50% of 0.24 ETH
      
      // Execute withdrawals
      await advancedNFT.connect(addr1).withdraw();
      await advancedNFT.connect(addr2).withdraw();
      
      // Check final balances
      const finalBalance1 = await ethers.provider.getBalance(addr1.address);
      const finalBalance2 = await ethers.provider.getBalance(addr2.address);
      
      // Allow for gas costs in the check
      expect(finalBalance1.sub(initialBalance1)).to.be.gt(ethers.utils.parseEther("0.119"));
      expect(finalBalance2.sub(initialBalance2)).to.be.gt(ethers.utils.parseEther("0.119"));
      
      // Ensure withdrawals are reset
      expect(await advancedNFT.pendingWithdrawals(addr1.address)).to.equal(0);
      expect(await advancedNFT.pendingWithdrawals(addr2.address)).to.equal(0);
    });
  });
}); 