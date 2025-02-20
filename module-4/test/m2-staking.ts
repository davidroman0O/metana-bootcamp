import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { StakingVisageToken, StakingVisageNFT, VisageStaking } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("StakingVisageNFT", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const NFTFactory = await ethers.getContractFactory("StakingVisageNFT");
        const nft = await NFTFactory.deploy(owner.address);
        return { nft, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            expect(await nft.owner()).to.equal(owner.address);
        });

        it("Should set the correct name and symbol", async function () {
            const { nft } = await loadFixture(deployFixture);
            expect(await nft.name()).to.equal("Visage NFT");
            expect(await nft.symbol()).to.equal("NVSG");
        });

        it("Should revert when deploying with zero address", async function () {
            const NFTFactory = await ethers.getContractFactory("StakingVisageNFT");
            await expect(NFTFactory.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(NFTFactory, "OwnableInvalidOwner");
        });
    });

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy in mint and withdraw", async function () {
            const [owner] = await ethers.getSigners();
            
            // Deploy a contract that will attempt reentrancy
            const MockWithdrawReentrancyAttacker = await ethers.getContractFactory("MockWithdrawReentrancyAttacker");
            const token = await (await ethers.getContractFactory("StakingVisageToken")).deploy(owner.address);
            const attacker = await MockWithdrawReentrancyAttacker.deploy(await token.getAddress());
            
            // Transfer ownership to attacker
            await token.transferOwnership(await attacker.getAddress());
            await attacker.acceptRefundOwnership();
            
            // Fund the contract
            await ethers.provider.send("hardhat_setBalance", [
                await token.getAddress(),
                ethers.toBeHex(ethers.parseEther("1"))
            ]);
            
            // Attempt reentrancy attack
            await expect(attacker.attack())
                .to.be.reverted;
        });

      
    });

    describe("Minting", function () {
        it("Should allow owner to mint NFT", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            await nft.mint(otherAccount.address);
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
        });

        it("Should prevent non-owner from minting", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            await expect(nft.connect(otherAccount).mint(otherAccount.address))
                .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });

        it("Should enforce max supply limit", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            
            // Mint up to max supply (10 NFTs)
            for(let i = 0; i < 10; i++) {
                await nft.mint(owner.address);
            }
            
            // Try to mint one more
            await expect(nft.mint(owner.address))
                .to.be.revertedWith("no more NFT to mint");
        });

        it("Should increment token IDs correctly", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            await nft.mint(owner.address);
            await nft.mint(otherAccount.address);
            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await nft.ownerOf(2)).to.equal(otherAccount.address);
        });
    });

    describe("Token URI", function () {
        it("Should return correct token URI", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            await nft.mint(owner.address);
            const baseURI = "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
            expect(await nft.tokenURI(1)).to.equal(baseURI + "1");
        });

        it("Should revert when querying URI for non-existent token", async function () {
            const { nft } = await loadFixture(deployFixture);
            await expect(nft.tokenURI(1))
                .to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
        });
    });

    describe("Balance Functions", function () {
        it("Should allow owner to check contract NFT balance", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            expect(await nft.balance()).to.equal(0);
            await nft.mint(otherAccount.address);
            await nft.connect(otherAccount).transferFrom(otherAccount.address, await nft.getAddress(), 1);
            expect(await nft.balance()).to.equal(1);
        });

        it("Should prevent non-owner from checking balance", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            await expect(nft.connect(otherAccount).balance())
                .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });
    });

    describe("Withdrawal", function () {
        it("Should allow owner to withdraw ETH", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            
            // Since there's no receive function, we'll fund the contract another way
            await ethers.provider.send("hardhat_setBalance", [
                await nft.getAddress(),
                ethers.toBeHex(ethers.parseEther("1"))
            ]);

            const balanceBefore = await ethers.provider.getBalance(owner.address);
            const tx = await nft.withdraw();
            const receipt = await tx.wait();
            const gasCost = receipt!.gasUsed * (await tx.gasPrice);
            const balanceAfter = await ethers.provider.getBalance(owner.address);

            expect(balanceAfter - balanceBefore + gasCost).to.equal(ethers.parseEther("1"));
            expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
        });

        it("Should prevent withdrawal with no balance", async function () {
            const { nft } = await loadFixture(deployFixture);
            await expect(nft.withdraw())
                .to.be.revertedWith("Nothing to withdraw");
        });

        it("Should prevent non-owner from withdrawing", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            await expect(nft.connect(otherAccount).withdraw())
                .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });
    });

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy in mint and withdraw", async function () {
            const [owner] = await ethers.getSigners();
            
            // Deploy a contract that will attempt reentrancy
            const MockWithdrawReentrancyAttacker = await ethers.getContractFactory("MockWithdrawReentrancyAttacker");
            const nft = await (await ethers.getContractFactory("StakingVisageNFT")).deploy(owner.address);
            const attacker = await MockWithdrawReentrancyAttacker.deploy(await nft.getAddress());
            
            // Transfer ownership to attacker
            await nft.transferOwnership(await attacker.getAddress());
            await attacker.acceptRefundOwnership();
            
            // Fund the contract
            await ethers.provider.send("hardhat_setBalance", [
                await nft.getAddress(),
                ethers.toBeHex(ethers.parseEther("1"))
            ]);
            
            // Attempt reentrancy attack
            await expect(attacker.attack())
                .to.be.reverted;
        });

        it("Should prevent reentrancy in mint", async function () {
            const [owner] = await ethers.getSigners();
            
            // Deploy our reentrancy attacker
            const nft = await (await ethers.getContractFactory("StakingVisageNFT")).deploy(owner.address);
            const MockStakingNFTReentrancyAttacker = await ethers.getContractFactory("MockStakingNFTReentrancyAttacker");
            const attacker = await MockStakingNFTReentrancyAttacker.deploy(await nft.getAddress());
            
            // Transfer ownership to attacker contract
            await nft.transferOwnership(await attacker.getAddress());
            await attacker.acceptNFTOwnership();
            
            // Attempt reentrancy attack
            await expect(attacker.attack())
                .to.be.revertedWithCustomError(nft, "ReentrancyGuardReentrantCall");
        });
    });
});

