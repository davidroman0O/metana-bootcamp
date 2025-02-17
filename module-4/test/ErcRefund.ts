import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("ERCRefund", function () {

    async function deployFixture() {
        const [owner, otherAccount] = await hre.ethers.getSigners();
        const ErcRefund = await hre.ethers.getContractFactory("ERCRefund");
        const ercRefund = await ErcRefund.deploy();
        return { ercRefund, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
            expect(await ercRefund.owner()).to.equal(owner.address);
        });
    });

    describe("Minting", function () {
        it("Should mint the right amount of tokens", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                otherAccount.address,
                ethers.toBeHex(ethers.parseEther("2")),
            ]);

            const otherSigner = await ethers.getSigner(otherAccount.address);

            await ercRefund.connect(otherSigner).mint({
                value: ethers.toBeHex(ethers.parseEther("1")),
            });

            expect(await ercRefund.balanceOf(otherAccount.address)).to.equal(ethers.parseUnits("1000", 18));
        });

        it("Should mint 500 tokens for half ether", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                otherAccount.address,
                ethers.toBeHex(ethers.parseEther("2")),
            ]);

            const otherSigner = await ethers.getSigner(otherAccount.address);

            await ercRefund.connect(otherSigner).mint({
                value: ethers.toBeHex(ethers.parseEther("0.5")),
            });

            expect(await ercRefund.balanceOf(otherAccount.address)).to.equal(ethers.parseUnits("500", 18));
        });


    });

    describe("Selling back", function () {
         it("Should sell back the right amount of tokens", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                otherAccount.address,
                ethers.toBeHex(ethers.parseEther("2")),
            ]);

            const otherSigner = await ethers.getSigner(otherAccount.address);

            await ercRefund.connect(otherSigner).mint({
                value: ethers.toBeHex(ethers.parseEther("1")), // you get 1k tokens
            });

            await ercRefund.connect(otherSigner).sellBack(ethers.parseUnits("1000", 18));

            expect(await ercRefund.balanceOf(otherAccount.address)).to.equal(ethers.parseUnits("0", 18));
        });
    });


    describe("Fallback function", function() {
        it("Should revert when sending ETH directly", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
            await expect(
                owner.sendTransaction({
                    to: await ercRefund.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234",
                })
            ).to.be.revertedWith("You can't send ether with data on that contract");
        });
    });

    describe("Receive function", function () {
        it("Should mint tokens when sending ETH directly to contract", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            
            const contractAddress = await ercRefund.getAddress();
            
            await otherAccount.sendTransaction({
                to: contractAddress,
                value: ethers.parseEther("1")
            });
    
            expect(await ercRefund.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("1000", 18));
        });
    
        it("Should mint correct amount of tokens for 0.5 ETH sent directly", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            
            const contractAddress = await ercRefund.getAddress();
            
            await otherAccount.sendTransaction({
                to: contractAddress,
                value: ethers.parseEther("0.5")
            });
    
            expect(await ercRefund.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("500", 18));
        });
    });

    describe("Withdraw owner", function() {

        it("Should withdraw the right amount of ether", async function () {
            const { ercRefund } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);

            await ercRefund.withdraw();

            expect(await ethers.provider.getBalance(await ercRefund.getAddress())).to.equal(0);
        });

        it("Should revert when not owner", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
            await expect(
                ercRefund.connect(otherAccount).withdraw()
            ).to.be.revertedWithCustomError(ercRefund, "OwnableUnauthorizedAccount")
        });
    });

    describe("Minting with existing tokens", function () {
        it("Should transfer existing tokens when available", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            
            await ercRefund.connect(owner).mint({
                value: ethers.parseEther("1")
            });
            
            await ercRefund.connect(owner).transfer(
                await ercRefund.getAddress(), 
                ethers.parseUnits("1000", 18)
            );
            
            await ercRefund.connect(otherAccount).mint({
                value: ethers.parseEther("0.5")
            });
            
            expect(await ercRefund.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("500", 18));
            
            expect(await ercRefund.balanceOf(await ercRefund.getAddress()))
                .to.equal(ethers.parseUnits("500", 18));
        });
    
        it("Should partially transfer and mint when some tokens available", async function () {
            const { ercRefund, owner, otherAccount } = await loadFixture(deployFixture);
            
            await ercRefund.connect(owner).mint({
                value: ethers.parseEther("0.3")
            });
            
            await ercRefund.connect(owner).transfer(
                await ercRefund.getAddress(), 
                ethers.parseUnits("300", 18)
            );
            
            await ercRefund.connect(otherAccount).mint({
                value: ethers.parseEther("0.5")
            });
            
            expect(await ercRefund.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("500", 18));
            
            expect(await ercRefund.balanceOf(await ercRefund.getAddress()))
                .to.equal(0);
        });
    });

    describe("Supply cap", function () {
        it("Should revert when exceeding MAX_SUPPLY", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
        
            // Set a very large balance for owner
            await ethers.provider.send("hardhat_setBalance", [
                owner.address,
                ethers.toBeHex(ethers.parseEther("2000000")) // 2 million ETH should be enough
            ]);
    
            // Calculate how many ETH needed to exceed MAX_SUPPLY
            // MAX_SUPPLY is 1_000_000 * 1e18
            // Each ETH gives 1000 tokens
            const ethNeeded = ethers.parseEther("1000000"); // This should exceed MAX_SUPPLY
            
            await expect(
                ercRefund.mint({
                    value: ethNeeded
                })
            ).to.be.revertedWith("Cap exceeded");
        });
    });

    describe("SellBack error conditions", function () {
        it("Should revert when trying to sell 0 tokens", async function () {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
            await expect(
                ercRefund.connect(otherAccount).sellBack(0)
            ).to.be.revertedWith("cannot sell 0 tokens");
        });
    
        it("Should revert when contract has insufficient ETH balance", async function () {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
        
            await ercRefund.connect(otherAccount).mint({
                value: ethers.parseEther("1")
            });
    
            // Drain the contract
            await ercRefund.withdraw();
    
            // Try to sell tokens
            await expect(
                ercRefund.connect(otherAccount).sellBack(ethers.parseUnits("1000", 18))
            ).to.be.revertedWith("contract is broke");
        });
    });
    
    describe("SellBack transfer failure", function () {
        it("Should revert if transfer to contract fails", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
            
            const MaliciousToken = await ethers.getContractFactory("MaliciousERC20");
            const maliciousToken = await MaliciousToken.deploy();
            
            // Fund the malicious contract with ETH so it doesn't fail the balance check
            await ethers.provider.send("hardhat_setBalance", [
                await maliciousToken.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
    
            // Mint some tokens to the owner
            await maliciousToken.connect(owner).mint({
                value: ethers.parseEther("1")
            });
            
            // Try to sell back tokens (this should fail because transfer will fail)
            await expect(
                maliciousToken.connect(owner).sellBack(ethers.parseUnits("1000", 18))
            ).to.be.revertedWith("Token transfer failed");
        });
    });

    describe("Reentrancy protection", function () {
        it("Should prevent reentrancy in sellBack", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
            
            const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
            const attacker = await ReentrancyAttacker.deploy(await ercRefund.getAddress());
            
            await ercRefund.connect(owner).mint({
                value: ethers.parseEther("1")
            });
            
            // Transfer tokens to attacker
            await ercRefund.transfer(await attacker.getAddress(), ethers.parseUnits("1000", 18));
            
            // Fund contract for sellback
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1"))
            ]);
            
            // Try to attack - should revert
            await expect(
                attacker.attack()
            ).to.be.reverted;
        });
    });

    describe("Withdraw failure", function() {
        it("Should revert when receiver rejects ETH", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
        
            const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
            const maliciousReceiver = await MaliciousReceiver.deploy(await ercRefund.getAddress());
        
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
    
            // Transfer ownership to malicious contract - two step process
            await ercRefund.transferOwnership(await maliciousReceiver.getAddress());
            await maliciousReceiver.acceptRefundOwnership();
            
            // Set receiver to reject ETH
            await maliciousReceiver.setReject(true);
            

            await expect(
                maliciousReceiver.withdrawFromRefund()
            ).to.be.revertedWith("withdraw failed");
        });
    });

    describe("Edge cases", function() {
        it("Should revert when trying to mint with 0 ETH", async function() {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                ercRefund.connect(otherAccount).mint({
                    value: ethers.parseEther("0")
                })
            ).to.be.revertedWith("Must send ETH to mint tokens");
        });
    
        it("Should prevent reentrancy in withdraw", async function() {
            const { ercRefund, owner } = await loadFixture(deployFixture);
            
            const WithdrawReentrancyAttacker = await ethers.getContractFactory("WithdrawReentrancyAttacker");
            const attacker = await WithdrawReentrancyAttacker.deploy(await ercRefund.getAddress());
            
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("2")),
            ]);
    
            // Transfer ownership to attacker contract
            await ercRefund.transferOwnership(await attacker.getAddress());
            await attacker.acceptRefundOwnership();
            
            await expect(
                attacker.attack()
            ).to.be.reverted; // Will revert due to reentrancy guard
        });
    });

});
