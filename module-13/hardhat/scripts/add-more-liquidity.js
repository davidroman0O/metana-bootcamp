const { ethers } = require("hardhat");
const { getAddresses } = require("./utils/addresses");

async function main() {
    console.log("\n🦄 Adding More Liquidity to Uniswap V2 Pair");
    console.log("===========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
    
    // Get existing deployment addresses
    const uniswapAddresses = getAddresses(network.name, "uniswap");
    if (!uniswapAddresses || !uniswapAddresses.router) {
        console.error("\n❌ Uniswap V2 addresses not found! Run 02-deploy-uniswap-v2.js first.");
        process.exit(1);
    }
    
    const ROUTER_ADDRESS = uniswapAddresses.router;
    const LINK_ADDRESS = uniswapAddresses.linkToken || "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK
    const WETH_ADDRESS = uniswapAddresses.wethToken || "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // Sepolia WETH
    const PAIR_ADDRESS = uniswapAddresses.wethLinkPair;
    
    console.log("\n📍 Addresses:");
    console.log(`Router: ${ROUTER_ADDRESS}`);
    console.log(`LINK: ${LINK_ADDRESS}`);
    console.log(`WETH: ${WETH_ADDRESS}`);
    console.log(`Pair: ${PAIR_ADDRESS}`);
    
    // Get contracts
    const router = await ethers.getContractAt("SimpleRouter", ROUTER_ADDRESS);
    const linkToken = await ethers.getContractAt("IERC20", LINK_ADDRESS);
    const pair = await ethers.getContractAt("SimplePair", PAIR_ADDRESS);
    
    // Check current reserves
    console.log("\n📊 Current Liquidity Reserves");
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    const isWETHToken0 = token0.toLowerCase() === WETH_ADDRESS.toLowerCase();
    const wethReserve = isWETHToken0 ? reserve0 : reserve1;
    const linkReserve = isWETHToken0 ? reserve1 : reserve0;
    
    console.log(`WETH Reserve: ${ethers.utils.formatEther(wethReserve)} WETH`);
    console.log(`LINK Reserve: ${ethers.utils.formatEther(linkReserve)} LINK`);
    
    // Add more liquidity
    console.log("\n💧 Adding More Liquidity");
    
    // Amounts to add (MUCH MORE than original)
    const ethAmount = ethers.utils.parseEther("3"); // 0.5 ETH
    const linkAmount = ethers.utils.parseEther("50.0"); // 5 LINK
    
    console.log(`Adding:`);
    console.log(`- ETH: ${ethers.utils.formatEther(ethAmount)}`);
    console.log(`- LINK: ${ethers.utils.formatEther(linkAmount)}`);
    
    // Check LINK balance
    const deployerLINK = await linkToken.balanceOf(deployer.address);
    console.log(`Your LINK balance: ${ethers.utils.formatEther(deployerLINK)}`);
    
    if (deployerLINK.lt(linkAmount)) {
        console.log("\n❌ Insufficient LINK balance for liquidity");
        console.log("💡 Get LINK from: https://faucets.chain.link/sepolia");
        return;
    }
    
    // Approve router to spend LINK
    console.log("\nApproving LINK spend...");
    const approveTx = await linkToken.approve(ROUTER_ADDRESS, linkAmount, {
        gasPrice: ethers.utils.parseUnits("20", "gwei")
    });
    await approveTx.wait();
    console.log("✅ LINK approved");
    
    // Add liquidity
    console.log("\nAdding liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    const addLiquidityTx = await router.addLiquidityETH(
        LINK_ADDRESS,           // token
        linkAmount,             // amountTokenDesired
        0,                      // amountTokenMin (accept any)
        0,                      // amountETHMin (accept any)
        deployer.address,       // to
        deadline,               // deadline
        { 
            value: ethAmount, 
            gasPrice: ethers.utils.parseUnits("20", "gwei"),
            gasLimit: 500000    // Explicit gas limit
        }
    );
    
    const liquidityReceipt = await addLiquidityTx.wait();
    console.log("✅ Liquidity added successfully!");
    console.log("Transaction:", liquidityReceipt.transactionHash);
    
    // Check new reserves
    const [newReserve0, newReserve1] = await pair.getReserves();
    const newWethReserve = isWETHToken0 ? newReserve0 : newReserve1;
    const newLinkReserve = isWETHToken0 ? newReserve1 : newReserve0;
    
    console.log("\n📊 New Liquidity Reserves");
    console.log(`WETH Reserve: ${ethers.utils.formatEther(newWethReserve)} WETH`);
    console.log(`LINK Reserve: ${ethers.utils.formatEther(newLinkReserve)} LINK`);
    console.log(`WETH Increase: ${ethers.utils.formatEther(newWethReserve.sub(wethReserve))} WETH`);
    console.log(`LINK Increase: ${ethers.utils.formatEther(newLinkReserve.sub(linkReserve))} LINK`);
    
    console.log("\n🎉 Liquidity successfully increased!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 