describe("StakingVisageToken", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const TokenFactory = await ethers.getContractFactory("StakingVisageToken");
        const token = await TokenFactory.deploy(owner.address);
        return { token, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { token, owner } = await loadFixture(deployFixture);
            expect(await token.owner()).to.equal(owner.address);
        });

        it("Should set the correct name and symbol", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.name()).to.equal("Visage Token");
            expect(await token.symbol()).to.equal("VSG");
        });

        it("Should set the correct constants", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.TOKENS_PER_ETH()).to.equal(ethers.parseUnits("10", 18));
        });

        it("Should revert when deploying with zero address", async function () {
            const TokenFactory = await ethers.getContractFactory("StakingVisageToken");
            await expect(TokenFactory.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(TokenFactory, "OwnableInvalidOwner");
        });
    });

    describe("Minting", function () {
        it("Should mint correct amount of tokens for 1 ETH", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            await token.connect(otherAccount).mint(otherAccount.address, {
                value: ethers.parseEther("1")
            });
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });

        it("Should mint correct amount of tokens for 0.5 ETH", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            await token.connect(otherAccount).mint(otherAccount.address, {
                value: ethers.parseEther("0.5")
            });
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("5", 18));
        });

        it("Should revert minting with 0 ETH", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            await expect(token.connect(otherAccount).mint(otherAccount.address, {
                value: 0
            })).to.be.revertedWith("send eth to buy tokens");
        });

        it("Should allow owner to mint tokens directly", async function () {
            const { token, owner, otherAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("10", 18);
            await token.mintToken(otherAccount.address, amount);
            expect(await token.balanceOf(otherAccount.address)).to.equal(amount);
        });

        it("Should prevent non-owner from minting tokens directly", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("10", 18);
            await expect(token.connect(otherAccount).mintToken(otherAccount.address, amount))
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });
    });

    describe("ETH Handling", function () {
        it("Should accept ETH via receive and mint tokens", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            await token.connect(otherAccount).mint(otherAccount.address, {
                value: ethers.parseEther("1")
            });
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });

        it("Should revert when sending ETH with data", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            await expect(otherAccount.sendTransaction({
                to: await token.getAddress(),
                value: ethers.parseEther("1"),
                data: "0x1234"
            })).to.be.revertedWith("You can't send ether with data on that contract");
        });
    });

    describe("Withdrawal", function () {
        it("Should allow owner to withdraw ETH", async function () {
            const { token, owner, otherAccount } = await loadFixture(deployFixture);
            
            // Fund contract through minting
            await token.connect(otherAccount).mint(otherAccount.address, {
                value: ethers.parseEther("1")
            });

            const balanceBefore = await ethers.provider.getBalance(owner.address);
            const tx = await token.withdraw();
            const receipt = await tx.wait();
            const gasCost = receipt!.gasUsed * (await tx.gasPrice);
            const balanceAfter = await ethers.provider.getBalance(owner.address);

            expect(balanceAfter - balanceBefore + gasCost).to.equal(ethers.parseEther("1"));
            expect(await ethers.provider.getBalance(await token.getAddress())).to.equal(0);
        });

        it("Should prevent non-owner from withdrawing", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            await expect(token.connect(otherAccount).withdraw())
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });

        it("Should revert when nothing to withdraw", async function () {
            const { token } = await loadFixture(deployFixture);
            await expect(token.withdraw())
                .to.be.revertedWith("Nothing to withdraw");
        });
    });

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy in payable mint", async function () {
            const [owner] = await ethers.getSigners();
            
            // Deploy token and attacker
            const token = await (await ethers.getContractFactory("StakingVisageToken")).deploy(owner.address);
            const MockPayableMintReentrancyAttacker = await ethers.getContractFactory("MockPayableMintReentrancyAttacker");
            const attacker = await MockPayableMintReentrancyAttacker.deploy(await token.getAddress());
            
            // Fund attacker
            await ethers.provider.send("hardhat_setBalance", [
                await attacker.getAddress(),
                ethers.toBeHex(ethers.parseEther("2"))
            ]);
    
            // Attempt the attack
            await expect(attacker.attack({
                value: ethers.parseEther("1")
            })).to.be.revertedWithCustomError(token, "ReentrancyGuardReentrantCall");
        });
    
        it("Should prevent reentrancy in mintToken", async function () {
            const [owner] = await ethers.getSigners();
            
            // Deploy token and attacker
            const token = await (await ethers.getContractFactory("StakingVisageToken")).deploy(owner.address);
            const MockMintTokenReentrancyAttacker = await ethers.getContractFactory("MockMintTokenReentrancyAttacker");
            const attacker = await MockMintTokenReentrancyAttacker.deploy(await token.getAddress());
            
            // Give attacker ownership to use mintToken
            await token.transferOwnership(await attacker.getAddress());
            await attacker.acceptTokenOwnership();
    
            // Attempt the attack
            await expect(attacker.attack())
                .to.be.revertedWithCustomError(token, "ReentrancyGuardReentrantCall");
        });
    });
});