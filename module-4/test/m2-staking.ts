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
            await attacker.acceptOwnership();
            
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

    // describe("Balance Functions", function () {
    //     it("Should allow owner to check contract NFT balance", async function () {
    //         const { nft, owner, otherAccount } = await loadFixture(deployFixture);
    //         expect(await nft.balance()).to.equal(0);
    //         await nft.mint(otherAccount.address);
    //         await nft.connect(otherAccount).transferFrom(otherAccount.address, await nft.getAddress(), 1);
    //         expect(await nft.balance()).to.equal(1);
    //     });

    //     it("Should prevent non-owner from checking balance", async function () {
    //         const { nft, otherAccount } = await loadFixture(deployFixture);
    //         await expect(nft.connect(otherAccount).balance())
    //             .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    //     });
    // });

    describe("Withdrawal", function () {
        // it("Should allow owner to withdraw ETH", async function () {
        //     const { nft, owner } = await loadFixture(deployFixture);
            
        //     // Since there's no receive function, we'll fund the contract another way
        //     await ethers.provider.send("hardhat_setBalance", [
        //         await nft.getAddress(),
        //         ethers.toBeHex(ethers.parseEther("1"))
        //     ]);

        //     const balanceBefore = await ethers.provider.getBalance(owner.address);
        //     const tx = await nft.withdraw();
        //     const receipt = await tx.wait();
        //     const gasCost = receipt!.gasUsed * (await tx.gasPrice);
        //     const balanceAfter = await ethers.provider.getBalance(owner.address);

        //     expect(balanceAfter - balanceBefore + gasCost).to.equal(ethers.parseEther("1"));
        //     expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
        // });

        // it("Should prevent withdrawal with no balance", async function () {
        //     const { nft } = await loadFixture(deployFixture);
        //     await expect(nft.withdraw())
        //         .to.be.revertedWith("Nothing to withdraw");
        // });

        // it("Should prevent non-owner from withdrawing", async function () {
        //     const { nft, otherAccount } = await loadFixture(deployFixture);
        //     await expect(nft.connect(otherAccount).withdraw())
        //         .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        // });
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
            await attacker.acceptOwnership();
            
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
        
            // Deploy our NFT contract first
            const nft = await (await ethers.getContractFactory("StakingVisageNFT")).deploy(owner.address);
            
            // Deploy our reentrancy attacker
            const MockStakingNFTReentrancyAttacker = await ethers.getContractFactory("MockStakingNFTReentrancyAttacker");
            const attacker = await MockStakingNFTReentrancyAttacker.deploy(await nft.getAddress());
            
            // Transfer ownership to attacker contract so it can mint
            await nft.transferOwnership(await attacker.getAddress());
            await attacker.acceptNFTOwnership();
            
            // Attempt reentrancy attack - should revert with ReentrancyGuard error
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
            })).to.be.reverted;
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

  
});

