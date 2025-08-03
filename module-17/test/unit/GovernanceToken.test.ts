import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("GovernanceToken", function () {
  // Fixture for test setup
  async function deployTokenFixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(owner.address);
    
    // Mint initial supply
    await token.mint(owner.address, ethers.parseEther("10000000"));
    
    return { token, owner, alice, bob, charlie };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.name()).to.equal("DAO Token");
      expect(await token.symbol()).to.equal("DAO");
    });

    it("Should mint initial supply to deployer", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      const balance = await token.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther("10000000"));
      
      // Check total minted
      expect(await token.totalMinted()).to.equal(ethers.parseEther("10000000"));
    });

    it("Should have 18 decimals", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.decimals()).to.equal(18);
    });
  });

  describe("ERC20 Functionality", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, alice } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, amount);
      
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("Should fail to transfer more than balance", async function () {
      const { token, alice } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await expect(
        token.connect(alice).transfer(alice.address, amount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("Should handle approvals correctly", async function () {
      const { token, owner, alice } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await expect(token.approve(alice.address, amount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, alice.address, amount);
      
      expect(
        await token.allowance(owner.address, alice.address)
      ).to.equal(amount);
    });

    it("Should handle transferFrom correctly", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await token.approve(alice.address, amount);
      
      await expect(
        token.connect(alice).transferFrom(owner.address, bob.address, amount)
      )
        .to.emit(token, "Transfer")
        .withArgs(owner.address, bob.address, amount);
      
      expect(await token.balanceOf(bob.address)).to.equal(amount);
    });
  });

  describe("Voting Power (ERC20Votes)", function () {
    it("Should have zero votes before delegation", async function () {
      const { token, alice } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await token.transfer(alice.address, amount);
      
      // Alice has tokens but hasn't delegated
      expect(await token.getVotes(alice.address)).to.equal(0);
    });

    it("Should delegate voting power to self", async function () {
      const { token, alice } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await token.transfer(alice.address, amount);
      
      await expect(token.connect(alice).delegate(alice.address))
        .to.emit(token, "DelegateChanged")
        .withArgs(alice.address, ethers.ZeroAddress, alice.address);
      
      expect(await token.getVotes(alice.address)).to.equal(amount);
    });

    it("Should delegate voting power to others", async function () {
      const { token, alice, bob } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      await token.transfer(alice.address, amount);
      
      // Alice delegates to Bob
      await token.connect(alice).delegate(bob.address);
      
      expect(await token.getVotes(alice.address)).to.equal(0);
      expect(await token.getVotes(bob.address)).to.equal(amount);
    });

    it("Should track voting power checkpoints", async function () {
      const { token, alice } = await loadFixture(deployTokenFixture);
      
      // Setup
      await token.transfer(alice.address, ethers.parseEther("100"));
      await token.connect(alice).delegate(alice.address);
      
      const block1 = await ethers.provider.getBlockNumber();
      
      // Transfer more tokens and mine a block
      await token.transfer(alice.address, ethers.parseEther("50"));
      await ethers.provider.send("evm_mine", []); // Mine a block to finalize
      
      const block2 = await ethers.provider.getBlockNumber();
      
      // Check past votes (use block1 which is now in the past)
      expect(
        await token.getPastVotes(alice.address, block1)
      ).to.equal(ethers.parseEther("100"));
      
      // For block2-1 (the block where the transfer happened)
      expect(
        await token.getPastVotes(alice.address, block2 - 1)
      ).to.equal(ethers.parseEther("150"));
    });

    it("Should update votes on transfer", async function () {
      const { token, alice, bob } = await loadFixture(deployTokenFixture);
      
      // Setup: Alice has delegated tokens
      await token.transfer(alice.address, ethers.parseEther("100"));
      await token.connect(alice).delegate(alice.address);
      
      expect(await token.getVotes(alice.address)).to.equal(ethers.parseEther("100"));
      
      // Transfer half to Bob
      await token.connect(alice).transfer(bob.address, ethers.parseEther("50"));
      
      expect(await token.getVotes(alice.address)).to.equal(ethers.parseEther("50"));
      expect(await token.getVotes(bob.address)).to.equal(0); // Bob hasn't delegated
    });

    it("Should handle delegation changes correctly", async function () {
      const { token, alice, bob, charlie } = await loadFixture(deployTokenFixture);
      
      await token.transfer(alice.address, ethers.parseEther("100"));
      
      // Delegate to Bob
      await token.connect(alice).delegate(bob.address);
      expect(await token.getVotes(bob.address)).to.equal(ethers.parseEther("100"));
      
      // Change delegation to Charlie
      await token.connect(alice).delegate(charlie.address);
      expect(await token.getVotes(bob.address)).to.equal(0);
      expect(await token.getVotes(charlie.address)).to.equal(ethers.parseEther("100"));
    });
  });

  describe("ERC20Permit", function () {
    it("Should support gasless approvals via permit", async function () {
      const { token, owner, alice } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      const deadline = (await time.latest()) + 3600; // 1 hour
      
      // Create permit signature
      const domain = {
        name: await token.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress()
      };
      
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const value = {
        owner: owner.address,
        spender: alice.address,
        value: amount,
        nonce: await token.nonces(owner.address),
        deadline: deadline
      };
      
      const signature = await owner.signTypedData(domain, types, value);
      const { v, r, s } = ethers.Signature.from(signature);
      
      // Alice can set approval using owner's signature
      await token.connect(alice).permit(
        owner.address,
        alice.address,
        amount,
        deadline,
        v,
        r,
        s
      );
      
      expect(
        await token.allowance(owner.address, alice.address)
      ).to.equal(amount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      const { token, owner, alice } = await loadFixture(deployTokenFixture);
      
      await expect(token.transfer(alice.address, 0))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, 0);
    });

    it("Should handle delegation to zero address", async function () {
      const { token, alice } = await loadFixture(deployTokenFixture);
      
      await token.transfer(alice.address, ethers.parseEther("100"));
      await token.connect(alice).delegate(alice.address);
      
      // Delegate to zero address (remove delegation)
      await token.connect(alice).delegate(ethers.ZeroAddress);
      expect(await token.getVotes(alice.address)).to.equal(0);
    });

    it("Should track total supply correctly", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("10000000"));
    });
  });
});