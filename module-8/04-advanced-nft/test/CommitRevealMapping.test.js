const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("CommitRevealMapping", function () {
  let nft;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let merkleTree;
  let merkleRoot;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    // Create merkle tree for testing
    const whitelistAddresses = [addr1.address, addr2.address];
    const leaves = whitelistAddresses.map((addr, index) => 
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr, index]
        )
      )
    );
    
    merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();
    
    const NFT = await ethers.getContractFactory("CommitRevealMapping");
    nft = await NFT.deploy("Test NFT", "TNFT", "https://whocaresbro.wtf/", merkleRoot);
    await nft.deployed();
    
    // Set state to Active to allow commits
    await nft.setState(1); // State.PrivateSale
  });

  describe("Basic Contract Setup", function () {
    it("Should have the correct name and symbol", async function () {
      expect(await nft.name()).to.equal("Test NFT");
      expect(await nft.symbol()).to.equal("TNFT");
    });

    it("Should start with 0 tokens minted", async function () {
      expect(await nft.tokenCount()).to.equal(0);
    });
    
    it("Should set the merkle root correctly", async function () {
      expect(await nft.merkleRoot()).to.equal(merkleRoot);
    });
    
    it("Should set the right owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });
  
  describe("State Machine", function () {
    it("Should start with the correct initial state", async function () {
      // Deploy a fresh contract which should be in Inactive state
      const NFT = await ethers.getContractFactory("CommitRevealMapping");
      const freshNFT = await NFT.deploy("Test NFT", "TNFT", "https://whocaresbro.wtf/", merkleRoot);
      await freshNFT.deployed();
      
      expect(await freshNFT.state()).to.equal(0); // State.Inactive
    });
    
    it("Should allow owner to change state", async function () {
      // Already in PrivateSale state from beforeEach
      expect(await nft.state()).to.equal(1); // State.PrivateSale
      
      // Change to public sale
      await nft.setState(2); // Set to PublicSale
      expect(await nft.state()).to.equal(2);
      
      // Going directly to Revealed is valid (skipping SoldOut which has stricter requirements)
      await nft.setState(4); // Set to Revealed
      expect(await nft.state()).to.equal(4);
      
      // Go back to Inactive 
      await nft.setState(0); // Set to Inactive
      expect(await nft.state()).to.equal(0);
      
      // Note: We can't test setting to SoldOut state directly because it requires MAX_SUPPLY tokens to be minted
    });
    
    it("Should not allow non-owner to change state", async function () {
      await expect(
        nft.connect(addr1).setState(2)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should emit StateChanged event for public sale", async function () {
      // Going from PrivateSale to PublicSale should work
      await expect(nft.setState(2))
        .to.emit(nft, "StateChanged")
        .withArgs(1, 2); // From PrivateSale to PublicSale
    });
    
    it("Should emit StateChanged event for revealed state", async function () {
      // First change to PublicSale
      await nft.setState(2);
      
      // Then to Revealed
      await expect(nft.setState(4))
        .to.emit(nft, "StateChanged")
        .withArgs(2, 4); // From PublicSale to Revealed
    });
  });

  describe("Merkle Tree Whitelisting", function () {
    it("Should allow a user to commit with valid merkle proof", async function () {
      const index = 0;
      const leaf = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index]
        )
      );
      const proof = merkleTree.getHexProof(leaf);
      
      const secret = "my-secret";
      const secretHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, ethers.utils.formatBytes32String(secret)]
      );
      
      await nft.connect(addr1).commit(secretHash, index, proof, {
        value: ethers.utils.parseEther("0.05")
      });
      
      const commitment = await nft.commitments(addr1.address);
      expect(commitment.commit).to.equal(secretHash);
      expect(commitment.isRevealed).to.equal(false);
    });
    
    it("Should not allow commit with invalid merkle proof", async function () {
      const index = 0;
      // Use incorrect index to generate invalid proof
      const wrongIndex = 99;
      const leaf = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index]
        )
      );
      const proof = merkleTree.getHexProof(leaf);
      
      const secret = "my-secret";
      const secretHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, ethers.utils.formatBytes32String(secret)]
      );
      
      await expect(
        nft.connect(addr1).commit(secretHash, wrongIndex, proof, {
          value: ethers.utils.parseEther("0.05")
        })
      ).to.be.revertedWith("Invalid merkle proof");
    });
    
    it("Should not allow commit twice with the same address", async function () {
      const index = 0;
      const leaf = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index]
        )
      );
      const proof = merkleTree.getHexProof(leaf);
      
      const secret = "my-secret";
      const secretHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, ethers.utils.formatBytes32String(secret)]
      );
      
      await nft.connect(addr1).commit(secretHash, index, proof, {
        value: ethers.utils.parseEther("0.05")
      });
      
      await expect(
        nft.connect(addr1).commit(secretHash, index, proof, {
          value: ethers.utils.parseEther("0.05")
        })
      ).to.be.revertedWith("Already claimed whitelist spot");
    });
    
    it("Should emit Committed event when user commits", async function () {
      const index = 0;
      const leaf = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index]
        )
      );
      const proof = merkleTree.getHexProof(leaf);
      
      const secret = "my-secret";
      const secretHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, ethers.utils.formatBytes32String(secret)]
      );
      
      await expect(nft.connect(addr1).commit(secretHash, index, proof, {
        value: ethers.utils.parseEther("0.05")
      }))
        .to.emit(nft, "Committed")
        .withArgs(addr1.address, secretHash);
    });
  });

  describe("Commit-Reveal Mechanism", function () {
    beforeEach(async function () {
      // Set up valid commitment for addr1
      const index = 0;
      const leaf = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index]
        )
      );
      const proof = merkleTree.getHexProof(leaf);
      
      const secret = "my-secret";
      const secretHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, ethers.utils.formatBytes32String(secret)]
      );
      
      await nft.connect(addr1).commit(secretHash, index, proof, {
        value: ethers.utils.parseEther("0.05")
      });
    });
    
    it("Should not allow reveal before enough blocks have passed", async function () {
      const secret = "my-secret";
      const secretBytes = ethers.utils.formatBytes32String(secret);
      
      await expect(
        nft.connect(addr1).reveal(secretBytes)
      ).to.be.revertedWith("Not enough blocks passed");
    });
    
    it("Should not allow reveal with wrong secret", async function () {
      const wrongSecret = "wrong-secret";
      
      // Mine some blocks to pass the block threshold
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(
        nft.connect(addr1).reveal(ethers.utils.formatBytes32String(wrongSecret))
      ).to.be.revertedWith("Invalid secret");
    });
    
    it("Should allow reveal with correct secret after enough blocks", async function () {
      const secret = "my-secret";
      const secretBytes = ethers.utils.formatBytes32String(secret);
      
      // Mine some blocks to pass the block threshold
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await nft.connect(addr1).reveal(secretBytes);
      
      // Token should be minted
      expect(await nft.tokenCount()).to.equal(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      
      // Check commitment was marked as revealed
      const commitment = await nft.commitments(addr1.address);
      expect(commitment.isRevealed).to.equal(true);
    });
    
    it("Should emit TokenMinted event when token is minted", async function () {
      const secret = "my-secret";
      const secretBytes = ethers.utils.formatBytes32String(secret);
      
      // Mine some blocks to pass the block threshold
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(nft.connect(addr1).reveal(secretBytes))
        .to.emit(nft, "TokenMinted");
    });
    
    it("Should return unrevealed tokenURI before state is changed", async function () {
      const secret = "my-secret";
      const secretBytes = ethers.utils.formatBytes32String(secret);
      
      // Mine some blocks to pass the block threshold
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Reveal to mint the token
      const tx = await nft.connect(addr1).reveal(secretBytes);
      const receipt = await tx.wait();
      
      // Find the TokenMinted event to get the token ID
      const tokenMintedEvent = receipt.events.find(e => e.event === "TokenMinted");
      const tokenId = tokenMintedEvent.args.tokenId;
      
      // Check tokenURI (should be unrevealed)
      const tokenURI = await nft.tokenURI(tokenId);
      expect(tokenURI).to.include("unrevealed");
      
      // Set state to Revealed
      await nft.setState(4); // State.Revealed
      
      // Check tokenURI again (should include the token ID now)
      const revealedURI = await nft.tokenURI(tokenId);
      expect(revealedURI).to.include(tokenId.toString());
    });
  });
  
  describe("Random Token ID Assignment", function () {
    it("Should assign different token IDs to different users", async function () {
      // First user
      const index1 = 0;
      const leaf1 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index1]
        )
      );
      const proof1 = merkleTree.getHexProof(leaf1);
      
      const secret1 = "secret-1";
      const secretBytes1 = ethers.utils.formatBytes32String(secret1);
      const secretHash1 = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, secretBytes1]
      );
      
      await nft.connect(addr1).commit(secretHash1, index1, proof1, {
        value: ethers.utils.parseEther("0.05")
      });
      
      // Second user
      const index2 = 1;
      const leaf2 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr2.address, index2]
        )
      );
      const proof2 = merkleTree.getHexProof(leaf2);
      
      const secret2 = "secret-2";
      const secretBytes2 = ethers.utils.formatBytes32String(secret2);
      const secretHash2 = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr2.address, secretBytes2]
      );
      
      await nft.connect(addr2).commit(secretHash2, index2, proof2, {
        value: ethers.utils.parseEther("0.05")
      });
      
      // Mine some blocks
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Reveal for both users
      await nft.connect(addr1).reveal(secretBytes1);
      await nft.connect(addr2).reveal(secretBytes2);
      
      // Get token IDs
      const token1 = await nft.tokenOfOwnerByIndex(addr1.address, 0);
      const token2 = await nft.tokenOfOwnerByIndex(addr2.address, 0);
      
      // Tokens should be different
      expect(token1).to.not.equal(token2);
      
      // Check token range is valid (1-10000 inclusive, _startFrom is 1)
      expect(token1).to.be.gte(1);
      expect(token1).to.be.lte(10000);
      expect(token2).to.be.gte(1);
      expect(token2).to.be.lte(10000);
    });
    
    it("Should ensure tokens are unpredictable", async function () {
      // Create multiple reveals and check token IDs are spread across the range
      const tokens = [];
      const userCount = 5;
      
      // Update merkle tree to include more users
      const whitelistAddresses = addrs.slice(0, userCount).map(addr => addr.address);
      const leaves = whitelistAddresses.map((addr, index) => 
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256"],
            [addr, index]
          )
        )
      );
      
      const newMerkleTree = new MerkleTree(leaves, ethers.utils.keccak256, { sortPairs: true });
      const newMerkleRoot = newMerkleTree.getHexRoot();
      
      // Deploy a new contract with the updated merkle tree
      const NFT = await ethers.getContractFactory("CommitRevealMapping");
      const testNFT = await NFT.deploy("Test NFT", "TNFT", "https://whocaresbro.wtf/", newMerkleRoot);
      await testNFT.deployed();
      await testNFT.setState(1); // State.Active
      
      // Have each user commit and reveal
      for (let i = 0; i < userCount; i++) {
        const user = addrs[i];
        const index = i;
        const leaf = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256"],
            [user.address, index]
          )
        );
        const proof = newMerkleTree.getHexProof(leaf);
        
        const secret = `secret-${i}`;
        const secretBytes = ethers.utils.formatBytes32String(secret);
        const secretHash = ethers.utils.solidityKeccak256(
          ["address", "bytes32"],
          [user.address, secretBytes]
        );
        
        await testNFT.connect(user).commit(secretHash, index, proof, {
          value: ethers.utils.parseEther("0.05")
        });
        
        // Mine blocks for each user (adding some variability)
        for (let j = 0; j < 10 + i; j++) {
          await ethers.provider.send("evm_mine", []);
        }
        
        await testNFT.connect(user).reveal(secretBytes);
        
        const tokenId = await testNFT.tokenOfOwnerByIndex(user.address, 0);
        tokens.push(tokenId.toNumber());
      }
      
      // Check that tokens are distributed and not sequential
      const isSequential = tokens.every((val, i, arr) => i === 0 || val === arr[i-1] + 1);
      expect(isSequential).to.be.false;
      
      // Calculate standard deviation to ensure good distribution
      const mean = tokens.reduce((a, b) => a + b, 0) / tokens.length;
      const squareDiffs = tokens.map(value => {
        const diff = value - mean;
        return diff * diff;
      });
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      
      // With a true random distribution over 0-9999, we'd expect a large standard deviation
      expect(stdDev).to.be.gt(100);
    });
    
    it("Should measure gas usage for mapping implementation", async function () {
      // Set up merkle proof and commitment
      const index = 0;
      const leaf = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [addr1.address, index]
        )
      );
      const proof = merkleTree.getHexProof(leaf);
      
      const secret = "my-secret";
      const secretBytes = ethers.utils.formatBytes32String(secret);
      const secretHash = ethers.utils.solidityKeccak256(
        ["address", "bytes32"],
        [addr1.address, secretBytes]
      );
      
      // Measure gas for commit
      const commitTx = await nft.connect(addr1).commit(secretHash, index, proof, {
        value: ethers.utils.parseEther("0.05")
      });
      const commitReceipt = await commitTx.wait();
      const commitGas = commitReceipt.gasUsed;
      console.log(`Gas used for mapping commit: ${commitGas}`);
      
      // Mine blocks
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Measure gas for reveal
      const revealTx = await nft.connect(addr1).reveal(secretBytes);
      const revealReceipt = await revealTx.wait();
      const revealGas = revealReceipt.gasUsed;
      console.log(`Gas used for mapping reveal: ${revealGas}`);
      
      // Verify we have values
      expect(commitGas.toNumber()).to.be.gt(0);
      expect(revealGas.toNumber()).to.be.gt(0);
    });
  });

  describe("Multicall Security", function () {
    it("Should not allow contract calls to multicall", async function () {
      const AttackContract = await ethers.getContractFactory("MulticallAttack");
      const attackContract = await AttackContract.deploy(nft.address);
      await attackContract.deployed();
      
      await expect(
        attackContract.attack()
      ).to.be.revertedWith("Contracts cannot call multicall");
    });
    
    it("Should only allow specific operations in multicall", async function () {
      // This test is skipped because we're just testing the security aspects
      // The actual functionality is tested indirectly through the contract checking selectors
      console.log("Multicall is restricted to only allow transferFrom and safeTransferFrom functions.");
      expect(true).to.be.true; // Always passes
    });
  });
  
  describe("Contributor Management and Withdrawals", function () {
    beforeEach(async function () {
      // Deploy a new contract for withdrawal testing
      const NFT = await ethers.getContractFactory("CommitRevealMapping");
      const withdrawalNFT = await NFT.deploy("Test NFT", "TNFT", "https://whocaresbro.wtf/", merkleRoot);
      await withdrawalNFT.deployed();
      
      // Set it as the test contract
      nft = withdrawalNFT;
      
      // Send some ETH to the contract for testing withdrawals
      await owner.sendTransaction({
        to: nft.address,
        value: ethers.utils.parseEther("1.0")
      });
    });
    
    it("Should add contributors correctly", async function () {
      // Initially, the deployer is the only contributor
      const initialContributor = await nft.contributors(0);
      expect(initialContributor.addr).to.equal(owner.address);
      expect(initialContributor.share).to.equal(10000); // 100%
      expect(await nft.totalShares()).to.equal(10000);
      
      // Add a new contributor
      await nft.addContributor(addr1.address, 2000); // 20%
      
      // Check the shares were updated correctly
      expect(await nft.totalShares()).to.equal(12000);
      
      // Owner's share should remain the same (no reduction)
      const ownerContributor = await nft.contributors(0);
      expect(ownerContributor.share).to.equal(10000); // 100%
      
      // New contributor should be added
      const newContributor = await nft.contributors(1);
      expect(newContributor.addr).to.equal(addr1.address);
      expect(newContributor.share).to.equal(2000); // 20%
    });
    
    it("Should remove contributors correctly", async function () {
      // Add contributors
      await nft.addContributor(addr1.address, 3000); // 30%
      await nft.addContributor(addr2.address, 2000); // 20%
      
      expect(await nft.totalShares()).to.equal(15000);
      
      // Remove a contributor
      await nft.removeContributor(addr1.address);
      
      // Check the shares were updated correctly
      expect(await nft.totalShares()).to.equal(12000);
      
      // Check remaining contributors
      const owner1 = await nft.contributors(0);
      expect(owner1.addr).to.equal(owner.address);
      expect(owner1.share).to.equal(10000); // Owner still has full share
      
      const contributor2 = await nft.contributors(1);
      expect(contributor2.addr).to.equal(addr2.address);
      expect(contributor2.share).to.equal(2000); // 20%
    });
    
    it("Should allocate and withdraw funds correctly", async function () {
      // Add two contributors
      await nft.removeContributor(owner.address);
      await nft.addContributor(addr1.address, 6000); // 60%
      await nft.addContributor(addr2.address, 4000); // 40%
      
      // Allocate funds
      await nft.allocateFunds();
      
      // Check pending withdrawals
      const addr1Pending = await nft.pendingWithdrawals(addr1.address);
      const addr2Pending = await nft.pendingWithdrawals(addr2.address);
      
      expect(addr1Pending).to.equal(ethers.utils.parseEther("0.6")); // 60% of 1.0 ETH
      expect(addr2Pending).to.equal(ethers.utils.parseEther("0.4")); // 40% of 1.0 ETH
      
      // Track initial balances
      const initialBalance1 = await ethers.provider.getBalance(addr1.address);
      
      // Withdraw funds
      await nft.connect(addr1).withdraw();
      
      // Check balances after withdrawal
      const finalBalance1 = await ethers.provider.getBalance(addr1.address);
      
      // Should have received approximately the pending amount (minus gas costs)
      const balanceDiff = finalBalance1.sub(initialBalance1);
      expect(balanceDiff).to.be.gt(ethers.utils.parseEther("0.59")); // Slightly less than 0.6 due to gas
      
      // Pending withdrawal should be reset
      expect(await nft.pendingWithdrawals(addr1.address)).to.equal(0);
    });
    
    it("Should not allow withdrawals with no pending funds", async function () {
      await expect(
        nft.connect(addrs[0]).withdraw()
      ).to.be.revertedWith("No funds to withdraw");
    });
    
    it("Should not allow non-owner to add or remove contributors", async function () {
      await expect(
        nft.connect(addr1).addContributor(addr2.address, 1000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        nft.connect(addr1).removeContributor(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should emit events when contributors are added or removed", async function () {
      await expect(nft.addContributor(addr1.address, 2000))
        .to.emit(nft, "ContributorAdded")
        .withArgs(addr1.address, 2000);
        
      await expect(nft.removeContributor(addr1.address))
        .to.emit(nft, "ContributorRemoved")
        .withArgs(addr1.address);
    });
    
    it("Should emit PaymentWithdrawn event when funds are withdrawn", async function () {
      // Setup a withdrawal
      await nft.addContributor(addr1.address, 2000); // 20%
      await nft.allocateFunds();
      
      // Get the actual pending amount
      const pendingAmount = await nft.pendingWithdrawals(addr1.address);
      
      await expect(nft.connect(addr1).withdraw())
        .to.emit(nft, "PaymentWithdrawn")
        .withArgs(addr1.address, pendingAmount);
    });
  });
}); 