import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { 
    ExchangeVisageNFT,
    ExchangeVisageToken,
    VisageExchange,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// describe("Exchange System", function () {
//     async function deployFixture() {
//         const [owner, otherAccount]: SignerWithAddress[] = await ethers.getSigners();
        
//         // Deploy token and NFT contracts
//         const TokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
//         const token = await TokenFactory.deploy(owner.address) as ExchangeVisageToken;

//         const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
//         const nft = await NFTFactory.deploy(owner.address) as ExchangeVisageNFT;

//         // Deploy exchange with references
//         const ExchangeFactory = await ethers.getContractFactory("VisageExchange");
//         const exchange = await ExchangeFactory.deploy(
//             owner.address,
//             await token.getAddress(),
//             await nft.getAddress()
//         ) as VisageExchange;

//         // Transfer ownership to exchange
//         await token.transferOwnership(await exchange.getAddress());
//         await exchange.acceptTokenOwnership();
        
//         await nft.transferOwnership(await exchange.getAddress());
//         await exchange.acceptNftOwnership();

//         return { exchange, token, nft, owner, otherAccount };
//     }

//     describe("Contract Deployment", function () {
//         it("Should set correct initial owners", async function () {
//             const [owner] = await ethers.getSigners();
            
//             const TokenFactory = await ethers.getContractFactory("ExchangeVisageToken");
//             const token = await TokenFactory.deploy(owner.address);
//             expect(await token.owner()).to.equal(owner.address);

//             const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
//             const nft = await NFTFactory.deploy(owner.address);
//             expect(await nft.owner()).to.equal(owner.address);
//         });

//         it("Should properly transfer ownership to exchange", async function () {
//             const { exchange, token, nft } = await loadFixture(deployFixture);
//             expect(await token.owner()).to.equal(await exchange.getAddress());
//             expect(await nft.owner()).to.equal(await exchange.getAddress());
//         });

//         it("Should have correct addresses in exchange", async function () {
//             const { exchange, token, nft } = await loadFixture(deployFixture);
//             const [tokenAddr, nftAddr] = await exchange.getAddresses();
//             expect(tokenAddr).to.equal(await token.getAddress());
//             expect(nftAddr).to.equal(await nft.getAddress());
//         });
//     });

//     describe("Token Operations", function () {
//         it("Should mint correct amount of tokens for ETH", async function () {
//             const { token, otherAccount } = await loadFixture(deployFixture);
            
//             await token.connect(otherAccount).mint(otherAccount.address, {
//                 value: ethers.parseEther("1")
//             });

//             expect(await token.balanceOf(otherAccount.address))
//                 .to.equal(ethers.parseUnits("10", 18));
//         });

//         it("Should mint tokens via receive function", async function () {
//             const { token, otherAccount } = await loadFixture(deployFixture);
            
//             await otherAccount.sendTransaction({
//                 to: await token.getAddress(),
//                 value: ethers.parseEther("1")
//             });

//             expect(await token.balanceOf(otherAccount.address))
//                 .to.equal(ethers.parseUnits("10", 18));
//         });

//         it("Should revert on minting with no ETH", async function () {
//             const { token, otherAccount } = await loadFixture(deployFixture);
            
//             await expect(
//                 token.connect(otherAccount).mint(otherAccount.address)
//             ).to.be.revertedWith("send eth to buy tokens");
//         });

//         it("Should revert when sending ETH with data", async function () {
//             const { token, otherAccount } = await loadFixture(deployFixture);
            
//             await expect(
//                 otherAccount.sendTransaction({
//                     to: await token.getAddress(),
//                     value: ethers.parseEther("1"),
//                     data: "0x1234"
//                 })
//             ).to.be.revertedWith("You can't send ether with data on that contract");
//         });

//         it("Should respect max supply limit", async function () {
//             const { token, otherAccount } = await loadFixture(deployFixture);

//             // Set a very large balance to ensure enough funds
//             await ethers.provider.send("hardhat_setBalance", [
//                 otherAccount.address,
//                 ethers.toBeHex(ethers.parseEther("1000000"))
//             ]);

//             // Try to mint more tokens than max supply
//             // MAX_SUPPLY is 1M tokens, so trying to mint more than 100K ETH worth
//             // (since 1 ETH = 10 tokens)
//             await expect(
//                 token.connect(otherAccount).mint(otherAccount.address, { 
//                     value: ethers.parseEther("100001")
//                 })
//             ).to.be.revertedWith("mint would exceed max token supply");
//         });
//     });

//     describe("NFT Operations", function () {
//         it("Should mint NFT correctly through exchange", async function () {
//             const { exchange, token, nft, otherAccount } = await loadFixture(deployFixture);
            
//             // First mint tokens
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("1")
//             });

//             // Approve tokens for exchange
//             await token.connect(otherAccount).approve(
//                 await exchange.getAddress(),
//                 ethers.parseUnits("10", 18)
//             );

//             // Mint NFT
//             await exchange.connect(otherAccount).mintNFT();
//             expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
//         });

//         it("Should fail NFT mint without token approval", async function () {
//             const { exchange, token, otherAccount } = await loadFixture(deployFixture);

//             // First mint some tokens so we have balance
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("1")
//             });
            
//             // Try to mint NFT without approval
//             await expect(
//                 exchange.connect(otherAccount).mintNFT()
//             ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
//         });

//         it("Should enforce NFT max supply", async function () {
//             const { exchange, token, nft, otherAccount } = await loadFixture(deployFixture);
            
//             // Mint enough tokens for multiple NFTs
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("11")
//             });

//             // Approve tokens
//             await token.connect(otherAccount).approve(
//                 await exchange.getAddress(),
//                 ethers.parseUnits("110", 18)
//             );

//             // Mint NFTs up to max supply
//             for(let i = 0; i < 10; i++) {
//                 await exchange.connect(otherAccount).mintNFT();
//             }

//             // Try to mint one more
//             await expect(
//                 exchange.connect(otherAccount).mintNFT()
//             ).to.be.revertedWith("no more NFT to mint");
//         });
//     });

//     describe("Exchange Operations", function () {
//         it("Should handle direct ETH sends", async function () {
//             const { exchange, token, otherAccount } = await loadFixture(deployFixture);
            
//             await otherAccount.sendTransaction({
//                 to: await exchange.getAddress(),
//                 value: ethers.parseEther("1")
//             });

//             expect(await token.balanceOf(otherAccount.address))
//                 .to.equal(ethers.parseUnits("10", 18));
//         });

//         it("Should revert ETH sends with data", async function () {
//             const { exchange, otherAccount } = await loadFixture(deployFixture);
            
//             await expect(
//                 otherAccount.sendTransaction({
//                     to: await exchange.getAddress(),
//                     value: ethers.parseEther("1"),
//                     data: "0x1234"
//                 })
//             ).to.be.revertedWith("You can't send ether with data on that contract");
//         });

//         it("Should track allowances correctly", async function () {
//             const { exchange, token, otherAccount } = await loadFixture(deployFixture);
            
//             // Mint tokens
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("1")
//             });

//             // Check initial allowance
//             expect(await exchange.connect(otherAccount).allowance()).to.equal(0);

//             // Approve tokens
//             await token.connect(otherAccount).approve(
//                 await exchange.getAddress(),
//                 ethers.parseUnits("10", 18)
//             );

//             // Check updated allowance
//             expect(await exchange.connect(otherAccount).allowance())
//                 .to.equal(ethers.parseUnits("10", 18));
//         });

//         it("Should allow token balance queries", async function () {
//             const { exchange, otherAccount } = await loadFixture(deployFixture);
            
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("1")
//             });

//             expect(await exchange.connect(otherAccount).balance())
//                 .to.equal(ethers.parseUnits("10", 18));
            
//             expect(await exchange.balanceOf(otherAccount.address))
//                 .to.equal(ethers.parseUnits("10", 18));
//         });
//     });

//     describe("NFT Additional Features", function () {
//         describe("URI Functionality", function () {
//             it("Should return correct token URI", async function () {
//                 const { exchange, nft, token, otherAccount } = await loadFixture(deployFixture);
                
//                 // Mint an NFT properly through the exchange
//                 await exchange.connect(otherAccount).mintToken({
//                     value: ethers.parseEther("1")
//                 });
                
//                 await token.connect(otherAccount).approve(
//                     await exchange.getAddress(),
//                     ethers.parseUnits("10", 18)
//                 );
                
//                 await exchange.connect(otherAccount).mintNFT();
                
//                 const baseURI = "ipfs://bafybeia3kfwpeqqxpwimflmqclo3hwewa7ziueennq2wocj3nlvv34bq34/";
//                 expect(await nft.tokenURI(1)).to.equal(baseURI + "1");
//             });
//         });
    
//         describe("NFT Transfers", function () {
//             it("Should allow NFT transfers between accounts", async function () {
//                 const { exchange, nft, token, otherAccount, owner } = await loadFixture(deployFixture);
                
//                 // Mint NFT
//                 await exchange.connect(otherAccount).mintToken({
//                     value: ethers.parseEther("1")
//                 });
                
//                 await token.connect(otherAccount).approve(
//                     await exchange.getAddress(),
//                     ethers.parseUnits("10", 18)
//                 );
                
//                 await exchange.connect(otherAccount).mintNFT();
                
//                 // Verify initial owner
//                 expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
                
//                 // Transfer NFT
//                 await nft.connect(otherAccount).transferFrom(otherAccount.address, owner.address, 1);
                
//                 // Verify new owner
//                 expect(await nft.ownerOf(1)).to.equal(owner.address);
//             });
    
//             it("Should handle safe transfers between accounts", async function () {
//                 const { exchange, nft, token, otherAccount, owner } = await loadFixture(deployFixture);
                
//                 // Mint NFT
//                 await exchange.connect(otherAccount).mintToken({
//                     value: ethers.parseEther("1")
//                 });
                
//                 await token.connect(otherAccount).approve(
//                     await exchange.getAddress(),
//                     ethers.parseUnits("10", 18)
//                 );
                
//                 await exchange.connect(otherAccount).mintNFT();
                
//                 // Safe transfer NFT
//                 await nft.connect(otherAccount)["safeTransferFrom(address,address,uint256)"](
//                     otherAccount.address, 
//                     owner.address, 
//                     1
//                 );
                
//                 expect(await nft.ownerOf(1)).to.equal(owner.address);
//             });
    
//             it("Should handle NFT approvals correctly", async function () {
//                 const { exchange, nft, token, otherAccount, owner } = await loadFixture(deployFixture);
                
//                 // Mint NFT
//                 await exchange.connect(otherAccount).mintToken({
//                     value: ethers.parseEther("1")
//                 });
                
//                 await token.connect(otherAccount).approve(
//                     await exchange.getAddress(),
//                     ethers.parseUnits("10", 18)
//                 );
                
//                 await exchange.connect(otherAccount).mintNFT();
                
//                 // Approve owner to transfer NFT
//                 await nft.connect(otherAccount).approve(owner.address, 1);
                
//                 // Verify approval
//                 expect(await nft.getApproved(1)).to.equal(owner.address);
                
//                 // Transfer using approval
//                 await nft.connect(owner).transferFrom(otherAccount.address, owner.address, 1);
                
//                 expect(await nft.ownerOf(1)).to.equal(owner.address);
//             });
//         });
//     });

//     describe("Withdrawal", function () {
//         it("Should allow owner to withdraw ETH correctly", async function () {
//             const { exchange, token, owner, otherAccount } = await loadFixture(deployFixture);
            
//             // Fund contract through exchange
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("1")
//             });

//             // Ensure owner has enough ETH for gas
//             await ethers.provider.send("hardhat_setBalance", [
//                 owner.address,
//                 ethers.toBeHex(ethers.parseEther("10"))
//             ]);

//             // Record initial balances
//             const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
//             const initialTokenBalance = await ethers.provider.getBalance(await token.getAddress());

//             // Perform withdrawal
//             const tx = await exchange.connect(owner).withdraw();
//             const receipt = await tx.wait();
//             const gasCost = receipt!.gasUsed * (await tx.gasPrice);

//             // Get final balances
//             const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
//             const finalTokenBalance = await ethers.provider.getBalance(await token.getAddress());

//             // Owner should receive the ETH minus gas costs
//             expect(finalOwnerBalance).to.equal(
//                 initialOwnerBalance + initialTokenBalance - gasCost
//             );

//             // Token contract should be empty
//             expect(finalTokenBalance).to.equal(0);
//         });

//         it("Should prevent non-owner from withdrawing", async function () {
//             const { exchange, otherAccount } = await loadFixture(deployFixture);
            
//             await expect(
//                 exchange.connect(otherAccount).withdraw()
//             ).to.be.revertedWithCustomError(exchange, "OwnableUnauthorizedAccount");
//         });

//         it("Should handle multiple deposits and withdrawal", async function () {
//             const { exchange, token, owner, otherAccount } = await loadFixture(deployFixture);
            
//             // Ensure owner has enough ETH for gas
//             await ethers.provider.send("hardhat_setBalance", [
//                 owner.address,
//                 ethers.toBeHex(ethers.parseEther("10"))
//             ]);

//             // Make multiple deposits
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("0.5")
//             });
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("0.3")
//             });
//             await exchange.connect(otherAccount).mintToken({
//                 value: ethers.parseEther("0.2")
//             });

//             // Record initial balances
//             const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
//             const initialTokenBalance = await ethers.provider.getBalance(await token.getAddress());

//             // Perform withdrawal
//             const tx = await exchange.connect(owner).withdraw();
//             const receipt = await tx.wait();
//             const gasCost = receipt!.gasUsed * (await tx.gasPrice);

//             // Owner should receive all ETH minus gas costs
//             const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
//             expect(finalOwnerBalance).to.equal(
//                 initialOwnerBalance + initialTokenBalance - gasCost
//             );

//             // Token contract should be empty
//             expect(await ethers.provider.getBalance(await token.getAddress()))
//                 .to.equal(0);
//         });
//     });

//     describe("NFT Owner Functions (Direct)", function () {
//         // Separate deployment fixture for direct NFT testing
//         async function deployNFTDirectly() {
//             const [owner, otherAccount] = await ethers.getSigners();
//             const NFTFactory = await ethers.getContractFactory("ExchangeVisageNFT");
//             const nft = await NFTFactory.deploy(owner.address);
//             return { nft, owner, otherAccount };
//         }
    
//         describe("NFT balance()", function () {
//             it("Should allow owner to check contract NFT balance", async function () {
//                 const { nft, owner, otherAccount } = await loadFixture(deployNFTDirectly);
                
//                 // Initially balance should be 0
//                 expect(await nft.balance()).to.equal(0);
                
//                 // Mint directly to test contract
//                 await nft.mint(otherAccount.address);
                
//                 // Transfer NFT to the contract
//                 await nft.connect(otherAccount).transferFrom(
//                     otherAccount.address, 
//                     await nft.getAddress(), 
//                     1
//                 );
                
//                 // Check balance updated
//                 expect(await nft.balance()).to.equal(1);
//             });
    
//             it("Should revert when non-owner calls balance()", async function () {
//                 const { nft, otherAccount } = await loadFixture(deployNFTDirectly);
//                 await expect(nft.connect(otherAccount).balance())
//                     .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
//             });
//         });
    
//         describe("NFT withdraw()", function () {
//             it("Should allow owner to withdraw ETH", async function () {
//                 const { nft, owner } = await loadFixture(deployNFTDirectly);
                
//                 // Send some ETH to NFT contract
//                 await owner.sendTransaction({
//                     to: await nft.getAddress(),
//                     value: ethers.parseEther("1")
//                 });
                
//                 // Record balances before withdrawal
//                 const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
//                 const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
                
//                 // Withdraw
//                 const tx = await nft.withdraw();
//                 const receipt = await tx.wait();
//                 const gasCost = receipt!.gasUsed * (await tx.gasPrice);
                
//                 // Verify ETH transferred to owner
//                 const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
//                 expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
//                 expect(finalOwnerBalance).to.equal(
//                     initialOwnerBalance + contractBalance - gasCost
//                 );
//             });
    
//             it("Should fail to withdraw with no balance", async function () {
//                 const { nft } = await loadFixture(deployNFTDirectly);
//                 await expect(nft.withdraw())
//                     .to.be.revertedWith("Nothing to withdraw");
//             });
    
//             it("Should revert when non-owner calls withdraw()", async function () {
//                 const { nft, otherAccount } = await loadFixture(deployNFTDirectly);
//                 await expect(nft.connect(otherAccount).withdraw())
//                     .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
//             });
//         });
//     });

//     describe("Withdraw Edge Cases", function () {
//         describe("Token Failed Transfer", function () {
//             async function deployWithMockOwner() {
//                 const [owner] = await ethers.getSigners();
//                 const mockReject = await (await ethers.getContractFactory("MockRejectETH")).deploy(owner.address);
//                 const token = await (await ethers.getContractFactory("ExchangeVisageToken")).deploy(await mockReject.getAddress());
                
//                 return { token, mockReject, owner };
//             }
    
//             it("Should revert when owner rejects ETH", async function () {
//                 const { token, owner } = await loadFixture(deployWithMockOwner);
                
//                 // Fund token contract
//                 await token.connect(owner).mint(owner.address, {
//                     value: ethers.parseEther("1")
//                 });
                
//                 await expect(token.withdraw())
//                     .to.be.revertedWith("withdraw failed");
//             });
//         });
    
//         describe("NFT Failed Transfer", function () {
//             async function deployWithMockOwner() {
//                 const [owner] = await ethers.getSigners();
//                 const mockReject = await (await ethers.getContractFactory("MockRejectETH")).deploy(owner.address);
//                 const nft = await (await ethers.getContractFactory("ExchangeVisageNFT")).deploy(await mockReject.getAddress());
                
//                 return { nft, mockReject, owner };
//             }
    
//             it("Should revert when owner rejects ETH", async function () {
//                 const { nft, owner } = await loadFixture(deployWithMockOwner);
                
//                 // Fund NFT contract
//                 await owner.sendTransaction({
//                     to: await nft.getAddress(),
//                     value: ethers.parseEther("1")
//                 });
                
//                 await expect(nft.withdraw())
//                     .to.be.revertedWith("withdraw failed");
//             });
//         });
    
//         describe("Exchange Edge Cases", function () {
//             async function deployWithMockOwner() {
//                 const [owner] = await ethers.getSigners();
//                 const mockReject = await (await ethers.getContractFactory("MockRejectETH")).deploy(owner.address);
//                 const token = await (await ethers.getContractFactory("ExchangeVisageToken")).deploy(owner.address);
//                 const nft = await (await ethers.getContractFactory("ExchangeVisageNFT")).deploy(owner.address);
                
//                 // Deploy exchange
//                 const exchange = await (await ethers.getContractFactory("VisageExchange")).deploy(
//                     owner.address,  // Make owner the initial owner
//                     await token.getAddress(),
//                     await nft.getAddress()
//                 );
    
//                 // Set up ownership chain correctly
//                 await token.transferOwnership(await exchange.getAddress());
//                 await exchange.connect(owner).acceptTokenOwnership();
//                 await nft.transferOwnership(await exchange.getAddress());
//                 await exchange.connect(owner).acceptNftOwnership();
    
//                 // Transfer exchange ownership to mock
//                 await exchange.transferOwnership(await mockReject.getAddress());
//                 await mockReject.connect(owner).acceptOwnership();
    
//                 return { exchange, token, mockReject, owner };
//             }
    
//             it("Should revert with 'Nothing to withdraw' when exchange has no ETH", async function () {
//                 const { exchange, token, owner } = await loadFixture(deployWithMockOwner);
                
//                 // Fund token contract through minting
//                 await exchange.connect(owner).mintToken({
//                     value: ethers.parseEther("1")
//                 });
                
//                 // Withdraw should fail because exchange has no ETH after token withdraw
//                 await expect(exchange.withdraw())
//                     .to.be.revertedWith("Nothing to withdraw");
//             });
    
//             it("Should revert when owner rejects ETH", async function () {
//                 const { exchange, owner } = await loadFixture(deployWithMockOwner);
                
//                 // Fund the exchange directly to trigger withdraw failed
//                 await owner.sendTransaction({
//                     to: await exchange.getAddress(),
//                     value: ethers.parseEther("1")
//                 });
                
//                 await expect(exchange.withdraw())
//                     .to.be.revertedWith("withdraw failed");
//             });
//         });
//     });
    
    
// });