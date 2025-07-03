const { ethers } = require("hardhat");

async function main() {
    console.log("\n🏊 Testing Custom Uniswap V2 Deployment Directly");
    console.log("=================================================");
    
    const [signer] = await ethers.getSigners();
    const deployment = require('../deployments/deployment-11155111.json');
    
    // Addresses from deployment
    const ROUTER_ADDRESS = deployment.contracts.CasinoSlot.constructor.uniswapRouter;
    const FACTORY_ADDRESS = deployment.contracts.CasinoSlot.constructor.factoryAddress;
    const PAIR_ADDRESS = deployment.contracts.CasinoSlot.constructor.pairAddress;
    const WETH_ADDRESS = deployment.contracts.CasinoSlot.constructor.wethToken;
    const LINK_ADDRESS = deployment.contracts.CasinoSlot.constructor.linkToken;
    
    console.log(`🔑 Signer: ${signer.address}`);
    console.log(`💰 ETH Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH`);
    
    console.log("\n📍 Addresses:");
    console.log(`Router: ${ROUTER_ADDRESS}`);
    console.log(`Factory: ${FACTORY_ADDRESS}`);
    console.log(`Pair: ${PAIR_ADDRESS}`);
    console.log(`WETH: ${WETH_ADDRESS}`);
    console.log(`LINK: ${LINK_ADDRESS}`);
    
    // Test 1: Check if contracts exist
    console.log("\n🔍 Step 1: Contract Existence Check");
    console.log("===================================");
    
    const routerCode = await ethers.provider.getCode(ROUTER_ADDRESS);
    const factoryCode = await ethers.provider.getCode(FACTORY_ADDRESS);
    const pairCode = await ethers.provider.getCode(PAIR_ADDRESS);
    const wethCode = await ethers.provider.getCode(WETH_ADDRESS);
    const linkCode = await ethers.provider.getCode(LINK_ADDRESS);
    
    console.log(`Router exists: ${routerCode !== '0x'}`);
    console.log(`Factory exists: ${factoryCode !== '0x'}`);
    console.log(`Pair exists: ${pairCode !== '0x'}`);
    console.log(`WETH exists: ${wethCode !== '0x'}`);
    console.log(`LINK exists: ${linkCode !== '0x'}`);
    
    if (routerCode === '0x') {
        console.log("❌ Router contract doesn't exist!");
        return;
    }
    
    // Test 2: Check router configuration
    console.log("\n🔍 Step 2: Router Configuration");
    console.log("===============================");
    
    const router = await ethers.getContractAt("SimpleRouter", ROUTER_ADDRESS);
    
    try {
        const routerWETH = await router.WETH();
        const routerFactory = await router.factory();
        
        console.log(`Router WETH: ${routerWETH}`);
        console.log(`Router Factory: ${routerFactory}`);
        console.log(`Expected WETH: ${WETH_ADDRESS}`);
        console.log(`Expected Factory: ${FACTORY_ADDRESS}`);
        
        console.log(`✅ WETH matches: ${routerWETH.toLowerCase() === WETH_ADDRESS.toLowerCase()}`);
        console.log(`✅ Factory matches: ${routerFactory.toLowerCase() === FACTORY_ADDRESS.toLowerCase()}`);
        
    } catch (error) {
        console.log(`❌ Router config error: ${error.message}`);
        return;
    }
    
    // Test 3: Check pair reserves
    console.log("\n🔍 Step 3: Pair Reserves Check");
    console.log("==============================");
    
    const pair = await ethers.getContractAt("SimplePair", PAIR_ADDRESS);
    
    try {
        const [reserve0, reserve1, timestamp] = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        console.log(`Token0: ${token0}`);
        console.log(`Token1: ${token1}`);
        console.log(`Reserve0: ${ethers.utils.formatEther(reserve0)}`);
        console.log(`Reserve1: ${ethers.utils.formatEther(reserve1)}`);
        console.log(`Last update: ${new Date(timestamp * 1000).toISOString()}`);
        
        if (reserve0.eq(0) || reserve1.eq(0)) {
            console.log("❌ ZERO RESERVES - NO LIQUIDITY!");
            return;
        }
        
        // Determine which is WETH and which is LINK
        const isWETHToken0 = token0.toLowerCase() === WETH_ADDRESS.toLowerCase();
        const wethReserve = isWETHToken0 ? reserve0 : reserve1;
        const linkReserve = isWETHToken0 ? reserve1 : reserve0;
        
        console.log(`✅ WETH Reserve: ${ethers.utils.formatEther(wethReserve)} WETH`);
        console.log(`✅ LINK Reserve: ${ethers.utils.formatEther(linkReserve)} LINK`);
        
    } catch (error) {
        console.log(`❌ Pair reserves error: ${error.message}`);
        return;
    }
    
    // Test 4: Test swap calculation
    console.log("\n🔍 Step 4: Swap Calculation Test");
    console.log("================================");
    
    const ETH_AMOUNT = ethers.utils.parseEther("0.001"); // Test with 0.001 ETH
    
    try {
        const path = [WETH_ADDRESS, LINK_ADDRESS];
        const amountsOut = await router.getAmountsOut(ETH_AMOUNT, path);
        
        console.log(`Input: ${ethers.utils.formatEther(ETH_AMOUNT)} ETH`);
        console.log(`Expected output: ${ethers.utils.formatEther(amountsOut[1])} LINK`);
        
        if (amountsOut[1].eq(0)) {
            console.log("❌ SWAP CALCULATION RETURNS ZERO!");
            return;
        }
        
    } catch (error) {
        console.log(`❌ Swap calculation error: ${error.message}`);
        return;
    }
    
    // Test 5: Try actual swap
    console.log("\n🔍 Step 5: Test Actual Swap");
    console.log("===========================");
    
    try {
        const path = [WETH_ADDRESS, LINK_ADDRESS];
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
        
        console.log("🔄 Attempting swap...");
        console.log(`Amount: ${ethers.utils.formatEther(ETH_AMOUNT)} ETH`);
        console.log(`Path: [WETH, LINK]`);
        console.log(`Deadline: ${deadline}`);
        
        // Estimate gas first
        const gasEstimate = await router.estimateGas.swapExactETHForTokens(
            0, // amountOutMin (accept any amount)
            path,
            signer.address,
            deadline,
            { value: ETH_AMOUNT }
        );
        
        console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
        
        // Execute the swap
        const tx = await router.swapExactETHForTokens(
            0, // amountOutMin 
            path,
            signer.address,
            deadline,
            { 
                value: ETH_AMOUNT,
                gasLimit: gasEstimate.mul(120).div(100) // +20% buffer
            }
        );
        
        console.log(`✅ Swap successful! Tx: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
    } catch (error) {
        console.log(`❌ Swap execution failed: ${error.message}`);
        
        // Try to get more specific error
        if (error.message.includes("INSUFFICIENT_LIQUIDITY")) {
            console.log("💡 Issue: Insufficient liquidity in the pair");
        } else if (error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
            console.log("💡 Issue: Slippage too high");
        } else if (error.message.includes("EXPIRED")) {
            console.log("💡 Issue: Transaction deadline expired");
        } else if (error.message.includes("INVALID_PATH")) {
            console.log("💡 Issue: Invalid swap path");
        }
        
        return;
    }
    
    console.log("\n✅ All Uniswap tests passed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 