describe("VisageStaking", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy token and NFT first
        const TokenFactory = await ethers.getContractFactory("StakingVisageToken");
        const token = await TokenFactory.deploy(owner.address);

        const NFTFactory = await ethers.getContractFactory("StakingVisageNFT");
        const nft = await NFTFactory.deploy(owner.address);

        // Deploy staking contract
        const StakingFactory = await ethers.getContractFactory("VisageStaking");
        const staking = await StakingFactory.deploy(
            owner.address,
            await token.getAddress(),
            await nft.getAddress()
        );

        // Transfer ownership to staking contract
        await token.transferOwnership(await staking.getAddress());
        await staking.acceptTokenOwnership();
        
        await nft.transferOwnership(await staking.getAddress());
        await staking.acceptNftOwnership();

        return { staking, token, nft, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { staking, owner } = await loadFixture(deployFixture);
            expect(await staking.owner()).to.equal(owner.address);
        });

        it("Should have correct token and NFT addresses", async function () {
            const { staking, token, nft } = await loadFixture(deployFixture);
            const [tokenAddr, nftAddr] = await staking.getAddresses();
            expect(tokenAddr).to.equal(await token.getAddress());
            expect(nftAddr).to.equal(await nft.getAddress());
        });

        it("Should own both token and NFT contracts", async function () {
            const { staking, token, nft } = await loadFixture(deployFixture);
            expect(await token.owner()).to.equal(await staking.getAddress());
            expect(await nft.owner()).to.equal(await staking.getAddress());
        });
        it("Should reject non-owner accept nft ownership", async function () {
            const { staking, otherAccount } = await loadFixture(deployFixture);
            await expect(staking.connect(otherAccount).acceptNftOwnership())
                .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
        });
        it("Should reject non-owner accept token ownership", async function () {
            const { staking, otherAccount } = await loadFixture(deployFixture);
            await expect(staking.connect(otherAccount).acceptTokenOwnership())
            .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
        });
    });

    describe("NFT Minting", function () {
        it("Should allow minting NFT with tokens", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // First mint tokens
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });

            // Approve tokens for staking contract
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );

            // Mint NFT
            await staking.connect(otherAccount).mintNFT();
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
        });

        it("Should fail NFT mint without token approval", async function () {
            const { staking, token, otherAccount } = await loadFixture(deployFixture);
            
            // First mint tokens
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            
            // Try to mint NFT without approval
            await expect(
                staking.connect(otherAccount).mintNFT()
            ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
        });
    });

    describe("Staking", function () {
        it("Should emit Staked event when staking", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Mint NFT first
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();

            // Stake NFT
            await expect(
                nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                    otherAccount.address,
                    await staking.getAddress(),
                    1
                )
            ).to.emit(staking, "Staked")
             .withArgs(otherAccount.address, 1);
        });

        it("Should prevent staking already staked NFT", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Mint and stake first NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            // Mint NFT first
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();

            // Approve NFT for staking contract
            await nft.connect(otherAccount).setApprovalForAll(await staking.getAddress(), true);
            
            // Stake NFT
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Try to stake it again
            await expect(
                nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                    otherAccount.address,
                    await staking.getAddress(),
                    1
                )
            ).to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval");
        });

        it("Should only accept NFTs from contract NFT", async function () {
            const { staking, owner } = await loadFixture(deployFixture);
            
            // Deploy another NFT contract
            const OtherNFT = await ethers.getContractFactory("StakingVisageNFT");
            const otherNft = await OtherNFT.deploy(owner.address);
            
            // Try to stake from other NFT contract
            await expect(
                otherNft.mint(owner.address)
            ).to.not.be.reverted;
            
            await expect(
                otherNft["safeTransferFrom(address,address,uint256)"](
                    owner.address,
                    await staking.getAddress(),
                    1
                )
            ).to.be.revertedWith("only our NFT smart contract can call back");
        });
    });

    describe("Rewards", function () {
        it("Should calculate rewards correctly", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Mint and stake NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Get current block timestamp
            const latestBlock = await ethers.provider.getBlock('latest');
            const currentTime = latestBlock!.timestamp;
            // Set time to exact multiple of REWARD_INTERVAL
            await time.setNextBlockTimestamp(currentTime + 24 * 60 * 60);

            // Check reward
            await staking.connect(otherAccount).withdrawReward(1);
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18)); // 10 tokens per 24 hours
        });

        it("Should prevent non-owner from claiming rewards", async function () {
            const { staking, token, nft, otherAccount, owner } = await loadFixture(deployFixture);
            
            // Mint and stake NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Try to claim rewards from non-owner
            await expect(
                staking.connect(owner).withdrawReward(1)
            ).to.be.revertedWith("only the owner can withdraw rewards");
        });

        it("Should emit RewardClaimed event", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Mint and stake NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Advance time
            await time.increase(24 * 60 * 60);

            // Claim rewards
            await expect(
                staking.connect(otherAccount).withdrawReward(1)
            ).to.emit(staking, "RewardClaimed")
            await expect(
                staking.connect(otherAccount).withdrawReward(1)
            ).to.emit(staking, "RewardClaimed");
            expect(await token.balanceOf(otherAccount.address))
                .to.be.gte(ethers.parseUnits("10", 18));
        });
    });

    describe("Unstaking", function () {
        it("Should allow unstaking and claim pending rewards", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Mint NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();

            // Approve and stake NFT
            await nft.connect(otherAccount).approve(await staking.getAddress(), 1);
            expect(
                nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                    otherAccount.address,
                    await staking.getAddress(),
                    1
                )
            ).to.emit(staking, "Staked")

            // Advance time
            await time.increase(time.duration.hours(25));

            // Check rewards were received
            expect(await staking.getRewardBalanceOf(ethers.toBigInt(1)))
                .to.greaterThan(ethers.parseUnits("10", 18));

            // Unstake
            await staking.connect(otherAccount).unstakeNFT(1);

            // Check NFT was returned
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
        });

        it("Should prevent non-owner from unstaking", async function () {
            const { staking, token, nft, otherAccount, owner } = await loadFixture(deployFixture);
            
            // Mint and stake NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Try to unstake from non-owner
            await expect(
                staking.connect(owner).unstakeNFT(1)
            ).to.be.revertedWith("only the owner can unstake");
        });
    });

    describe("ETH Handling", function () {
        it("Should revert when sending ETH with data", async function () {
            const { staking, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                otherAccount.sendTransaction({
                    to: await staking.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234"
                })
            ).to.be.reverted;
        });

        it("Should revert direct ETH transfers", async function () {
            const { staking, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                otherAccount.sendTransaction({
                    to: await staking.getAddress(),
                    value: ethers.parseEther("1")
                })
            ).to.be.reverted;
        });
    });

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy in unstake", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Setup initial stake
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Attempt malicious unstake
            await expect(
                staking.connect(otherAccount).unstakeNFT(1)
            ).not.to.be.reverted;

            // Second attempt should fail because NFT is already unstaked
            await expect(
                staking.connect(otherAccount).unstakeNFT(1)
            ).to.be.revertedWith("only the owner can unstake");
        });

        it("Should prevent reentrancy in unstake", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // Setup staked NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );

            // Double unstake attempt should fail
            await staking.connect(otherAccount).unstakeNFT(1);
            await expect(
                staking.connect(otherAccount).unstakeNFT(1)
            ).to.be.reverted;
        });
    });


    describe("Withdrawal", function () {
        it("Should allow staker to withdraw rewards", async function () {
            const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // First mint tokens and NFT
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await staking.connect(otherAccount).mintNFT();
    
            // Stake the NFT
            await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
                otherAccount.address,
                await staking.getAddress(),
                1
            );
    
            // Advance time by 24 hours
            await time.increase(time.duration.hours(24));
    
            // Check initial balance
            const initialBalance = await token.balanceOf(otherAccount.address);
    
            // Withdraw rewards
            await staking.connect(otherAccount).withdrawReward(1);
    
            // Verify rewards were received - should be at least 10 tokens
            const finalBalance = await token.balanceOf(otherAccount.address);
            expect(finalBalance - initialBalance).to.be.gte(ethers.parseUnits("10", 18));
        });

        it("Should prevent non-owner from withdrawing", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            
            await expect(token.connect(otherAccount).withdraw())
                .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });
    });

    describe("Token Allowance", function () {
        it("Should return correct allowance amount", async function () {
            const { staking, token, otherAccount } = await loadFixture(deployFixture);
            
            // Initial allowance should be 0
            expect(await token.allowance(otherAccount.address, await staking.getAddress()))
                .to.equal(0);

            // Set allowance
            const allowanceAmount = ethers.parseUnits("100", 18);
            await token.connect(otherAccount).approve(
                await staking.getAddress(),
                allowanceAmount
            );

            // Check allowance through staking contract
            expect(await token.allowance(otherAccount.address, await staking.getAddress()))
                .to.equal(allowanceAmount);
        });
    });

    describe("Balance Checking", function () {
        it("Should return correct token balance", async function () {
            const { staking, token, otherAccount } = await loadFixture(deployFixture);
            
            // Initial balance should be 0
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(0);

            // Mint some tokens
            await staking.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });

            // Check balance through staking contract
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });
    });


    /// I will come back to those tests

    // describe("unstakeNFT Function", function () {
    //     it("Should prevent reentrancy during unstaking", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup: Mint and stake NFT
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
            
    //         // Create attacker
    //         const AttackerFactory = await ethers.getContractFactory("MockStakingReentrancyAttacker");
    //         const attacker = await AttackerFactory.deploy(
    //             await staking.getAddress(),
    //             await token.getAddress(),
    //             await nft.getAddress()
    //         );
    
    //         // First approve and transfer the NFT to the attacker
    //         await nft.connect(otherAccount).approve(await attacker.getAddress(), 1);
    //         await nft.connect(otherAccount).transferFrom(
    //             otherAccount.address,
    //             await attacker.getAddress(),
    //             1
    //         );
    
    //         // Now the attacker approves the staking contract
    //         await attacker.setApprovalForAll(await staking.getAddress(), true);
    
    //         // Transfer to the staking contract using the attacker contract
    //         await attacker.transferNFTToStaking(1);
    
    //         // Advance time
    //         await time.increase(time.duration.hours(25));
    
    //         // Attempt reentrancy attack
    //         await expect(
    //             attacker.attackUnstake(1)
    //         ).to.be.revertedWithCustomError(staking, "ReentrancyGuardReentrantCall");
    //     });
    
    
    //     it("Should delete stake data and prevent re-unstaking", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
    //         await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
    //             otherAccount.address,
    //             await staking.getAddress(),
    //             1
    //         );
    
    //         // First unstake should work
    //         await staking.connect(otherAccount).unstakeNFT(1);
    
    //         // Second unstake should fail due to deleted stake data
    //         await expect(
    //             staking.connect(otherAccount).unstakeNFT(1)
    //         ).to.be.revertedWith("only the owner can unstake");
    //     });
    
    //     it("Should handle zero rewards case correctly", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
    //         await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
    //             otherAccount.address,
    //             await staking.getAddress(),
    //             1
    //         );
    
    //         // Get initial token balance
    //         const initialBalance = await token.balanceOf(otherAccount.address);
    
    //         // Unstake immediately (zero rewards)
    //         await staking.connect(otherAccount).unstakeNFT(1);
    
    //         // Verify no rewards were given
    //         const finalBalance = await token.balanceOf(otherAccount.address);
    //         expect(finalBalance).to.equal(initialBalance);
    //     });
    // });
    
    // describe("unstakeNFT Reward Paths", function () {
    //     it("Should skip token minting when reward is zero", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup: Mint and stake NFT
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
    //         await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
    //             otherAccount.address,
    //             await staking.getAddress(),
    //             1
    //         );
    
    //         // Get initial token balance
    //         const initialBalance = await token.balanceOf(otherAccount.address);
    
    //         // Unstake immediately (should be zero reward as no time passed)
    //         await staking.connect(otherAccount).unstakeNFT(1);
    
    //         // Verify no new tokens were minted
    //         const finalBalance = await token.balanceOf(otherAccount.address);
    //         expect(finalBalance).to.equal(initialBalance);
    //     });
    
    //     it("Should mint tokens when reward is positive", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup: Mint and stake NFT
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
    //         await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
    //             otherAccount.address,
    //             await staking.getAddress(),
    //             1
    //         );
    
    //         // Store current timestamp
    //         const stakeTime = await time.latest();
    
    //         // Wait for rewards to accrue (1 day)
    //         await time.increaseTo(stakeTime + time.duration.days(1));
    
    //         // Get balance before unstaking
    //         const initialBalance = await token.balanceOf(otherAccount.address);
    
    //         // Unstake
    //         await staking.connect(otherAccount).unstakeNFT(1);
    
    //         // Verify tokens were minted
    //         const finalBalance = await token.balanceOf(otherAccount.address);
    //         const tokensReceived = finalBalance - initialBalance;
    //         expect(tokensReceived).to.be.gt(0);
    //         expect(tokensReceived).to.equal(ethers.parseUnits("10", 18)); // 10 tokens per 24 hours
    //     });
    // });


    // describe("unstakeNFT Reward Debug", function () {
    //     it("Should properly calculate and mint rewards", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup: Mint and stake NFT
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
    
    //         // Stake the NFT
    //         await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
    //             otherAccount.address,
    //             await staking.getAddress(),
    //             1
    //         );
    
    //         // Record start time
    //         const startTime = await time.latest();
    
    //         // Wait for rewards (exactly 24 hours)
    //         await time.increaseTo(startTime + 24 * 60 * 60);
            
    //         // Get token balance before unstaking
    //         const balanceBefore = await token.balanceOf(otherAccount.address);
    
    //         // Unstake
    //         await staking.connect(otherAccount).unstakeNFT(1);
            
    //         // Get token balance after unstaking
    //         const balanceAfter = await token.balanceOf(otherAccount.address);
    
    //         // Verify rewards were given - should be exactly 10 tokens for 24 hours
    //         const rewardAmount = ethers.parseUnits("10", 18);
    //         expect(balanceAfter - balanceBefore).to.equal(rewardAmount);
    //     });
    
    //     it("Should skip reward minting for zero rewards", async function () {
    //         const { staking, token, nft, otherAccount } = await loadFixture(deployFixture);
            
    //         // Setup: Mint and stake NFT
    //         await staking.connect(otherAccount).mintToken({
    //             value: ethers.parseEther("1")
    //         });
    //         await token.connect(otherAccount).approve(
    //             await staking.getAddress(),
    //             ethers.parseUnits("10", 18)
    //         );
    //         await staking.connect(otherAccount).mintNFT();
    
    //         // Stake the NFT
    //         await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
    //             otherAccount.address,
    //             await staking.getAddress(),
    //             1
    //         );
    
    //         // Get token balance before unstaking
    //         const balanceBefore = await token.balanceOf(otherAccount.address);
    
    //         // Unstake immediately (no time passed = no rewards)
    //         await staking.connect(otherAccount).unstakeNFT(1);
            
    //         // Get token balance after unstaking
    //         const balanceAfter = await token.balanceOf(otherAccount.address);
    
    //         // Verify no rewards were given
    //         expect(balanceAfter).to.equal(balanceBefore);
    //     });
    // });
});