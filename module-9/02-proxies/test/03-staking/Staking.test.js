const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Staking System", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy Token
    const StakingVisageToken = await ethers.getContractFactory("StakingVisageToken");
    const token = await upgrades.deployProxy(StakingVisageToken, [await owner.getAddress()], { kind: "uups" });
    
    // Deploy NFT
    const StakingVisageNFT = await ethers.getContractFactory("StakingVisageNFT");
    const nft = await upgrades.deployProxy(StakingVisageNFT, [await owner.getAddress()], { kind: "uups" });
    
    // Deploy Staking
    const VisageStaking = await ethers.getContractFactory("VisageStaking");
    const staking = await upgrades.deployProxy(VisageStaking, [
      await owner.getAddress(),
      await token.getAddress(),
      await nft.getAddress()
    ], { kind: "uups" });
    
    // Transfer ownership to staking
    await token.transferOwnership(await staking.getAddress());
    await nft.transferOwnership(await staking.getAddress());
    
    return { token, nft, staking, owner, user1, user2 };
  }

  it("Should allow users to buy tokens", async function () {
    const { staking, user1 } = await deployFixture();
    
    // User buys tokens
    const ethAmount = ethers.parseEther("1.0");
    await staking.connect(user1).mintToken({ value: ethAmount });
    
    // Check token ownership
    const addresses = await staking.getAddresses();
    const tokenContract = await ethers.getContractAt("StakingVisageToken", addresses[0]);
    const balance = await tokenContract.balanceOf(await user1.getAddress());
    expect(balance).to.equal(ethers.parseEther("10.0")); // 10 tokens per ETH
  });
  
  it("Should allow users to mint NFTs with tokens", async function () {
    const { token, staking, user1 } = await deployFixture();
    
    // User buys tokens
    const ethAmount = ethers.parseEther("1.0");
    await staking.connect(user1).mintToken({ value: ethAmount });
    
    // Get token address
    const addresses = await staking.getAddresses();
    const tokenContract = await ethers.getContractAt("StakingVisageToken", addresses[0]);
    
    // Approve tokens for staking
    await tokenContract.connect(user1).approve(
      await staking.getAddress(), 
      ethers.parseEther("10.0")
    );
    
    // Mint NFT with tokens
    await staking.connect(user1).mintNFT();
    
    // Check NFT ownership
    const nftContract = await ethers.getContractAt("StakingVisageNFT", addresses[1]);
    const owner = await nftContract.ownerOf(1);
    expect(owner).to.equal(await user1.getAddress());
  });
  
  it("Should allow users to stake NFTs and earn rewards", async function () {
    const { staking, user1 } = await deployFixture();
    
    // User buys tokens and mints NFT
    const ethAmount = ethers.parseEther("1.0");
    await staking.connect(user1).mintToken({ value: ethAmount });
    
    // Get addresses
    const addresses = await staking.getAddresses();
    const tokenContract = await ethers.getContractAt("StakingVisageToken", addresses[0]);
    const nftContract = await ethers.getContractAt("StakingVisageNFT", addresses[1]);
    
    // Approve tokens for staking
    await tokenContract.connect(user1).approve(
      await staking.getAddress(), 
      ethers.parseEther("10.0")
    );
    
    // Mint NFT with tokens
    await staking.connect(user1).mintNFT();
    
    // Approve and stake the NFT
    await nftContract.connect(user1).approve(await staking.getAddress(), 1);
    await nftContract.connect(user1)["safeTransferFrom(address,address,uint256)"](
      await user1.getAddress(),
      await staking.getAddress(),
      1
    );
    
    // Fast forward time (24 hours + 1 second)
    await time.increase(86401);
    
    // Check reward balance
    const rewardBalance = await staking.getRewardBalanceOf(1);
    expect(rewardBalance).to.equal(ethers.parseEther("10.0")); // 10 tokens reward
    
    // Withdraw rewards
    await staking.connect(user1).withdrawReward(1);
    
    // Check token balance after reward
    const finalBalance = await tokenContract.balanceOf(await user1.getAddress());
    expect(finalBalance).to.equal(ethers.parseEther("10.0")); // Initial 10 after spending + 10 reward
  });
}); 