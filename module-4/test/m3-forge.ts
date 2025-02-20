import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC1155Token, Forge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {FunctionFragment} from "ethers";

describe("ERC1155Token", function() {

    async function deployContract() {
        const [owner, otherAccount] = await ethers.getSigners();
        const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        const token = await ERC1155Token.deploy(owner);
        await token.waitForDeployment();
        return { token, owner, otherAccount };
    }

    describe("Deployment", function() {
        // Testing Ownable2Step check address(0)
        it("Should revert with invalid owner from multiple checks", async function() {
            const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
            await expect(ERC1155Token.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(ERC1155Token, "OwnableInvalidOwner");
        });
        // Testing Ownable2Step to have the correct owner
        it("Should set the correct owner", async function() {
            const { token, owner } = await loadFixture(deployContract);
            expect(await token.owner()).to.equal(owner.address);
        });
        it("Should support ERC1155 interface", async function () {
            const { token } = await loadFixture(deployContract);
            // ERC1155 interface ID
            expect(await token.supportsInterface("0xd9b67a26")).to.be.true;
        });
    });
    
    describe("Unit tests", function() {
        it("Should set the correct URI", async function() {
            const { token } = await loadFixture(deployContract);
            expect(await token.uri(0)).to.equal("ipfs://bafybeihx2hcoh5pfuth7jw3winzc7l727zpieftswqibutaepwk6nbqsn4/0");
        });
    });

    // Usecases:
    // - Free minting of tokens 0-2
    // - Prevent minting twice of same token
    // - Enforce cooldown period after minting
    // - Allow minting after cooldown period
    describe("Minting", function() {

        it("Should allow free minting of tokens 0", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await token.connect(otherAccount).freeMint(0);
            expect(await token.balanceOf(otherAccount.address, 0)).to.equal(1);
            expect(await token.balanceOf(otherAccount.address, 1)).to.equal(0);
            expect(await token.balanceOf(otherAccount.address, 2)).to.equal(0);
        });
        
        it("Should allow free minting of tokens 1", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await token.connect(otherAccount).freeMint(1);
            expect(await token.balanceOf(otherAccount.address, 0)).to.equal(0);
            expect(await token.balanceOf(otherAccount.address, 1)).to.equal(1);
            expect(await token.balanceOf(otherAccount.address, 2)).to.equal(0);
        });

        it("Should allow free minting of tokens 3", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await token.connect(otherAccount).freeMint(2);
            expect(await token.balanceOf(otherAccount.address, 0)).to.equal(0);
            expect(await token.balanceOf(otherAccount.address, 1)).to.equal(0);
            expect(await token.balanceOf(otherAccount.address, 2)).to.equal(1);
        });

        it("Should prevent minting tokens above id 2", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await expect(token.connect(otherAccount).freeMint(3))
                .to.be.revertedWith("Free mint only allowed for tokens 0-2");
        });

        it("Should prevent minting the same token twice", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await token.connect(otherAccount).freeMint(0);
            // Wait for cooldown to pass
            await time.increase(61);
            await expect(token.connect(otherAccount).freeMint(0))
                .to.be.revertedWith("was already minted");
        });

        it("Should enforce cooldown period", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await token.connect(otherAccount).freeMint(0);
            await expect(token.connect(otherAccount).freeMint(1))
                .to.be.revertedWith("Cooldown active: wait 1 minute between mints");
        });

        it("Should allow minting after cooldown period", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await token.connect(otherAccount).freeMint(0);
            await time.increase(61); // Increase time by 61 seconds
            await token.connect(otherAccount).freeMint(1);
            expect(await token.balanceOf(otherAccount.address, 1)).to.equal(1);
        });

        it("Should prevent forge minting invalid token ids", async function () {
            const { token, owner } = await loadFixture(deployContract);
            await expect(
                token.forgeMint(owner.address, 7, 1)
            ).to.be.revertedWith("Invalid token id: must be 0 to 6")
        });
    });

    describe("Cooldown", function() {
        describe("Mint status", function() {
            it("Should correctly report canMint status", async function () {
                const { token, otherAccount } = await loadFixture(deployContract);
                expect(await token.canMint()).to.be.true;
                await token.connect(otherAccount).freeMint(0);
                expect(await token.connect(otherAccount).canMint()).to.be.false;
            });

            it("Should correctly report canMint status for specific accounts", async function () {
                const { token, owner, otherAccount } = await loadFixture(deployContract);
                
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

        describe("Last minting time", function() {
            it("Should return correct lastMintTime", async function () {
                const { token, otherAccount } = await loadFixture(deployContract);
                const tx = await token.connect(otherAccount).freeMint(0);
                const block = await ethers.provider.getBlock(tx.blockNumber!);
                expect(await token.connect(otherAccount).getLastMintTime())
                    .to.equal(block?.timestamp);
            });

            it("Should track lastMintTime for specific accounts", async function () {
                const { token, owner, otherAccount } = await loadFixture(deployContract);
                
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
        });

        describe("Remaining cooldown", function() {
            it("Should calculate remaining cooldown correctly", async function () {
                const { token, otherAccount } = await loadFixture(deployContract);
                await token.connect(otherAccount).freeMint(0);
                const remainingCooldown = await token.connect(otherAccount).getRemainingCooldown();
                expect(remainingCooldown).to.be.lessThanOrEqual(60);
                expect(remainingCooldown).to.be.greaterThan(0);
            });
    
            it("Should return zero cooldown when no mints performed", async function () {
                const { token, otherAccount } = await loadFixture(deployContract);
                expect(await token.connect(otherAccount).getRemainingCooldown()).to.equal(0);
            });
    
            it("Should track cooldown for specific accounts", async function () {
                const { token, owner, otherAccount } = await loadFixture(deployContract);
                
                // First account mints
                await token.connect(owner).freeMint(0);
                
                // Check remaining cooldown for first account
                const ownerCooldown = await token.getRemainingCooldownOf(owner.address);
                expect(ownerCooldown).to.be.lessThanOrEqual(60);
                expect(ownerCooldown).to.be.greaterThan(0);
                
                // Second account should have no cooldown
                expect(await token.getRemainingCooldownOf(otherAccount.address)).to.equal(0);
            });
        });
    });

    describe("Burning", function() {
        it("Should revert batch burn with mismatched arrays", async function () {
            const { token,  owner } = await loadFixture(deployContract);
            await expect(
                token.batchBurn(owner.address, [0, 1], [1])
            ).to.be.revertedWith("Length mismatch");
        });
    });

    describe("Access Control", function() {

        it("Should prevent non-owner from batch burning", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            const ids = [0, 1];
            const amounts = [1, 1];
            await expect(token.connect(otherAccount).batchBurn(otherAccount.address, ids, amounts))
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });

        it("Should prevent non-owner from forge minting", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await expect(token.connect(otherAccount).forgeMint(otherAccount.address, 5, 1))
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });
    });

    describe("Fallback Receive", function() {
        it("Should reject ETH transfers", async function () {
            const { token, otherAccount } = await loadFixture(deployContract);
            await expect(otherAccount.sendTransaction({
                to: await token.getAddress(),
                value: ethers.parseEther("1.0")
            })).to.be.revertedWith("You can't send ether on that contract");
        });
        it("Should revert when sending ETH with data (fallback)", async function () {
            const { token, owner } = await loadFixture(deployContract);
            await expect(
                owner.sendTransaction({
                    to: await token.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234",
                })
            ).to.be.revertedWith("You can't send ether with data on that contract");
        });
    });

    describe("Reentrancy", function() {
        it("Should prevent reentrancy in freeMint", async function () {
            const { token } = await loadFixture(deployContract);
            
            const FreeMintReentrancyAttacker = await ethers.getContractFactory("MockFreeMintReentrancyAttacker");
            const attacker = await FreeMintReentrancyAttacker.deploy(await token.getAddress());

            await expect(attacker.attack())
                .to.be.reverted; // Will revert due to nonReentrant modifier
        });
    });
})


describe("Forge", function() {

    //  ERC1155 and Forge
    async function deployContracts() {
        const [owner, otherAccount] = await ethers.getSigners();

        const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        const token = await ERC1155Token.deploy(owner);
        await token.waitForDeployment();

        const Forge = await ethers.getContractFactory("Forge");
        const forge = await Forge.deploy(owner, token);
        await forge.waitForDeployment();

        // Transfer ownership of ERC1155Token to Forge using two-step process
        await token.transferOwnership(await forge.getAddress());
        await forge.acceptTokenOwnership();

        return { forge, token, owner, otherAccount };
    }


    async function deployMockBatchContracts() {
        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy ERC1155Token
        const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        const token = await ERC1155Token.deploy(owner);
        await token.waitForDeployment();
    
        // Deploy MockForge (which will call forgeMint)
        const MockForge = await ethers.getContractFactory("MockBatch"); 
        const mockForge = await MockForge.deploy(await token.getAddress());
        await mockForge.waitForDeployment();
    
        // Transfer ownership to MockForge so it can mint
        await token.transferOwnership(await mockForge.getAddress());
        await mockForge.acceptTokenOwnership();
    
        return { token, mockForge, owner };
    }

    async function deployMaliciousMockBatchToForgeContracts() {
        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy MockOverrideBatchBurnToForgeReentrancyForgeAttack (which overrides batchBurn to reenter forge())
        const MockOverrideBatchBurnToForgeReentrancyForgeAttack = await ethers.getContractFactory("MockOverrideBatchBurnToForgeReentrancyForgeAttack");
        const maliciousToken = await MockOverrideBatchBurnToForgeReentrancyForgeAttack.deploy(owner.address);
        await maliciousToken.waitForDeployment();

        // Deploy the Forge contract with the malicious token address
        const Forge = await ethers.getContractFactory("Forge");
        const forge = await Forge.deploy(owner.address, await maliciousToken.getAddress());
        await forge.waitForDeployment();

        // Set the forge address in the malicious token so it can call back into Forge
        await maliciousToken.setForgeAddress(await forge.getAddress());

        // Transfer ownership of the token to Forge using the two-step process
        await maliciousToken.transferOwnership(await forge.getAddress());
        await forge.acceptTokenOwnership();

        return { forge, maliciousToken, owner, otherAccount };
    }

    async function deployMaliciousMockBatchToTradeContracts() {
        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy MockOverrideBatchBurnToTradeReentrancyForgeAttack (which overrides batchBurn to reenter forge())
        const MockOverrideBatchBurnToTradeReentrancyForgeAttack = await ethers.getContractFactory("MockOverrideBatchBurnToTradeReentrancyForgeAttack");
        const maliciousToken = await MockOverrideBatchBurnToTradeReentrancyForgeAttack.deploy(owner.address);
        await maliciousToken.waitForDeployment();

        // Deploy the Forge contract with the malicious token address
        const Forge = await ethers.getContractFactory("Forge");
        const forge = await Forge.deploy(owner.address, await maliciousToken.getAddress());
        await forge.waitForDeployment();

        // Set the forge address in the malicious token so it can call back into Forge
        await maliciousToken.setForgeAddress(await forge.getAddress());

        // Transfer ownership of the token to Forge using the two-step process
        await maliciousToken.transferOwnership(await forge.getAddress());
        await forge.acceptTokenOwnership();

        return { forge, maliciousToken, owner, otherAccount };
    }


    describe("Deployment ERC1155", function() {
        it("Should set the correct owner", async function () {
            const { token, forge } = await loadFixture(deployContracts);
            expect(await token.owner()).to.equal(forge);
        });
    });

    describe("Deployment", function() {
        it("Should set the correct owner", async function () {
            const { forge, owner } = await loadFixture(deployContracts);
            expect(await forge.owner()).to.equal(owner);
        });

    });
    
    describe("Access Control", function() {
        it("Should prevent transfer ownership if not owner", async function () {
            const { forge } = await loadFixture(deployContracts);
            expect(
                forge.acceptOwnership()
            ).to.be.revertedWithCustomError(forge, "OwnableUnauthorizedAccount");
        });


        it("Should prevent non-owner from forge minting", async function () {
            const { token, otherAccount } = await loadFixture(deployContracts);
            await expect(token.connect(otherAccount).forgeMint(otherAccount.address, 5, 1))
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });

        it("Should test both ownership paths of acceptTokenOwnership", async function () {
            // I started fresh here because i was so annoyed with the `[E]` behind onlyOwner on acceptTokenOwnership
            const [owner, otherAccount] = await ethers.getSigners();
            
            // Deploy token owned by owner
            const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
            const newToken = await ERC1155Token.deploy(owner);
            
            // Deploy forge owned by owner
            const Forge = await ethers.getContractFactory("Forge");
            const newForge = await Forge.deploy(owner, await newToken.getAddress());
            
            // Set up ownership transfer
            await newToken.transferOwnership(await newForge.getAddress());
            
            // Test non-owner fails
            await expect(
                newForge.connect(otherAccount).acceptTokenOwnership()
            ).to.be.revertedWithCustomError(newForge, "OwnableUnauthorizedAccount")
            .withArgs(otherAccount.address);
            
            // Test owner succeeds (should NOT revert)
            await expect(
                newForge.connect(owner).acceptTokenOwnership()
            ).to.not.be.reverted;
            
            // Verify ownership transferred successfully
            expect(await newToken.owner()).to.equal(await newForge.getAddress());
        });
    });


    describe("Minting", function() {
        it("Should prevent forge minting invalid token ids", async function () {
            const { token, owner } = await loadFixture(deployContracts);
            await expect(
                token.forgeMint(owner.address, 7, 1)
            ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
            .withArgs(owner.address);
        });
    });

    describe("Trading", function() {
        it("Should allow trading", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);
            
            // First approve Forge to handle tokens
            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));
            
            expect(
                forge.trade(0, 2)
            ).to.be.emit(token, "TokenTraded");
        });

        it("Should prevent trading invalid tokens 0-2", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);

            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));

            expect(
                forge.trade(0, 3)
            ).to.be.revertedWith("Can only trade for base tokens (0-2)");
        });

         
        it("Should prevent trading invalid tokens within range", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);

            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));

            expect(
                forge.trade(7, 0)
            ).to.be.revertedWith("Token id to trade must be between 0 and 6");
        });



        it("Should prevent trading invalid token with itself", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);

            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));

            expect(
                forge.trade(0, 0)
            ).to.be.revertedWith("Cannot trade token for itself");
        });


        it("Should prevent forge minting invalid token IDs", async function () {
            const { mockForge, owner } = await loadFixture(deployMockBatchContracts);

            // Valid ID (should succeed)
            await expect(mockForge.forgeMint(owner.address, 6, 1)).to.not.be.reverted;
        
            // Invalid ID (should fail)
            await expect(mockForge.forgeMint(owner.address, 7, 1))
                .to.be.revertedWith("Invalid token id: must be 0 to 6");
        
            await expect(mockForge.forgeMint(owner.address, 100, 1))
                .to.be.revertedWith("Invalid token id: must be 0 to 6");
        });


        // Testing the reentrancy of the forge
        // Imagine you want to override the batch burn function and trade again behind using the two ids, you will get a reentrancy attack
        it("should revert when a reentrant call is attempted during trading", async function() {
            const { forge, maliciousToken, owner } = await loadFixture(deployMaliciousMockBatchToTradeContracts);
            await time.increase(time.duration.minutes(2));
            await maliciousToken.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await maliciousToken.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));
            await expect(forge.forge(3)).to.be.revertedWithCustomError(forge, "ReentrancyGuardReentrantCall");
        });
    });


    describe("Burning", function() {
        it("Should prevent non-owner from batch burning", async function () {
            const { token, otherAccount } = await loadFixture(deployContracts);
            const ids = [0, 1];
            const amounts = [1, 1];
            
            await expect(token.connect(otherAccount).batchBurn(otherAccount.address, ids, amounts))
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });

        it("Should revert batch burn with mismatched arrays", async function () {
            const { token, mockForge, owner } = await loadFixture(deployMockBatchContracts);
        
            // Now attempt to call batchBurn from MockForge
            await expect(
                 mockForge.triggerBatchBurn(owner.address, [0, 1], [1])
            ).to.be.revertedWith("Length mismatch");
        });
    })

    describe("Forging", function() {

        // Testing the reentrancy of the forge
        // Imagine you want to override the batch burn function and forge again behind, you will get a reentrancy attack
        it("should revert when a reentrant call is attempted during forging", async function() {
            const { forge } = await loadFixture(deployMaliciousMockBatchToForgeContracts);
            await expect(forge.forge(3)).to.be.revertedWithCustomError(forge, "ReentrancyGuardReentrantCall");
        });

        it("Should hit else path with invalid forge id", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);
            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            // Try to forge with token id 7 which should hit all else conditions
            await expect(
                forge.forge(7)
            ).to.be.revertedWith("Invalid forged token id");
        });

        it("Should forge them all", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);
            
            // First approve Forge to handle tokens
            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));
            await forge.forge(3);

            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(2);
            await time.increase(time.duration.minutes(2));
            await forge.forge(4);

            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(2);
            await time.increase(time.duration.minutes(2));
            await forge.forge(5);
            
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(2);
            await time.increase(time.duration.minutes(2));
            await forge.forge(6);
            
            expect(await token.balanceOf(owner.address, 3)).to.equal(1);
        });

        it("Should prevent forging outside of range", async function () {
            const { token, forge, owner } = await loadFixture(deployContracts);
            
            // First approve Forge to handle tokens
            await token.connect(owner).setApprovalForAll(await forge.getAddress(), true);
            
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(0);
            await time.increase(time.duration.minutes(2));
            await token.connect(owner).freeMint(1);
            await time.increase(time.duration.minutes(2));
            
            expect(
                forge.forge(1),
            ).to.be.revertedWith("Can only forge tokens 3-6");
        });
    });

    describe("Fallback Receive", function() {
        it("Should revert when sending ETH directly (receive)", async function () {
            const { forge, owner } = await loadFixture(deployContracts);
            await expect(
                owner.sendTransaction({
                    to: await forge.getAddress(),
                    value: ethers.parseEther("1")
                })
            ).to.be.revertedWith("You can't send ether on that contract");
        });
        it("Should revert when sending ETH with data (fallback)", async function () {
            const { forge, owner } = await loadFixture(deployContracts);
            await expect(
                owner.sendTransaction({
                    to: await forge.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234",
                })
            ).to.be.revertedWith("You can't send ether with data on that contract");
        });
    });

})
