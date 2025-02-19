import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCSanction", function () {
    async function deployFixture() {
        const [owner, otherAccount, thirdAccount] = await ethers.getSigners();
        const ERCSanction = await ethers.getContractFactory("ERCSanction");
        const ercSanction = await ERCSanction.deploy();
        return { ercSanction, owner, otherAccount, thirdAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { ercSanction, owner } = await loadFixture(deployFixture);
            expect(await ercSanction.owner()).to.equal(owner.address);
        });

        it("Should set the correct token name and symbol", async function () {
            const { ercSanction } = await loadFixture(deployFixture);
            expect(await ercSanction.name()).to.equal("Sanction");
            expect(await ercSanction.symbol()).to.equal("SANC");
        });
    });

    describe("Sanctioning", function () {
        it("Should allow owner to sanction an address", async function () {
            const { ercSanction, owner, otherAccount } = await loadFixture(deployFixture);
            
            await expect(ercSanction.sanction(otherAccount.address))
                .to.emit(ercSanction, "Sanctioned")
                .withArgs(otherAccount.address);
        });

        it("Should allow owner to unsanction an address", async function () {
            const { ercSanction, owner, otherAccount } = await loadFixture(deployFixture);
            
            await ercSanction.sanction(otherAccount.address);
            await expect(ercSanction.unsanction(otherAccount.address))
                .to.emit(ercSanction, "Unsanctioned")
                .withArgs(otherAccount.address);
        });

        it("Should prevent non-owner from sanctioning addresses", async function () {
            const { ercSanction, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            
            await expect(
                ercSanction.connect(otherAccount).sanction(thirdAccount.address)
            ).to.be.revertedWithCustomError(ercSanction, "OwnableUnauthorizedAccount");
        });

        it("Should prevent non-owner from unsanctioning addresses", async function () {
            const { ercSanction, owner, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            
            await ercSanction.sanction(thirdAccount.address);
            await expect(
                ercSanction.connect(otherAccount).unsanction(thirdAccount.address)
            ).to.be.revertedWithCustomError(ercSanction, "OwnableUnauthorizedAccount");
        });
    });

    describe("Transfer Restrictions", function () {
        it("Should prevent transfers from sanctioned addresses", async function () {
            const { ercSanction, owner, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("100", 18);
            
            // Mint tokens to sanctioned address
            await ercSanction.mint(otherAccount.address, amount);
            
            // Sanction the address
            await ercSanction.sanction(otherAccount.address);
            
            // Attempt transfer
            await expect(
                ercSanction.connect(otherAccount).transfer(thirdAccount.address, amount)
            ).to.be.revertedWith("sanctioned");
        });

        it("Should prevent transfers to sanctioned addresses", async function () {
            const { ercSanction, owner, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("100", 18);
            
            // Mint tokens to sender
            await ercSanction.mint(otherAccount.address, amount);
            
            // Sanction the recipient
            await ercSanction.sanction(thirdAccount.address);
            
            // Attempt transfer
            await expect(
                ercSanction.connect(otherAccount).transfer(thirdAccount.address, amount)
            ).to.be.revertedWith("sanctioned");
        });

        it("Should allow transfers between non-sanctioned addresses", async function () {
            const { ercSanction, owner, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("100", 18);
            
            // Mint tokens to sender
            await ercSanction.mint(otherAccount.address, amount);
            
            // Transfer should succeed
            await expect(
                ercSanction.connect(otherAccount).transfer(thirdAccount.address, amount)
            ).to.not.be.reverted;
            
            expect(await ercSanction.balanceOf(thirdAccount.address)).to.equal(amount);
        });

        it("Should allow owner to transfer despite sanctions", async function () {
            const { ercSanction, owner, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("100", 18);
            
            // Mint tokens and sanction both addresses
            await ercSanction.mint(otherAccount.address, amount);
            await ercSanction.sanction(otherAccount.address);
            await ercSanction.sanction(thirdAccount.address);
            
            // Owner should still be able to move funds
            await expect(
                ercSanction.authoritativeTransferFrom(otherAccount.address, thirdAccount.address)
            ).to.not.be.reverted;
            
            expect(await ercSanction.balanceOf(thirdAccount.address)).to.equal(amount);
        });

        it("Should prevent transferFrom for sanctioned spender", async function () {
            const { ercSanction, owner, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("100", 18);
            
            // Mint tokens and approve
            await ercSanction.mint(otherAccount.address, amount);
            await ercSanction.connect(otherAccount).approve(thirdAccount.address, amount);
            
            // Sanction the spender (thirdAccount)
            await ercSanction.sanction(thirdAccount.address);
            
            // Attempt transferFrom
            await expect(
                ercSanction.connect(thirdAccount).transferFrom(otherAccount.address, thirdAccount.address, amount)
            ).to.be.revertedWith("sanctioned");
        });
    });

    describe("Sanctioning Status", function () {
        it("Should maintain sanction status across multiple sanctions", async function () {
            const { ercSanction, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            
            // Sanction multiple times
            await ercSanction.sanction(otherAccount.address);
            await ercSanction.sanction(otherAccount.address);
            
            // Try to transfer (should still be sanctioned)
            const amount = ethers.parseUnits("100", 18);
            await ercSanction.mint(otherAccount.address, amount);
            
            await expect(
                ercSanction.connect(otherAccount).transfer(thirdAccount.address, amount)
            ).to.be.revertedWith("sanctioned");
        });

        it("Should properly clear sanction status after unsanction", async function () {
            const { ercSanction, otherAccount, thirdAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("100", 18);
            
            // Mint, sanction, then unsanction
            await ercSanction.mint(otherAccount.address, amount);
            await ercSanction.sanction(otherAccount.address);
            await ercSanction.unsanction(otherAccount.address);
            
            // Transfer should now work
            await expect(
                ercSanction.connect(otherAccount).transfer(thirdAccount.address, amount)
            ).to.not.be.reverted;
            
            expect(await ercSanction.balanceOf(thirdAccount.address)).to.equal(amount);
        });
    });
});