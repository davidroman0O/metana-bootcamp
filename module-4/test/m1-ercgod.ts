import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCGod", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const ERCGod = await ethers.getContractFactory("ERCGod");
        const ercGod = await ERCGod.deploy("GodToken", "GOD");
        return { ercGod, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { ercGod, owner } = await loadFixture(deployFixture);
            expect(await ercGod.owner()).to.equal(owner.address);
        });

        it("Should set the correct token name and symbol", async function () {
            const { ercGod } = await loadFixture(deployFixture);
            expect(await ercGod.name()).to.equal("GodToken");
            expect(await ercGod.symbol()).to.equal("GOD");
        });
    });

    describe("Token Minting", function () {
        it("Should allow owner to mint tokens", async function () {
            const { ercGod, owner, otherAccount } = await loadFixture(deployFixture);
            const mintAmount = ethers.parseUnits("1000", 18);
            
            await ercGod.mintTokensToAddress(otherAccount.address, mintAmount);
            expect(await ercGod.balanceOf(otherAccount.address)).to.equal(mintAmount);
        });

        it("Should prevent non-owner from minting tokens", async function () {
            const { ercGod, otherAccount } = await loadFixture(deployFixture);
            const mintAmount = ethers.parseUnits("1000", 18);
            
            await expect(
                ercGod.connect(otherAccount).mintTokensToAddress(otherAccount.address, mintAmount)
            ).to.be.revertedWithCustomError(ercGod, "OwnableUnauthorizedAccount");
        });
    });

    describe("Balance Management", function () {
        it("Should increase balance when target is higher", async function () {
            const { ercGod, owner, otherAccount } = await loadFixture(deployFixture);
            const targetAmount = ethers.parseUnits("1000", 18);
            
            await ercGod.changeBalanceAtAddress(otherAccount.address, targetAmount);
            expect(await ercGod.balanceOf(otherAccount.address)).to.equal(targetAmount);
        });

        it("Should decrease balance when target is lower", async function () {
            const { ercGod, owner, otherAccount } = await loadFixture(deployFixture);
            const initialAmount = ethers.parseUnits("1000", 18);
            const targetAmount = ethers.parseUnits("500", 18);
            
            // First mint some tokens
            await ercGod.mintTokensToAddress(otherAccount.address, initialAmount);
            // Then reduce the balance
            await ercGod.changeBalanceAtAddress(otherAccount.address, targetAmount);
            
            expect(await ercGod.balanceOf(otherAccount.address)).to.equal(targetAmount);
        });

        it("Should revert when target address is zero", async function () {
            const { ercGod } = await loadFixture(deployFixture);
            const targetAmount = ethers.parseUnits("1000", 18);
            
            await expect(
                ercGod.changeBalanceAtAddress(ethers.ZeroAddress, targetAmount)
            ).to.be.revertedWith("must specify target");
        });

        it("Should prevent non-owner from changing balances", async function () {
            const { ercGod, otherAccount } = await loadFixture(deployFixture);
            const targetAmount = ethers.parseUnits("1000", 18);
            
            await expect(
                ercGod.connect(otherAccount).changeBalanceAtAddress(otherAccount.address, targetAmount)
            ).to.be.revertedWithCustomError(ercGod, "OwnableUnauthorizedAccount");
        });
    });

    describe("Authoritative Transfers", function () {
        it("Should allow owner to transfer all tokens from one address to another", async function () {
            const { ercGod, owner, otherAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("1000", 18);
            
            // First mint some tokens to the source address
            await ercGod.mintTokensToAddress(owner.address, amount);
            
            // Then transfer them authoritatively
            await ercGod.authoritativeTransferFrom(owner.address, otherAccount.address);
            
            expect(await ercGod.balanceOf(owner.address)).to.equal(0);
            expect(await ercGod.balanceOf(otherAccount.address)).to.equal(amount);
        });

        it("Should prevent non-owner from making authoritative transfers", async function () {
            const { ercGod, owner, otherAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseUnits("1000", 18);
            
            // First mint some tokens
            await ercGod.mintTokensToAddress(owner.address, amount);
            
            // Attempt unauthorized transfer
            await expect(
                ercGod.connect(otherAccount).authoritativeTransferFrom(owner.address, otherAccount.address)
            ).to.be.revertedWithCustomError(ercGod, "OwnableUnauthorizedAccount");
        });

        it("Should handle transfers with zero balance", async function () {
            const { ercGod, owner, otherAccount } = await loadFixture(deployFixture);
            
            // Transfer from address with zero balance
            await ercGod.authoritativeTransferFrom(otherAccount.address, owner.address);
            
            expect(await ercGod.balanceOf(owner.address)).to.equal(0);
            expect(await ercGod.balanceOf(otherAccount.address)).to.equal(0);
        });
    });
});