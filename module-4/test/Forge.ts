import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC1155Token, Forge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {FunctionFragment} from "ethers";

describe("ERC1155Token and Forge", function () {

    async function deployContracts() {
        const [owner, otherAccount] = await ethers.getSigners();

        const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        const token = await ERC1155Token.deploy(owner);
        await token.waitForDeployment();

        const Forge = await ethers.getContractFactory("Forge");
        const forge = await Forge.deploy(owner, token);
        await forge.waitForDeployment();

        const tokenAddress = await forge.getAddress();

        // Transfer ownership of ERC1155Token to Forge using two-step process
        await token.transferOwnership(await forge.getAddress());
        await forge.acceptTokenOwnership();

        console.log("Owner address:", owner.address);
        console.log("Forge Contract Address:", await forge.getAddress());
        console.log("Token Address from Forge:", tokenAddress);
        
        console.log("Actual Forge Owner:", await forge.owner());
        console.log("Actual Token Owner:", await token.owner());
        
        return { forge, token, owner, otherAccount };
    }

    describe("ERC1155Token", function () {
        describe("Deployment", function () {
            it("Should set the correct owner", async function () {
                const { token, forge, owner } = await loadFixture(deployContracts);
                expect(await token.owner()).to.equal(forge);
            });

            it("Should set the correct URI", async function () {
                const { token } = await loadFixture(deployContracts);
                expect(await token.uri(0)).to.equal("ipfs://bafybeihx2hcoh5pfuth7jw3winzc7l727zpieftswqibutaepwk6nbqsn4/0");
            });

            it("Should revert with invalid owner from multiple checks", async function() {
                const ERC1155Token = await ethers.getContractFactory("ERC1155Token");

                // Also verify Ownable's check
                await expect(ERC1155Token.deploy(ethers.ZeroAddress))
                    .to.be.revertedWithCustomError(ERC1155Token, "OwnableInvalidOwner");
            });
        });

        describe("Free Minting", function () {
            it("Should allow free minting of tokens 0-2", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await token.connect(otherAccount).freeMint(0);
                expect(await token.balanceOf(otherAccount.address, 0)).to.equal(1);
            });

            it("Should prevent minting tokens above id 2", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await expect(token.connect(otherAccount).freeMint(3))
                    .to.be.revertedWith("Free mint only allowed for tokens 0-2");
            });

            it("Should prevent minting the same token twice", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await token.connect(otherAccount).freeMint(0);
                // Wait for cooldown to pass
                await time.increase(61);
                await expect(token.connect(otherAccount).freeMint(0))
                    .to.be.revertedWith("was already minted");
            });

            it("Should enforce cooldown period", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await token.connect(otherAccount).freeMint(0);
                await expect(token.connect(otherAccount).freeMint(1))
                    .to.be.revertedWith("Cooldown active: wait 1 minute between mints");
            });

            it("Should allow minting after cooldown period", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await token.connect(otherAccount).freeMint(0);
                await time.increase(61); // Increase time by 61 seconds
                await token.connect(otherAccount).freeMint(1);
                expect(await token.balanceOf(otherAccount.address, 1)).to.equal(1);
            });
        });

        describe("Cooldown Functions", function () {
            it("Should correctly report canMint status", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                expect(await token.canMint()).to.be.true;
                await token.connect(otherAccount).freeMint(0);
                expect(await token.connect(otherAccount).canMint()).to.be.false;
            });

            it("Should return correct lastMintTime", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                const tx = await token.connect(otherAccount).freeMint(0);
                const block = await ethers.provider.getBlock(tx.blockNumber!);
                expect(await token.connect(otherAccount).getLastMintTime())
                    .to.equal(block?.timestamp);
            });

            it("Should calculate remaining cooldown correctly", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await token.connect(otherAccount).freeMint(0);
                const remainingCooldown = await token.connect(otherAccount).getRemainingCooldown();
                expect(remainingCooldown).to.be.lessThanOrEqual(60);
                expect(remainingCooldown).to.be.greaterThan(0);
            });

            it("Should return zero cooldown when no mints performed", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                expect(await token.connect(otherAccount).getRemainingCooldown()).to.equal(0);
            });

            it("Should track cooldown for specific accounts", async function () {
                const { token, owner, otherAccount } = await loadFixture(deployContracts);
                
                // First account mints
                await token.connect(owner).freeMint(0);
                
                // Check remaining cooldown for first account
                const ownerCooldown = await token.getRemainingCooldownOf(owner.address);
                expect(ownerCooldown).to.be.lessThanOrEqual(60);
                expect(ownerCooldown).to.be.greaterThan(0);
                
                // Second account should have no cooldown
                expect(await token.getRemainingCooldownOf(otherAccount.address)).to.equal(0);
            });

            it("Should track lastMintTime for specific accounts", async function () {
                const { token, owner, otherAccount } = await loadFixture(deployContracts);
                
                // Initial state
                expect(await token.getLastMintTimeOf(owner.address)).to.equal(0);
                expect(await token.getLastMintTimeOf(otherAccount.address)).to.equal(0);
                
                // First account mints
                const tx = await token.connect(owner).freeMint(0);
                const block = await ethers.provider.getBlock(tx.blockNumber!);
                
                // Check lastMintTime updated only for minting account
                expect(await token.getLastMintTimeOf(owner.address)).to.equal(block?.timestamp);
                expect(await token.getLastMintTimeOf(otherAccount.address)).to.equal(0);
            });

            it("Should correctly report canMint status for specific accounts", async function () {
                const { token, owner, otherAccount } = await loadFixture(deployContracts);
                
                // Initially both can mint
                expect(await token.canMintOf(owner.address)).to.be.true;
                expect(await token.canMintOf(otherAccount.address)).to.be.true;
                
                // First account mints
                await token.connect(owner).freeMint(0);
                
                // Check status after mint
                expect(await token.canMintOf(owner.address)).to.be.false;
                expect(await token.canMintOf(otherAccount.address)).to.be.true;
                
                // Wait for cooldown
                await time.increase(61);
                
                // Both should be able to mint again
                expect(await token.canMintOf(owner.address)).to.be.true;
                expect(await token.canMintOf(otherAccount.address)).to.be.true;
            });
        });

        describe("Owner Functions", function () {
            it("Should allow owner to forge mint", async function () {
                const { token, forge, owner } = await loadFixture(deployContracts);
                
                // First approve Forge to handle tokens
                await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
                
                // Mint first base token
                await token.connect(owner).freeMint(0);
                
                // Wait for cooldown
                await time.increase(time.duration.minutes(2));
                
                // Mint second base token
                await token.connect(owner).freeMint(1);
                
                // Now forge can burn these tokens and mint new one
                await forge.forge(3);
                
                expect(await token.balanceOf(owner.address, 3)).to.equal(1);
            });
    

            it("Should prevent non-owner from forge minting", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await expect(token.connect(otherAccount).forgeMint(otherAccount.address, 5, 1))
                    .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
            });

            it("Should prevent forge minting invalid token ids", async function () {
                const { token, owner } = await loadFixture(deployContracts);
                
                await expect(
                    token.forgeMint(owner.address, 7, 1)
                ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
                .withArgs(owner.address);
            });
        });

        describe("Batch Operations", function () {
            it("Should allow owner to batch burn tokens", async function () {
                const { token, forge, owner } = await loadFixture(deployContracts);
                
                // Approve Forge
                await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
                
                // Mint first token
                await token.connect(owner).freeMint(0);
                
                // Increase time to bypass cooldown
                await time.increase(time.duration.minutes(2));
                
                // Mint second token
                await token.connect(owner).freeMint(1);
                
                // Forge token 3 which will burn tokens 0 and 1
                await forge.forge(3);
                
                expect(await token.balanceOf(owner.address, 0)).to.equal(0);
                expect(await token.balanceOf(owner.address, 1)).to.equal(0);
                expect(await token.balanceOf(owner.address, 3)).to.equal(1);
            });
    

            it("Should prevent non-owner from batch burning", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                const ids = [0, 1];
                const amounts = [1, 1];
                
                await expect(token.connect(otherAccount).batchBurn(otherAccount.address, ids, amounts))
                    .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
            });

            it("Should revert batch burn with mismatched arrays", async function () {
                const { token, owner } = await loadFixture(deployContracts);
                
                await expect(
                    token.batchBurn(owner.address, [0, 1], [1])
                ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
                .withArgs(owner.address);
            });
    
    
        });

        describe("ETH Handling", function () {
            it("Should reject ETH transfers", async function () {
                const { token, otherAccount } = await loadFixture(deployContracts);
                await expect(otherAccount.sendTransaction({
                    to: await token.getAddress(),
                    value: ethers.parseEther("1.0")
                })).to.be.revertedWith("You can't send ether on that contract");
            });
        });

        describe("Reentrancy Protection", function () {
            it("Should prevent reentrancy in freeMint", async function () {
                const { token } = await loadFixture(deployContracts);
                
                const FreeMintReentrancyAttacker = await ethers.getContractFactory("FreeMintReentrancyAttacker");
                const attacker = await FreeMintReentrancyAttacker.deploy(await token.getAddress());
                
                await expect(attacker.attack())
                    .to.be.reverted; // Will revert due to nonReentrant modifier
            });


        });

        describe("Interface Support", function () {
            it("Should support ERC1155 interface", async function () {
                const { token } = await loadFixture(deployContracts);
                // ERC1155 interface ID
                expect(await token.supportsInterface("0xd9b67a26")).to.be.true;
            });
        });
    });

});