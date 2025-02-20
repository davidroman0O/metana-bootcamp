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

    // Testing the two `nonReentrant` in the NFT contract
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

        it("Should prevent reentrancy in mint", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            
            // Deploy our reentrancy attacker
            const MockNFTReentrancyAttacker = await ethers.getContractFactory("MockNFTReentrancyAttacker");
            const attacker = await MockNFTReentrancyAttacker.deploy(await nft.getAddress());
            
            // Transfer ownership to attacker contract
            await nft.transferOwnership(await attacker.getAddress());
            await attacker.acceptNFTOwnership();
            
            // Attempt reentrancy attack
            await expect(attacker.attack())
                .to.be.revertedWithCustomError(nft, "ReentrancyGuardReentrantCall");
        });
    });
    
});

describe("ExchangeVisageToken", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const TokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
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

        it("Should revert when deploying with zero address", async function () {
            const TokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
            await expect(TokenFactory.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(TokenFactory, "OwnableInvalidOwner");
        });

        it("Should set the correct constants", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.TOKENS_PER_ETH()).to.equal(ethers.parseUnits("10", 18)); // 10 tokens per ETH
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
            
            await expect(
                token.connect(otherAccount).mint(otherAccount.address, {
                    value: 0
                })
            ).to.be.revertedWith("send eth to buy tokens");
        });

        it("Should emit Mint event with correct parameters", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            const ethAmount = ethers.parseEther("1");
            const tokenAmount = ethers.parseUnits("10", 18);

            await expect(token.connect(otherAccount).mint(otherAccount.address, {
                value: ethAmount
            }))
                .to.emit(token, "Mint")
                .withArgs(otherAccount.address, ethAmount, tokenAmount, 0);
        });

        // testing the require statement in the mint function
        it("Should revert when exceeding max supply", async function () {
            const { token, owner } = await loadFixture(deployFixture);
            
            // Give owner enough ETH for the test
            await ethers.provider.send("hardhat_setBalance", [
                owner.address,
                ethers.toBeHex(ethers.parseEther("1000000"))
            ]);
                    
            await expect(
                token.mint(owner.address, {
                    value: ethers.parseEther("100001") // Just over what's needed
                })
            ).to.be.revertedWith("mint would exceed max token supply");
        });
    });

    describe("ETH Handling", function () {
        it("Should accept ETH via receive and mint tokens", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            
            await otherAccount.sendTransaction({
                to: await token.getAddress(),
                value: ethers.parseEther("1")
            });

            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });

        it("Should revert when sending ETH with data", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                otherAccount.sendTransaction({
                    to: await token.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234"
                })
            ).to.be.revertedWith("You can't send ether with data on that contract");
        });
    });

    describe("Withdrawal", function () {
        it("Should allow owner to withdraw ETH", async function () {
            const { token, owner, otherAccount } = await loadFixture(deployFixture);
            
            // First mint some tokens to get ETH in the contract
            await token.connect(otherAccount).mint(otherAccount.address, {
                value: ethers.parseEther("1")
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            const tx = await token.withdraw();
            const receipt = await tx.wait();
            const gasCost = receipt!.gasUsed * (await tx.gasPrice);
            
            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance - initialBalance + gasCost)
                .to.equal(ethers.parseEther("1"));
        });

        it("Should prevent non-owner from withdrawing", async function () {
            const { token, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                token.connect(otherAccount).withdraw()
            ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
        });

        it("Should handle withdrawal with no balance", async function () {
            const { token } = await loadFixture(deployFixture);
            await expect(token.withdraw())
                .to.be.revertedWith("Nothing to withdraw");
        });

        it("Should revert when receiver rejects ETH", async function () {
            const { token, owner } = await loadFixture(deployFixture);
            
            // Deploy the malicious receiver
            const MockNFTReceiver = await ethers.getContractFactory("MockNFTReceiver");
            const mockReceiver = await MockNFTReceiver.deploy(await token.getAddress());
            
            // Fund the token contract
            await ethers.provider.send("hardhat_setBalance", [
                await token.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);
            
            // Transfer ownership using the two-step process
            await token.transferOwnership(await mockReceiver.getAddress());
            await mockReceiver.acceptNFTOwnership();
            
            // Configure the receiver to reject ETH
            await mockReceiver.setReject(true);
            
            // Attempt withdrawal should fail
            await expect(
                mockReceiver.withdrawFromNFT()
            ).to.be.revertedWith("withdraw failed");
        });
    });

});



describe("VisageExchange", function () {
    async function deployFixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy token and NFT first
        const TokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
        const token = await TokenFactory.deploy(owner.address);

        const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
        const nft = await NFTFactory.deploy(owner.address);

        // Deploy exchange
        const ExchangeFactory = await ethers.getContractFactory("VisageExchange");
        const exchange = await ExchangeFactory.deploy(
            owner.address,
            await token.getAddress(),
            await nft.getAddress()
        );

        // Transfer ownership to exchange
        await token.transferOwnership(await exchange.getAddress());
        await exchange.acceptTokenOwnership();
        
        await nft.transferOwnership(await exchange.getAddress());
        await exchange.acceptNftOwnership();

        return { exchange, token, nft, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { exchange, owner } = await loadFixture(deployFixture);
            expect(await exchange.owner()).to.equal(owner.address);
        });

        it("Should have correct token and NFT addresses", async function () {
            const { exchange, token, nft } = await loadFixture(deployFixture);
            const [tokenAddr, nftAddr] = await exchange.getAddresses();
            expect(tokenAddr).to.equal(await token.getAddress());
            expect(nftAddr).to.equal(await nft.getAddress());
        });

        it("Should own both token and NFT contracts", async function () {
            const { exchange, token, nft } = await loadFixture(deployFixture);
            expect(await token.owner()).to.equal(await exchange.getAddress());
            expect(await nft.owner()).to.equal(await exchange.getAddress());
        });

        it("Should revert when deploying with zero address owner", async function () {
            const [owner] = await ethers.getSigners();
            const TokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
            const token = await TokenFactory.deploy(owner.address);
            const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
            const nft = await NFTFactory.deploy(owner.address);
            const ExchangeFactory = await ethers.getContractFactory("VisageExchange");

            await expect(
                ExchangeFactory.deploy(
                    ethers.ZeroAddress,
                    await token.getAddress(),
                    await nft.getAddress()
                )
            ).to.be.revertedWithCustomError(ExchangeFactory, "OwnableInvalidOwner");
        });
    });

    describe("Ownership", function () {
        it("Should prevent non-owner from accepting NFT ownership", async function () {
            const { exchange, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                exchange.connect(otherAccount).acceptNftOwnership()
            ).to.be.revertedWithCustomError(exchange, "OwnableUnauthorizedAccount")
            .withArgs(otherAccount.address);
        });
    
        it("Should prevent non-owner from accepting token ownership", async function () {
            const { exchange, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                exchange.connect(otherAccount).acceptTokenOwnership()
            ).to.be.revertedWithCustomError(exchange, "OwnableUnauthorizedAccount")
            .withArgs(otherAccount.address);
        });
    });

    describe("Token Operations", function () {
        it("Should mint correct amount of tokens for ETH", async function () {
            const { exchange, token, otherAccount } = await loadFixture(deployFixture);
            
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });

            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });

        it("Should track token balances correctly", async function () {
            const { exchange, otherAccount } = await loadFixture(deployFixture);
            
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
        
            expect(await exchange.connect(otherAccount).balance())
                .to.equal(ethers.parseUnits("10", 18));
            
            expect(await exchange.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });

        it("Should track allowances correctly", async function () {
            const { exchange, token, otherAccount } = await loadFixture(deployFixture);
            
            // Mint tokens
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });

            // Initial allowance should be 0
            expect(await exchange.connect(otherAccount).allowance())
                .to.equal(0);

            // Approve tokens
            await token.connect(otherAccount).approve(
                await exchange.getAddress(),
                ethers.parseUnits("10", 18)
            );

            // Check updated allowance
            expect(await exchange.connect(otherAccount).allowance())
                .to.equal(ethers.parseUnits("10", 18));
        });
    });

    describe("NFT Operations", function () {
        it("Should allow minting NFT with tokens", async function () {
            const { exchange, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // First mint tokens
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });

            // Approve tokens for exchange
            await token.connect(otherAccount).approve(
                await exchange.getAddress(),
                ethers.parseUnits("10", 18)
            );

            // Mint NFT
            await exchange.connect(otherAccount).mintNFT();
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
        });

        it("Should fail NFT mint without token approval", async function () {
            const { exchange, token, otherAccount } = await loadFixture(deployFixture);
        
            // First mint tokens
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            
            // Try to mint NFT without approval
            await expect(
                exchange.connect(otherAccount).mintNFT()
            ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
            .withArgs(
                await exchange.getAddress(),  // exchange is the spender
                0,                           // current allowance
                ethers.parseUnits("10", 18)  // needed amount
            );
        });

        it("Should enforce NFT max supply", async function () {
            const { exchange, token, otherAccount } = await loadFixture(deployFixture);
            
            // Mint enough tokens for multiple NFTs
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("11")
            });

            // Approve tokens
            await token.connect(otherAccount).approve(
                await exchange.getAddress(),
                ethers.parseUnits("110", 18)
            );

            // Mint NFTs up to max supply
            for(let i = 0; i < 10; i++) {
                await exchange.connect(otherAccount).mintNFT();
            }

            // Try to mint one more
            await expect(
                exchange.connect(otherAccount).mintNFT()
            ).to.be.revertedWith("no more NFT to mint");
        });
    });

    describe("ETH Handling", function () {
        it("Should accept ETH and mint tokens via receive", async function () {
            const { exchange, token, otherAccount } = await loadFixture(deployFixture);
            
            await otherAccount.sendTransaction({
                to: await exchange.getAddress(),
                value: ethers.parseEther("1")
            });

            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));
        });

        it("Should revert when sending ETH with data", async function () {
            const { exchange, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                otherAccount.sendTransaction({
                    to: await exchange.getAddress(),
                    value: ethers.parseEther("1"),
                    data: "0x1234"
                })
            ).to.be.revertedWith("You can't send ether with data on that contract");
        });
        

        it("Should prevent non-owner from withdrawing", async function () {
            const { exchange, otherAccount } = await loadFixture(deployFixture);
            
            await expect(
                exchange.connect(otherAccount).withdraw()
            ).to.be.revertedWithCustomError(exchange, "OwnableUnauthorizedAccount");
        });

        it("Should handle withdrawal with no balance", async function () {
            const { exchange } = await loadFixture(deployFixture);
            await expect(exchange.withdraw())
                .to.be.revertedWith("Nothing to withdraw");
        });

        // Targeting the `require(success, "withdraw failed");` line
        it("Should handle failed withdrawals from exchange", async function () {
            const { owner, exchange } = await loadFixture(deployFixture);

            await ethers.provider.send("hardhat_setBalance", [
                await exchange.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);

            await expect(exchange.withdraw())
          
            // Deploy the rejecting contract.
            const RejectETHFactory = await ethers.getContractFactory("RejectETH");
            const rejectETH = await RejectETHFactory.deploy(exchange);
          
            // Transfer exchange ownership to the rejecting contract.
            await exchange.transferOwnership(await rejectETH.getAddress());
            await rejectETH.acceptOwnership();

            console.log("owner address", owner.address);
            
            console.log("exchange address", await exchange.getAddress());
            console.log("rejectETH address", await rejectETH.getAddress());

            console.log("rejectETH owner", await rejectETH.owner());
            console.log("exchange owner", await exchange.owner());
          
            
            await expect(rejectETH.withdraw()).to.be.revertedWith("Nothing to withdraw");

            await ethers.provider.send("hardhat_setBalance", [
                await exchange.getAddress(),
                ethers.toBeHex(ethers.parseEther("1")),
            ]);

            console.log("balance of exchange", await ethers.provider.getBalance(await exchange.getAddress()));

            await expect(rejectETH.withdraw()).to.be.revertedWith("withdraw failed");
          });
          
        
    });

    describe("Integration Tests", function () {
        it("Should complete full mint and trade cycle", async function () {
            const { exchange, token, nft, otherAccount } = await loadFixture(deployFixture);
            
            // 1. Mint tokens
            await exchange.connect(otherAccount).mintToken({
                value: ethers.parseEther("1")
            });
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(ethers.parseUnits("10", 18));

            // 2. Approve tokens
            await token.connect(otherAccount).approve(
                await exchange.getAddress(),
                ethers.parseUnits("10", 18)
            );
            expect(await exchange.connect(otherAccount).allowance())
                .to.equal(ethers.parseUnits("10", 18));

            // 3. Mint NFT
            await exchange.connect(otherAccount).mintNFT();
            expect(await nft.ownerOf(1)).to.equal(otherAccount.address);

            // 4. Verify token balance reduced
            expect(await token.balanceOf(otherAccount.address))
                .to.equal(0);
        });

        it("Should handle multiple users", async function () {
            const { exchange, token, nft } = await loadFixture(deployFixture);
            const [_, user1, user2] = await ethers.getSigners();
            
            // User 1 mints tokens and NFT
            await exchange.connect(user1).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(user1).approve(
                await exchange.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await exchange.connect(user1).mintNFT();

            // User 2 mints tokens and NFT
            await exchange.connect(user2).mintToken({
                value: ethers.parseEther("1")
            });
            await token.connect(user2).approve(
                await exchange.getAddress(),
                ethers.parseUnits("10", 18)
            );
            await exchange.connect(user2).mintNFT();

            // Verify ownership
            expect(await nft.ownerOf(1)).to.equal(user1.address);
            expect(await nft.ownerOf(2)).to.equal(user2.address);
        });
    });
});