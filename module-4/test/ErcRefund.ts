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


    describe("Contract events", function() {
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



});
