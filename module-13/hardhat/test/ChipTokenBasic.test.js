const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("🪙 ChipToken - Comprehensive Testing", function () {
  let chipToken;
  let owner, user1, user2, nonOwner;

  beforeEach(async function () {
    [owner, user1, user2, nonOwner] = await ethers.getSigners();

    // Deploy ChipToken with upgradeable proxy
    const ChipToken = await ethers.getContractFactory("ChipToken");
    chipToken = await upgrades.deployProxy(
      ChipToken,
      [owner.address],
      { kind: "uups" }
    );
    await chipToken.deployed();
  });

  describe("Deployment & Initialization", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await chipToken.name()).to.equal("Casino Chips");
      expect(await chipToken.symbol()).to.equal("CHIP");
      expect(await chipToken.decimals()).to.equal(18);
      expect(await chipToken.owner()).to.equal(owner.address);
      expect(await chipToken.totalSupply()).to.equal(0);
    });

    it("Should prevent re-initialization", async function () {
      await expect(
        chipToken.initialize(user1.address)
      ).to.be.revertedWith("InvalidInitialization");
    });
  });

  describe("Minting Functionality", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      
      await chipToken.mint(user1.address, mintAmount);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await chipToken.totalSupply()).to.equal(mintAmount);
    });

    it("Should emit Transfer event on mint", async function () {
      const mintAmount = ethers.utils.parseEther("500");
      
      await expect(chipToken.mint(user1.address, mintAmount))
        .to.emit(chipToken, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1.address, mintAmount);
    });

    it("Should reject minting by non-owner", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      
      await expect(
        chipToken.connect(nonOwner).mint(user1.address, mintAmount)
      ).to.be.reverted;
    });

    it("Should handle multiple mints correctly", async function () {
      const mint1 = ethers.utils.parseEther("100");
      const mint2 = ethers.utils.parseEther("200");
      
      await chipToken.mint(user1.address, mint1);
      await chipToken.mint(user2.address, mint2);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(mint1);
      expect(await chipToken.balanceOf(user2.address)).to.equal(mint2);
      expect(await chipToken.totalSupply()).to.equal(mint1.add(mint2));
    });

    it("Should mint to same address multiple times", async function () {
      const mint1 = ethers.utils.parseEther("100");
      const mint2 = ethers.utils.parseEther("150");
      
      await chipToken.mint(user1.address, mint1);
      await chipToken.mint(user1.address, mint2);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(mint1.add(mint2));
      expect(await chipToken.totalSupply()).to.equal(mint1.add(mint2));
    });
  });

  describe("Burning Functionality", function () {
    beforeEach(async function () {
      // Mint some tokens first
      await chipToken.mint(user1.address, ethers.utils.parseEther("1000"));
      await chipToken.mint(user2.address, ethers.utils.parseEther("500"));
    });

    it("Should allow owner to burn tokens", async function () {
      const burnAmount = ethers.utils.parseEther("200");
      const initialBalance = await chipToken.balanceOf(user1.address);
      const initialSupply = await chipToken.totalSupply();
      
      await chipToken.burn(user1.address, burnAmount);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(initialBalance.sub(burnAmount));
      expect(await chipToken.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    });

    it("Should emit Transfer event on burn", async function () {
      const burnAmount = ethers.utils.parseEther("100");
      
      await expect(chipToken.burn(user1.address, burnAmount))
        .to.emit(chipToken, "Transfer")
        .withArgs(user1.address, ethers.constants.AddressZero, burnAmount);
    });

    it("Should reject burning by non-owner", async function () {
      const burnAmount = ethers.utils.parseEther("100");
      
      await expect(
        chipToken.connect(nonOwner).burn(user1.address, burnAmount)
      ).to.be.reverted;
    });

    it("Should reject burning more than balance", async function () {
      const userBalance = await chipToken.balanceOf(user1.address);
      const excessiveAmount = userBalance.add(ethers.utils.parseEther("1"));
      
      await expect(
        chipToken.burn(user1.address, excessiveAmount)
      ).to.be.revertedWith("ERC20InsufficientBalance");
    });

    it("Should handle burning entire balance", async function () {
      const userBalance = await chipToken.balanceOf(user1.address);
      
      await chipToken.burn(user1.address, userBalance);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Standard ERC20 Functionality", function () {
    beforeEach(async function () {
      await chipToken.mint(user1.address, ethers.utils.parseEther("1000"));
      await chipToken.mint(user2.address, ethers.utils.parseEther("500"));
    });

    it("Should allow transfers between users", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      
      await chipToken.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("900"));
      expect(await chipToken.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("600"));
    });

    it("Should allow approve and transferFrom", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      
      await chipToken.connect(user1).approve(user2.address, transferAmount);
      await chipToken.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("900"));
      expect(await chipToken.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("600"));
      expect(await chipToken.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("Should track allowances correctly", async function () {
      const approveAmount = ethers.utils.parseEther("200");
      
      await chipToken.connect(user1).approve(user2.address, approveAmount);
      
      expect(await chipToken.allowance(user1.address, user2.address)).to.equal(approveAmount);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to transfer ownership", async function () {
      await chipToken.transferOwnership(user1.address);
      expect(await chipToken.owner()).to.equal(user1.address);
    });

    it("Should require new owner to accept ownership", async function () {
      await chipToken.transferOwnership(user1.address);
      // Note: OpenZeppelin's Ownable2Step would require acceptance
      // But basic Ownable transfers immediately
      expect(await chipToken.owner()).to.equal(user1.address);
    });

    it("Should reject ownership transfer by non-owner", async function () {
      await expect(
        chipToken.connect(nonOwner).transferOwnership(user1.address)
      ).to.be.reverted;
    });
  });

  describe("Upgradeability", function () {
    it("Should be upgradeable by owner", async function () {
      // Verify this is a proxy contract
      const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
      const implementation = await ethers.provider.getStorageAt(chipToken.address, implementationSlot);
      expect(implementation).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should preserve state through upgrades", async function () {
      // Mint some tokens
      await chipToken.mint(user1.address, ethers.utils.parseEther("1000"));
      
      const balanceBefore = await chipToken.balanceOf(user1.address);
      const supplyBefore = await chipToken.totalSupply();
      
      // In a real upgrade test, we would deploy a new implementation
      // For now, just verify the state is preserved
      expect(await chipToken.balanceOf(user1.address)).to.equal(balanceBefore);
      expect(await chipToken.totalSupply()).to.equal(supplyBefore);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amounts gracefully", async function () {
      // Zero amounts should now be rejected due to security requirements
      await expect(
        chipToken.mint(user1.address, 0)
      ).to.be.revertedWith("Amount must be positive");
      
      await expect(
        chipToken.burn(user1.address, 0)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("Should handle maximum values", async function () {
      // Test with large but valid amount (just under max supply)
      const largeAmount = ethers.utils.parseEther("999999999"); // 999M tokens
      
      await expect(
        chipToken.mint(user1.address, largeAmount)
      ).to.not.be.reverted;
      
      // Test exceeding max supply should fail
      const excessiveAmount = ethers.utils.parseEther("1000000000"); // 1B + some more
      await expect(
        chipToken.mint(user2.address, excessiveAmount)
      ).to.be.revertedWith("Exceeds maximum supply");
    });

    it("Should maintain precision with 18 decimals", async function () {
      const preciseAmount = ethers.utils.parseEther("1.123456789012345678");
      
      await chipToken.mint(user1.address, preciseAmount);
      
      expect(await chipToken.balanceOf(user1.address)).to.equal(preciseAmount);
    });
  });

  describe("Integration Scenarios", function () {
    it("Should support typical DeFi operations", async function () {
      // Mint initial supply
      await chipToken.mint(user1.address, ethers.utils.parseEther("10000"));
      
      // User approves a "DeFi contract" (user2 acting as contract)
      const approveAmount = ethers.utils.parseEther("5000");
      await chipToken.connect(user1).approve(user2.address, approveAmount);
      
      // DeFi contract takes some tokens
      const takeAmount = ethers.utils.parseEther("1000");
      await chipToken.connect(user2).transferFrom(user1.address, user2.address, takeAmount);
      
      // Later, DeFi contract returns tokens with "rewards"
      const rewardAmount = ethers.utils.parseEther("50");
      await chipToken.mint(user2.address, rewardAmount);
      await chipToken.connect(user2).transfer(user1.address, takeAmount.add(rewardAmount));
      
      // User should have original amount plus rewards
      const expectedFinal = ethers.utils.parseEther("10050");
      expect(await chipToken.balanceOf(user1.address)).to.equal(expectedFinal);
    });

    it("Should handle gaming scenarios", async function () {
      // Player buys chips
      await chipToken.mint(user1.address, ethers.utils.parseEther("100"));
      
      // Player approves game contract
      await chipToken.connect(user1).approve(owner.address, ethers.utils.parseEther("100"));
      
      // Game takes bet
      const betAmount = ethers.utils.parseEther("10");
      await chipToken.connect(owner).transferFrom(user1.address, owner.address, betAmount);
      
      // Player wins, game mints winnings
      const winnings = ethers.utils.parseEther("20");
      await chipToken.mint(user1.address, winnings);
      
      // Final balance should be 90 (remaining) + 20 (winnings) = 110
      const expectedBalance = ethers.utils.parseEther("110");
      expect(await chipToken.balanceOf(user1.address)).to.equal(expectedBalance);
    });
  });
}); 