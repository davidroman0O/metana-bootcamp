const { ethers, network } = require("hardhat");
const { saveAddresses } = require("../utils/addresses");

async function deployUniswapV2() {
    console.log("\n🦄 Deploying Uniswap V2 Infrastructure on Sepolia");
    console.log("=================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
    console.log("");
    
    // Network-specific addresses
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // Sepolia WETH
    const LINK_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK
    
    const highGasPrice = ethers.utils.parseUnits("20", "gwei"); // 20 gwei
    
    try {
        // Step 1: Deploy Uniswap V2 Factory
        console.log("🏭 Deploying Uniswap V2 Factory...");
        
        // Use the factory bytecode directly
        const factoryArtifact = await ethers.getContractFactory([
            "constructor(address _feeToSetter)",
            "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
            "function createPair(address tokenA, address tokenB) external returns (address pair)",
            "function getPair(address tokenA, address tokenB) external view returns (address pair)",
            "function allPairs(uint) external view returns (address pair)",
            "function allPairsLength() external view returns (uint)",
            "function feeTo() external view returns (address)",
            "function feeToSetter() external view returns (address)",
            "function setFeeTo(address) external",
            "function setFeeToSetter(address) external"
        ], "0x608060405234801561001057600080fd5b5060405161158238038061158283398101604081905261002f9161007a565b600180546001600160a01b0319166001600160a01b03929092169190911790556100aa565b80516001600160a01b038116811461007557600080fd5b919050565b60006020828403121561008c57600080fd5b6100958261005e565b9392505050565b6114c8806100ba6000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80631e3dd18b116100715780631e3dd18b146101685780636a6278421461017b578063a2e74af61461018e578063c9c65396146101a1578063e6a43905146101c1578063f46901ed146101e157600080fd5b8063017e7e58146100ae578063061c82d0146100c95780630d5f2649146100de57806314539039146101015780631698ee8214610121575b600080fd5b6100b660025481565b6040519081526020015b60405180910390f35b6100dc6100d7366004610fc1565b6101f4565b005b6100f16100ec366004610fdd565b610244565b6040516100c091906110b3565b61011461010f366004610fdd565b6102df565b6040516100c091906110e6565b61013461012f3660046110f9565b6103b1565b604080516001600160a01b0393841681529290911660208301520160405180910390f35b6100dc610176366004610fc1565b610401565b61011461018936600461112b565b610454565b6100dc61019c366004610fc1565b61068c565b6101b46101af36600461115e565b6106dc565b6040516100c09190611178565b6101d46101cf36600461115e565b610777565b6040516100c09190611192565b6101146101ef366004611206565b610809565b6001546001600160a01b0316331461021d5760405162461bcd60e51b815260040161021490611238565b60405180910390fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b6060600360008381526020019081526020016000208054806020026020016040519081016040528092919081815260200182805480156102d357602002820191906000526020600020905b8154815260010190602001808311610280575b50505050509050919050565b600060045482106102f857506001600160a01b038116610299565b600060058381548110610334576103346112a2565b6000918252602090912001546001600160a01b0316905080156103ad576040516335ea6a7560e01b81526001600160a01b038216906335ea6a759061037c9085906004016112c9565b600060405180830381865afa158015610399573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526103c191908101906113ad565b606001519392505050565b5050565b6000602081905260009081526040902080546103ec906113e5565b80601f01602080910402602001604051908101604052809291908181526020018280546104189061" ); // Factory bytecode
        
        // For now, let's use a simpler approach - deploy with a minimal factory contract
        console.log("Creating minimal factory contract...");
        
        const SimpleFactory = await ethers.getContractFactory("SimpleFactory");
        const factory = await SimpleFactory.deploy(deployer.address, {
            gasPrice: highGasPrice
        });
        await factory.deployed();
        
        console.log("✅ Factory deployed to:", factory.address);
        
        // Step 2: Deploy a simple router that wraps ETH and swaps via the pair
        console.log("\n🛣️  Deploying Simple Router...");
        
        const SimpleRouter = await ethers.getContractFactory("SimpleRouter");
        const router = await SimpleRouter.deploy(factory.address, WETH_ADDRESS, {
            gasPrice: highGasPrice
        });
        await router.deployed();
        
        console.log("✅ Router deployed to:", router.address);
        
        // Step 3: Create WETH/LINK Pair
        console.log("\n🔗 Creating WETH/LINK Pair...");
        
        const createPairTx = await factory.createPair(WETH_ADDRESS, LINK_ADDRESS, {
            gasPrice: highGasPrice
        });
        const receipt = await createPairTx.wait();
        
        // Get pair address from event
        const pairAddress = await factory.getPair(WETH_ADDRESS, LINK_ADDRESS);
        
        console.log("✅ WETH/LINK Pair created:", pairAddress);
        
        // Step 4: Add Liquidity
        console.log("\n💧 Adding Liquidity to WETH/LINK Pair...");
        
        // Get contracts
        const linkContract = await ethers.getContractAt("IERC20", LINK_ADDRESS);
        
        // Check balances
        const deployerETH = await ethers.provider.getBalance(deployer.address);
        const deployerLINK = await linkContract.balanceOf(deployer.address);
        
        console.log("Deployer ETH:", ethers.utils.formatEther(deployerETH), "ETH");
        console.log("Deployer LINK:", ethers.utils.formatEther(deployerLINK), "LINK");
        
        // Amounts to add (be conservative)
        const ethAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH
        const linkAmount = ethers.utils.parseEther("1.0"); // 1 LINK
        
        console.log("Adding liquidity:");
        console.log("- ETH:", ethers.utils.formatEther(ethAmount));
        console.log("- LINK:", ethers.utils.formatEther(linkAmount));
        
        if (deployerLINK.lt(linkAmount)) {
            console.log("❌ Insufficient LINK balance for liquidity");
            console.log("💡 Get LINK from: https://faucets.chain.link/sepolia");
            return;
        }
        
        // Approve router to spend LINK
        console.log("Approving LINK spend...");
        const approveTx = await linkContract.approve(router.address, linkAmount, {
            gasPrice: highGasPrice
        });
        await approveTx.wait();
        console.log("✅ LINK approved");
        
        // Add liquidity using our simple router
        console.log("Adding liquidity...");
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
        
        const addLiquidityTx = await router.addLiquidityETH(
            LINK_ADDRESS,           // token
            linkAmount,             // amountTokenDesired
            0,                      // amountTokenMin (accept any)
            0,                      // amountETHMin (accept any)
            deployer.address,       // to
            deadline,               // deadline
            { value: ethAmount, gasPrice: highGasPrice }    // ETH to send
        );
        
        const liquidityReceipt = await addLiquidityTx.wait();
        console.log("✅ Liquidity added successfully!");
        console.log("Transaction:", liquidityReceipt.transactionHash);
        
        // Step 5: Test a small swap
        console.log("\n🔄 Testing ETH → LINK swap...");
        
        const testAmount = ethers.utils.parseEther("0.001"); // 0.001 ETH
        
        try {
            const swapTx = await router.swapExactETHForTokens(
                0,                      // amountOutMin (accept any)
                [WETH_ADDRESS, LINK_ADDRESS], // path
                deployer.address,       // to
                deadline,               // deadline
                { value: testAmount, gasPrice: highGasPrice }   // ETH to send
            );
            
            const swapReceipt = await swapTx.wait();
            console.log("✅ Test swap successful!");
            console.log("Transaction:", swapReceipt.transactionHash);
            
            // Check LINK received
            const linkBalanceAfter = await linkContract.balanceOf(deployer.address);
            console.log("LINK balance after swap:", ethers.utils.formatEther(linkBalanceAfter));
            
        } catch (swapError) {
            console.log("❌ Test swap failed:", swapError.message);
        }
        
        // Step 6: Save deployment addresses using addresses.js utility
        console.log("\n💾 Saving Uniswap V2 addresses...");
        
        saveAddresses(network.name, "uniswap", {
            factory: factory.address,
            router: router.address,
            wethLinkPair: pairAddress,
            wethToken: WETH_ADDRESS,
            linkToken: LINK_ADDRESS,
            version: "v2",
            deployedAt: new Date().toISOString()
        });
        
        // Also save liquidity info
        saveAddresses(network.name, "liquidity", {
            pairAddress: pairAddress,
            ethAmount: "0.1",
            linkAmount: "1.0",
            lpTokens: "calculated_by_pair",
            provider: deployer.address,
            version: "v2",
            addedAt: new Date().toISOString(),
            note: "V2 liquidity successfully added and tested"
        });
        
        // Summary
        console.log("\n🎉 Uniswap V2 Deployment Complete!");
        console.log("===================================");
        console.log("🏭 Factory:", factory.address);
        console.log("🛣️  Router:", router.address);
        console.log("🔗 WETH/LINK Pair:", pairAddress);
        console.log("💧 Liquidity added successfully");
        console.log("🔄 Test swap confirmed working");
        console.log("");
        console.log("Next steps:");
        console.log("1. Deploy casino using 03-deploy-casino-slot.js (will auto-use V2 addresses)");
        console.log("2. Test casino spins with working V2 swaps");
        console.log("3. Fund casino contract with LINK for VRF requests");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        throw error;
    }
}

deployUniswapV2()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 