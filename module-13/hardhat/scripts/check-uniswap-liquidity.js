const { ethers } = require("hardhat");

async function main() {
    console.log("\n🏊 Checking Custom Uniswap V2 Liquidity on Sepolia");
    console.log("==================================================");
    
    // Your deployment addresses from deployment-11155111.json
    const ROUTER_ADDRESS = "0xC8CA6d96BB798FD960C4D11f65A55C19EdB17f1C";
    const FACTORY_ADDRESS = "0xE800a82e514B674426E93a02D973ebdC4a1C1725";
    const PAIR_ADDRESS = "0xF05187217801F4e2b58c16CC6c83AAF99FD3052E";
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    const LINK_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
    
    console.log(`📍 Router: ${ROUTER_ADDRESS}`);
    console.log(`📍 Factory: ${FACTORY_ADDRESS}`);
    console.log(`📍 WETH/LINK Pair: ${PAIR_ADDRESS}`);
    
    try {
        // Connect to the pair contract
        const pair = await ethers.getContractAt([
            "function getReserves() view returns (uint112, uint112, uint32)",
            "function token0() view returns (address)",
            "function token1() view returns (address)",
            "function totalSupply() view returns (uint256)"
        ], PAIR_ADDRESS);
        
        console.log("\n🔍 Checking Pair Information");
        console.log("============================");
        
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        const totalSupply = await pair.totalSupply();
        
        console.log(`Token0: ${token0}`);
        console.log(`Token1: ${token1}`);
        console.log(`LP Total Supply: ${ethers.utils.formatEther(totalSupply)}`);
        
        // Get reserves
        const [reserve0, reserve1, timestamp] = await pair.getReserves();
        
        console.log("\n💧 Current Liquidity Reserves");
        console.log("=============================");
        
        // Determine which is WETH and which is LINK
        const isToken0WETH = token0.toLowerCase() === WETH_ADDRESS.toLowerCase();
        const wethReserve = isToken0WETH ? reserve0 : reserve1;
        const linkReserve = isToken0WETH ? reserve1 : reserve0;
        
        console.log(`WETH Reserve: ${ethers.utils.formatEther(wethReserve)} WETH`);
        console.log(`LINK Reserve: ${ethers.utils.formatEther(linkReserve)} LINK`);
        console.log(`Last Update: ${new Date(timestamp * 1000).toISOString()}`);
        
        // Check if reserves are sufficient
        const minETHForSwap = ethers.utils.parseEther("0.001"); // Minimum swap amount
        const sufficient = wethReserve.gt(minETHForSwap.mul(10)); // Need 10x minimum for decent swaps
        
        console.log(`\n📊 Liquidity Analysis`);
        console.log("====================");
        console.log(`Sufficient for swaps: ${sufficient ? '✅' : '❌'}`);
        console.log(`Can handle 0.001 ETH swap: ${wethReserve.gt(minETHForSwap) ? '✅' : '❌'}`);
        
        if (!sufficient) {
            console.log(`\n❌ LIQUIDITY TOO LOW!`);
            console.log(`💡 Current WETH reserve: ${ethers.utils.formatEther(wethReserve)} ETH`);
            console.log(`💡 Recommended minimum: ${ethers.utils.formatEther(minETHForSwap.mul(10))} ETH`);
            console.log(`💡 Your casino spins will fail because swaps can't complete`);
        }
        
        // Test a small swap calculation
        console.log(`\n🧮 Testing Swap Calculation`);
        console.log("===========================");
        
        const router = await ethers.getContractAt([
            "function getAmountsOut(uint, address[]) view returns (uint[])"
        ], ROUTER_ADDRESS);
        
        const testETH = ethers.utils.parseEther("0.001"); // Test with 0.001 ETH
        const path = [WETH_ADDRESS, LINK_ADDRESS];
        
        try {
            const amounts = await router.getAmountsOut(testETH, path);
            const linkOut = amounts[1];
            
            console.log(`Input: ${ethers.utils.formatEther(testETH)} ETH`);
            console.log(`Expected Output: ${ethers.utils.formatEther(linkOut)} LINK`);
            console.log(`Swap viable: ${linkOut.gt(0) ? '✅' : '❌'}`);
            
        } catch (swapError) {
            console.log(`❌ Swap calculation failed: ${swapError.message}`);
            console.log(`💡 This is why your spins are failing!`);
        }
        
    } catch (error) {
        console.log(`❌ Error checking liquidity: ${error.message}`);
        console.log(`💡 Your Uniswap V2 deployment might not be working properly`);
    }
    
    console.log(`\n💡 SOLUTION: Add more liquidity to your pair`);
    console.log(`   Run: npx hardhat run scripts/deployment/02-deploy-uniswap-v2.js --network sepolia`);
    console.log(`   Or: Add liquidity manually with more ETH and LINK`);
}

main().catch(console.error); 