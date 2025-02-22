import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCTokenSale", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const ERCTokenSale = await ethers.getContractFactory("ERCTokenSale");
        const tokenSale = await ERCTokenSale.deploy("TestToken", "TEST");
        return { tokenSale, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { tokenSale, owner } = await loadFixture(deployFixture);
            expect(await tokenSale.owner()).to.equal(owner.address);
        });

        it("Should set the correct token name and symbol", async function () {
            const { tokenSale } = await loadFixture(deployFixture);
            expect(await tokenSale.name()).to.equal("TestToken");
            expect(await tokenSale.symbol()).to.equal("TEST");
        });

        it("Should set the correct constants", async function () {
            const { tokenSale } = await loadFixture(deployFixture);
            expect(await tokenSale.MAX_SUPPLY()).to.equal(ethers.parseUnits("1000000", 18));
            expect(await tokenSale.TOKEN_PER_ETH()).to.equal(ethers.parseUnits("1000", 18));
        });
    });

    describe("Token Minting", function () {
        it("Should mint correct amount of tokens for 1 ETH", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            
            await tokenSale.connect(otherAccount).mint({
                value: ethers.parseEther("1")
            });

            expect(await tokenSale.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("1000", 18));
        });

        it("Should mint correct amount of tokens for 0.5 ETH", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            
            await tokenSale.connect(otherAccount).mint({
                value: ethers.parseEther("0.5")
            });

            expect(await tokenSale.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("500", 18));
        });

        it("Should revert when minting with 0 ETH", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                tokenSale.connect(otherAccount).mint({
                    value: 0
                })
            ).to.be.revertedWith("Must send ETH to mint tokens");
        });

        it("Should revert when exceeding max supply", async function () {
            const { tokenSale, owner } = await loadFixture(deployFixture);
            
            // Set an enormous balance for owner
            await ethers.provider.send("hardhat_setBalance", [
                owner.address,
                ethers.toBeHex(ethers.parseEther("2000000"))
            ]);

            // Try to mint more than MAX_SUPPLY
            await expect(
                tokenSale.mint({
                    value: ethers.parseEther("1000001")
                })
            ).to.be.revertedWith("Purchase would exceed max token supply");
        });

        it("Should emit Mint event with correct parameters", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            const ethAmount = ethers.parseEther("1");
            const tokenAmount = ethers.parseUnits("1000", 18);

            await expect(tokenSale.connect(otherAccount).mint({
                value: ethAmount
            }))
                .to.emit(tokenSale, "Mint")
                .withArgs(otherAccount.address, ethAmount, tokenAmount, 0);
        });
    });

    describe("Direct ETH Payments", function () {
        it("Should mint tokens when sending ETH directly", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1");
            
            await otherAccount.sendTransaction({
                to: await tokenSale.getAddress(),
                value: amount
            });

            expect(await tokenSale.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("1000", 18));
        });

        it("Should revert when sending ETH with data", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                otherAccount.sendTransaction({
                    to: await tokenSale.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234"
                })
            ).to.be.revertedWith("You can't send ether with data on that contract");
        });
    });

    describe("Withdrawal", function () {
        it("Should allow owner to withdraw ETH", async function () {
            const { tokenSale, owner, otherAccount } = await loadFixture(deployFixture);
            
            // First mint some tokens to get ETH in the contract
            await tokenSale.connect(otherAccount).mint({
                value: ethers.parseEther("1")
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            
            // Withdraw
            await tokenSale.withdraw();

            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance - initialBalance).to.be.closeTo(
                ethers.parseEther("1"),
                ethers.parseEther("0.01") // Account for gas costs
            );
        });

        it("Should prevent non-owner from withdrawing", async function () {
            const { tokenSale, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                tokenSale.connect(otherAccount).withdraw()
            ).to.be.revertedWithCustomError(tokenSale, "OwnableUnauthorizedAccount");
        });

        it("Should prevent reentrancy on withdraw", async function () {
            const { tokenSale, owner } = await loadFixture(deployFixture);
            
            const WithdrawReentrancyAttacker = await ethers.getContractFactory("MockWithdrawReentrancyAttacker");
            const attacker = await WithdrawReentrancyAttacker.deploy(await tokenSale.getAddress());

            await owner.sendTransaction({
                to: await tokenSale.getAddress(),
                value: ethers.parseEther("2")
            });

            // Transfer ownership to the attacker contract
            await tokenSale.transferOwnership(await attacker.getAddress());
            await attacker.acceptOwnership();

            await expect(
                attacker.attack()
            ).to.be.reverted;
        });
    });
});