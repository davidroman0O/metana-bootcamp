const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Exchange System", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy Token
    const ExchangeVisageToken = await ethers.getContractFactory("ExchangeVisageToken");
    const token = await upgrades.deployProxy(ExchangeVisageToken, [await owner.getAddress()], { kind: "uups" });
    
    // Deploy NFT
    const ExchangeVisageNFT = await ethers.getContractFactory("ExchangeVisageNFT");
    const nft = await upgrades.deployProxy(ExchangeVisageNFT, [await owner.getAddress()], { kind: "uups" });
    
    // Deploy Exchange
    const VisageExchange = await ethers.getContractFactory("VisageExchange");
    const exchange = await upgrades.deployProxy(VisageExchange, [
      await owner.getAddress(),
      await token.getAddress(),
      await nft.getAddress()
    ], { kind: "uups" });
    
    // Transfer ownership to exchange
    await token.transferOwnership(await exchange.getAddress());
    await nft.transferOwnership(await exchange.getAddress());
    
    return { token, nft, exchange, owner, user1, user2 };
  }

  it("Should allow users to buy tokens", async function () {
    const { exchange, user1 } = await deployFixture();
    
    // User buys tokens
    const ethAmount = ethers.parseEther("1.0");
    await exchange.connect(user1).mintToken({ value: ethAmount });
    
    // Check user balance
    const balance = await exchange.connect(user1).balance();
    expect(balance).to.equal(ethers.parseEther("10.0")); // 10 tokens per ETH
  });
  
  it("Should allow users to mint NFTs with tokens", async function () {
    const { token, nft, exchange, user1 } = await deployFixture();
    
    // User buys tokens
    const ethAmount = ethers.parseEther("1.0");
    await exchange.connect(user1).mintToken({ value: ethAmount });
    
    // Approve tokens for exchange
    await token.connect(user1).approve(
      await exchange.getAddress(), 
      ethers.parseEther("10.0")
    );
    
    // Mint NFT with tokens
    await exchange.connect(user1).mintNFT();
    
    // Check NFT ownership
    const owner = await nft.ownerOf(1);
    expect(owner).to.equal(await user1.getAddress());
  });
}); 