import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("FacesNFT", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const FacesNFT = await ethers.getContractFactory("FacesNFT");
        const nft = await FacesNFT.deploy();
        return { nft, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            const { nft } = await loadFixture(deployFixture);
            expect(await nft.name()).to.equal("Echoforms");
            expect(await nft.symbol()).to.equal("ECHO");
        });

        it("Should initialize with zero tokens", async function () {
            const { nft } = await loadFixture(deployFixture);
            expect(await nft.currentTokenId()).to.equal(0);
        });

        it("Should set the correct max supply", async function () {
            const { nft } = await loadFixture(deployFixture);
            expect(await nft.MAX_SUPPLY()).to.equal(10);
        });
    });

    describe("Minting", function () {
        it("Should allow minting a token", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            await nft.connect(otherAccount).mint();
            
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
            expect(await nft.currentTokenId()).to.equal(1);
        });

        it("Should increment token IDs correctly", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            
            await nft.connect(owner).mint();
            await nft.connect(otherAccount).mint();
            
            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await nft.ownerOf(2)).to.equal(otherAccount.address);
            expect(await nft.currentTokenId()).to.equal(2);
        });

        it("Should revert when max supply is reached", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            
            // Mint all tokens
            for(let i = 0; i < 10; i++) {
                await nft.mint();
            }
            
            // Try to mint one more
            await expect(nft.mint())
                .to.be.revertedWith("Max supply reached");
        });
    });

    describe("Token URI", function () {
        it("Should return correct token URI", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            await nft.connect(otherAccount).mint();
            
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

    describe("ETH Handling", function () {
        it("Should reject calls with data (fallback)", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            
            // Test fallback with ETH
            await expect(
                otherAccount.sendTransaction({
                    to: await nft.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234"
                })
            ).to.be.reverted;

            // Test fallback without ETH
            await expect(
                otherAccount.sendTransaction({
                    to: await nft.getAddress(),
                    value: 0,
                    data: "0x1234"
                })
            ).to.be.reverted;
        });

        it("Should reject direct ETH transfers (receive)", async function () {
            const { nft, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                otherAccount.sendTransaction({
                    to: await nft.getAddress(),
                    value: ethers.parseEther("1")
                })
            ).to.be.revertedWith("The NFT is free, no need to send ETH");
        });
    });

    describe("ERC721 Standard Compliance", function () {
        it("Should track token balances correctly", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            
            await nft.connect(owner).mint();
            await nft.connect(owner).mint();
            await nft.connect(otherAccount).mint();
            
            expect(await nft.balanceOf(owner.address)).to.equal(2);
            expect(await nft.balanceOf(otherAccount.address)).to.equal(1);
        });

        it("Should allow token transfers", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            
            await nft.mint();
            await nft.transferFrom(owner.address, otherAccount.address, 1);
            
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
        });

        it("Should emit Transfer events", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            
            await expect(nft.mint())
                .to.emit(nft, "Transfer")
                .withArgs(ethers.ZeroAddress, owner.address, 1);
        });

        it("Should handle approvals correctly", async function () {
            const { nft, owner, otherAccount } = await loadFixture(deployFixture);
            
            await nft.mint();
            await nft.approve(otherAccount.address, 1);
            
            expect(await nft.getApproved(1)).to.equal(otherAccount.address);
        });
    });
});