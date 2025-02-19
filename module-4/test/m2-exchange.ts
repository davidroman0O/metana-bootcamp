import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ExchangeVisageNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ExchangeVisageNFT", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
        const nft = await NFTFactory.deploy(owner.address) as ExchangeVisageNFT;
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
            const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
            await expect(NFTFactory.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(NFTFactory, "OwnableInvalidOwner");
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
                .to.be.revertedWithCustomError(nft, "ERC721NonexistentToken")
                .withArgs(1);
        });
    });

    describe("Balance Functions", function () {
        it("Should allow owner to check contract NFT balance", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            
            // Initially balance should be 0
            expect(await nft.balance()).to.equal(0);
            
            // Mint an NFT to test
            await nft.mint(otherAccount.address);
            
            // Transfer NFT to contract
            await nft.connect(otherAccount).transferFrom(
                otherAccount.address,
                await nft.getAddress(),
                1
            );
            
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
            
            // Send ETH to contract
            await owner.sendTransaction({
                to: await nft.getAddress(),
                value: ethers.parseEther("1")
            });
            
            const initialBalance = await ethers.provider.getBalance(owner.address);
            const tx = await nft.withdraw();
            const receipt = await tx.wait();
            const gasCost = receipt!.gasUsed * (await tx.gasPrice);
            
            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance - initialBalance + gasCost)
                .to.equal(ethers.parseEther("1"));
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

        // Targeting the `require(success, "withdraw failed");` line
        it("Should handle failed withdrawals", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            
            // Deploy the malicious receiver
            const MockNFTReceiver = await ethers.getContractFactory("MockNFTReceiver");
            const mockReceiver = await MockNFTReceiver.deploy(await nft.getAddress());
            
            // Fund the NFT contract
            await ethers.provider.send("hardhat_setBalance", [
                await nft.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
            
            // Transfer ownership using the two-step process
            await nft.transferOwnership(await mockReceiver.getAddress());
            await mockReceiver.acceptNFTOwnership();
            
            // Configure the receiver to reject ETH
            await mockReceiver.setReject(true);
            
            // Attempt withdrawal should fail
            await expect(
                mockReceiver.withdrawFromNFT()
            ).to.be.revertedWith("withdraw failed");
        });
    });

    describe("ETH Handling", function () {
        it("Should accept direct ETH transfers", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1");
            
            await expect(otherAccount.sendTransaction({
                to: await nft.getAddress(),
                value: amount
            })).to.not.be.reverted;
            
            expect(await ethers.provider.getBalance(await nft.getAddress()))
                .to.equal(amount);
        });
    });

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy in mint and withdraw", async function () {
            const [owner] = await ethers.getSigners();
            
            // Deploy a contract that will attempt reentrancy
            const MockWithdrawReentrancyAttacker = await ethers.getContractFactory("MockWithdrawReentrancyAttacker");
            const nft = await (await ethers.getContractFactory("ExchangeVisageNFT")).deploy(owner.address);
            const attacker = await MockWithdrawReentrancyAttacker.deploy(await nft.getAddress());
            
            // Transfer ownership to attacker
            await nft.transferOwnership(await attacker.getAddress());
            await attacker.acceptRefundOwnership();
            
            // Fund the contract
            await owner.sendTransaction({
                to: await nft.getAddress(),
                value: ethers.parseEther("1")
            });
            
            // Attempt reentrancy attack
            await expect(attacker.attack())
                .to.be.reverted;
        });
    });
});