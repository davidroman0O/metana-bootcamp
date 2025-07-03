const { ethers } = require("hardhat");

async function testPriceFeed(address, name) {
    console.log(`\n🔍 Testing ${name} at ${address}`);
    
    try {
        const priceFeed = await ethers.getContractAt([
            "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
            "function description() view returns (string)"
        ], address);
        
        const description = await priceFeed.description();
        console.log(`   Description: ${description}`);
        
        const [roundId, price, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();
        
        console.log(`   Round ID: ${roundId.toString()}`);
        console.log(`   Price: ${price.toString()} (raw)`);
        console.log(`   Price: $${(price.toNumber() / 1e8).toFixed(2)} (formatted)`);
        console.log(`   Updated At: ${new Date(updatedAt.toNumber() * 1000).toISOString()}`);
        console.log(`   Age: ${Math.floor((Date.now() / 1000) - updatedAt.toNumber())} seconds`);
        
        // Validation checks (same as contract)
        const valid = price > 0;
        const ethPriceInRange = name.includes("ETH") ? 
            (price >= 50 * 1e8 && price <= 100000 * 1e8) : true;
        const linkPriceInRange = name.includes("LINK") ? 
            (price >= 1 * 1e8 && price <= 1000 * 1e8) : true;
        const fresh = (Date.now() / 1000) - updatedAt.toNumber() <= 24 * 3600;
        
        console.log(`   ✅ Valid: ${valid}`);
        console.log(`   ✅ In Range: ${ethPriceInRange && linkPriceInRange}`);
        console.log(`   ✅ Fresh: ${fresh}`);
        
        return valid && ethPriceInRange && linkPriceInRange;
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function testCalculateChips() {
    console.log("\n🧮 Testing calculateChipsFromETH logic...");
    
    const ethAmount = ethers.utils.parseEther("0.01"); // 0.01 ETH
    console.log(`   Input: ${ethers.utils.formatEther(ethAmount)} ETH`);
    
    // Mock ETH price (around $2500)
    const ethPriceUSD = 2500 * 1e8; // 8 decimals
    console.log(`   Mock ETH Price: $${ethPriceUSD / 1e8}`);
    
    // Calculate CHIPS (same formula as contract)
    const chipsAmount = ethAmount.mul(ethPriceUSD).mul(5).div(1e8);
    console.log(`   Expected CHIPS: ${ethers.utils.formatEther(chipsAmount)}`);
    console.log(`   Expected CHIPS > 0: ${chipsAmount.gt(0)}`);
    
    return chipsAmount.gt(0);
}

async function main() {
    console.log("\n🏥 Diagnosing Sepolia Price Feed Issues");
    console.log("=====================================");
    
    // Test ETH/USD price feed
    const ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const ethSuccess = await testPriceFeed(ETH_USD_FEED, "ETH/USD");
    
    // Test LINK/USD price feed  
    const LINK_USD_FEED = "0xc59E3633BAAC79493d908e63626716e204A45EdF";
    const linkSuccess = await testPriceFeed(LINK_USD_FEED, "LINK/USD");
    
    // Test calculation logic
    const calcSuccess = await testCalculateChips();
    
    console.log("\n📋 Summary:");
    console.log(`   ETH/USD Feed: ${ethSuccess ? '✅' : '❌'}`);
    console.log(`   LINK/USD Feed: ${linkSuccess ? '✅' : '❌'}`);
    console.log(`   Calculation Logic: ${calcSuccess ? '✅' : '❌'}`);
    
    if (!ethSuccess || !linkSuccess) {
        console.log("\n💡 Possible Issues:");
        console.log("   - Price feed addresses are wrong");
        console.log("   - Price feeds are returning invalid data");
        console.log("   - Network connectivity issues");
        console.log("\n💡 Solutions:");
        console.log("   - Verify price feed addresses on Chainlink docs");
        console.log("   - Check if feeds are deprecated/migrated");
        console.log("   - Use different price feed addresses");
    }
    
    if (ethSuccess && linkSuccess && calcSuccess) {
        console.log("\n✅ Price feeds look good! Issue might be elsewhere.");
        console.log("💡 Check:");
        console.log("   - Contract initialization");
        console.log("   - Transaction gas limits");
        console.log("   - Frontend transaction parameters");
    }
}

main().catch(console.error); 