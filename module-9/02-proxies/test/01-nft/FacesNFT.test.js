const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("FacesNFT Upgradeable", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy the original contract with proxy
    const FacesNFT = await ethers.getContractFactory("contracts/01-SimpleNFT.sol:FacesNFT");
    const facesNFT = await upgrades.deployProxy(FacesNFT, [], { kind: "uups" });
    
    return { facesNFT, owner, user1, user2 };
  }

  it("Should be able to mint an NFT", async function () {
    const { facesNFT, user1 } = await deployFixture();
    
    // Mint an NFT
    await facesNFT.connect(user1).mint();
    
    // Check ownership
    const ownerOfToken1 = await facesNFT.ownerOf(1);
    expect(ownerOfToken1).to.equal(await user1.getAddress());
  });
  
  it("Should correctly upgrade and add god mode", async function () {
    const { facesNFT, owner, user1, user2 } = await deployFixture();
    
    // Mint NFT
    await facesNFT.connect(user1).mint();
    
    // Verify the NFT owner
    let ownerOfToken1 = await facesNFT.ownerOf(1);
    expect(ownerOfToken1).to.equal(await user1.getAddress());
    
    // Deploy the V2 implementation and upgrade
    // For testing, we'll use the V2 contract with god mode
    const FacesNFTv2 = await ethers.getContractFactory("contracts/01-SimpleNFT_V2.sol:FacesNFT");
    const upgradedNFT = await upgrades.upgradeProxy(await facesNFT.getAddress(), FacesNFTv2);
    
    // Verify ownership still persists after upgrade
    ownerOfToken1 = await upgradedNFT.ownerOf(1);
    expect(ownerOfToken1).to.equal(await user1.getAddress());
    
    // Use god mode to transfer the NFT from user1 to user2
    await upgradedNFT.connect(owner).godModeTransfer(
      await user1.getAddress(), 
      await user2.getAddress(), 
      1
    );
    
    // Verify user2 now owns the NFT
    ownerOfToken1 = await upgradedNFT.ownerOf(1);
    expect(ownerOfToken1).to.equal(await user2.getAddress());
  });
}); 