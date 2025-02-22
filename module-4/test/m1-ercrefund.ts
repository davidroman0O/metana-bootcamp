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

    describe("Minting and Token Issuance", function () {
        it("Should mint the right amount of tokens via mint()", async function () {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
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

        it("Should mint 500 tokens for 0.5 ETH via mint()", async function () {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
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

        describe("Direct ETH Payment (Receive Function)", function () {
            it("Should mint tokens when sending ETH directly", async function () {
                const { ercRefund, otherAccount } = await loadFixture(deployFixture);
                const contractAddress = await ercRefund.getAddress();
                
                await otherAccount.sendTransaction({
                    to: contractAddress,
                    value: ethers.parseEther("1")
                });
        
                expect(await ercRefund.balanceOf(otherAccount.address))
                    .to.equal(ethers.parseUnits("1000", 18));
            });
        
            it("Should mint correct tokens for 0.5 ETH sent directly", async function () {
                const { ercRefund, otherAccount } = await loadFixture(deployFixture);
                const contractAddress = await ercRefund.getAddress();
                
                await otherAccount.sendTransaction({
                    to: contractAddress,
                    value: ethers.parseEther("0.5")
                });
        
                expect(await ercRefund.balanceOf(otherAccount.address))
                    .to.equal(ethers.parseUnits("500", 18));
            });
        });

        describe("Invalid Minting Inputs", function () {
            it("Should revert minting when 0 ETH is sent", async function () {
                const { ercRefund, otherAccount } = await loadFixture(deployFixture);
                await expect(
                    ercRefund.connect(otherAccount).mint({
                        value: ethers.parseEther("0")
                    })
                ).to.be.revertedWith("Must send ETH to mint tokens");
            });
        });
    });

    describe("Token Reuse & Supply Cap", function () {
        describe("Reusing Existing Tokens", function () {
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
        
            it("Should partially transfer and mint when some tokens are available", async function () {
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

        describe("Supply Cap Enforcement", function () {
            it("Should revert when exceeding MAX_SUPPLY", async function () {
                const { ercRefund, owner } = await loadFixture(deployFixture);
            
                // Set an enormous balance for owner
                await ethers.provider.send("hardhat_setBalance", [
                    owner.address,
                    ethers.toBeHex(ethers.parseEther("2000000"))
                ]);
        
                // MAX_SUPPLY is 1_000_000 * 1e18; each ETH mints 1000 tokens.
                const ethNeeded = ethers.parseEther("1000000");
                
                await expect(
                    ercRefund.mint({
                        value: ethNeeded
                    })
                ).to.be.revertedWith("Cap exceeded");
            });
        });
    });

    describe("Selling Back Tokens", function () {
        it("Should sell back the right amount of tokens", async function () {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                otherAccount.address,
                ethers.toBeHex(ethers.parseEther("2")),
            ]);
    
            const otherSigner = await ethers.getSigner(otherAccount.address);
    
            await ercRefund.connect(otherSigner).mint({
                value: ethers.toBeHex(ethers.parseEther("1")),
            });
    
            await ercRefund.connect(otherSigner).sellBack(ethers.parseUnits("1000", 18));
    
            expect(await ercRefund.balanceOf(otherAccount.address)).to.equal(ethers.parseUnits("0", 18));
        });

        describe("Error Conditions", function () {
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
        
                // Withdraw ETH from the contract.
                await ercRefund.withdraw();
        
                await expect(
                    ercRefund.connect(otherAccount).sellBack(ethers.parseUnits("1000", 18))
                ).to.be.revertedWith("contract is broke");
            });
    
            it("Should revert if token transfer during sellBack fails", async function () {
                const { ercRefund, owner } = await loadFixture(deployFixture);
                
                const MaliciousToken = await ethers.getContractFactory("MockRefundFailSellBackTransferAttacker");
                const maliciousToken = await MaliciousToken.deploy();
                
                await ethers.provider.send("hardhat_setBalance", [
                    await maliciousToken.getAddress(),
                    ethers.toBeHex(ethers.parseEther("1")),
                ]);
        
                await maliciousToken.connect(owner).mint({
                    value: ethers.parseEther("1")
                });
                
                await expect(
                    maliciousToken.connect(owner).sellBack(ethers.parseUnits("1000", 18))
                ).to.be.revertedWith("Token transfer failed");
            });
        });
    });

    describe("Withdrawal Functionality", function () {
        it("Should allow the owner to withdraw the correct amount of ETH", async function () {
            const { ercRefund } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
    
            await ercRefund.withdraw();
    
            expect(await ethers.provider.getBalance(await ercRefund.getAddress())).to.equal(0);
        });
    
        it("Should revert withdrawal when called by a non-owner", async function () {
            const { ercRefund, otherAccount } = await loadFixture(deployFixture);
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
            await expect(
                ercRefund.connect(otherAccount).withdraw()
            ).to.be.revertedWithCustomError(ercRefund, "OwnableUnauthorizedAccount");
        });

        describe("Malicious Withdrawal Scenario", function () {
            it("Should revert when the receiver rejects ETH on withdraw", async function () {
                const { ercRefund, owner } = await loadFixture(deployFixture);
            
                const MockWithdrawReceiveAttacker = await ethers.getContractFactory("MockWithdrawReceiveAttacker");
                const attacker = await MockWithdrawReceiveAttacker.deploy(await ercRefund.getAddress());
            
                await ethers.provider.send("hardhat_setBalance", [
                    await ercRefund.getAddress(),
                    ethers.toBeHex(ethers.parseEther("1")),
                ]);
        
                // Transfer ownership using the two-step process.
                await ercRefund.transferOwnership(await attacker.getAddress());
                await attacker.acceptOwnership();
                
                await expect(
                    attacker.attack()
                ).to.be.revertedWith("withdraw failed");
            });
        });
    });

    describe("Fallback Behavior", function () {
        it("Should revert when sending ETH with data (fallback)", async function () {
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

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy in sellBack", async function () {
            const { ercRefund, owner } = await loadFixture(deployFixture);
            
            const ReentrancyAttacker = await ethers.getContractFactory("MockRefundSellbackReentrancyAttacker");
            const attacker = await ReentrancyAttacker.deploy(await ercRefund.getAddress());
            
            await ercRefund.connect(owner).mint({
                value: ethers.parseEther("1")
            });
            
            // Transfer tokens to the attacker.
            await ercRefund.transfer(await attacker.getAddress(), ethers.parseUnits("1000", 18));
            
            // Fund the contract for sellBack.
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("1"))
            ]);
            
            await expect(
                attacker.attack()
            ).to.be.reverted;
        });
    
        it("Should prevent reentrancy in withdraw", async function () {
            const { ercRefund } = await loadFixture(deployFixture);
            
            const MockWithdrawReentrancyAttacker = await ethers.getContractFactory("MockWithdrawReentrancyAttacker");
            const attacker = await MockWithdrawReentrancyAttacker.deploy(await ercRefund.getAddress());
            
            await ethers.provider.send("hardhat_setBalance", [
                await ercRefund.getAddress(),
                ethers.toBeHex(ethers.parseEther("2")),
            ]);
    
            // Transfer ownership to the attacker contract.
            await ercRefund.transferOwnership(await attacker.getAddress());
            await attacker.acceptOwnership();
            
            await expect(
                attacker.attack()
            ).to.be.reverted;
        });
    });

});