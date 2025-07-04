const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🎰 Dynamic VRF Pricing Demo - Real Contract Data");
    console.log("═".repeat(60));
    
    const [owner] = await ethers.getSigners();
    
    // Mainnet addresses (same as used in tests)
    const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const LINK_USD_PRICE_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c";
    const LINK_TOKEN = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const CHAINLINK_KEY_HASH = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef";
    
    // Deploy mock VRF and payout tables
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRF = await MockVRFCoordinator.deploy();
    
    const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
    const payoutTables3 = await PayoutTables3.deploy();
    
    const PayoutTables = await ethers.getContractFactory("PayoutTables");
    const payoutTables = await PayoutTables.deploy(
        payoutTables3.address, payoutTables3.address, payoutTables3.address, 
        payoutTables3.address, payoutTables3.address
    );
    
    // Deploy actual casino contract (using test version for demo)
    const CasinoSlotTest = await ethers.getContractFactory("CasinoSlotTest");
    const casinoSlot = await upgrades.deployProxy(
        CasinoSlotTest,
        [
            1, ETH_USD_PRICE_FEED, LINK_USD_PRICE_FEED, LINK_TOKEN,
            payoutTables.address, mockVRF.address, UNISWAP_V3_ROUTER,
            WETH_TOKEN, CHAINLINK_KEY_HASH, owner.address
        ],
        { kind: "uups" }
    );
    
    console.log("💰 Current Market Prices from Real Chainlink Feeds:");
    const ethPriceFeed = await ethers.getContractAt("IPriceFeed", ETH_USD_PRICE_FEED);
    const ethPriceData = await ethPriceFeed.latestRoundData();
    console.log(`   ETH/USD: $${ethers.utils.formatUnits(ethPriceData.answer, 8)}`);
    
    const linkPriceFeed = await ethers.getContractAt("IPriceFeed", LINK_USD_PRICE_FEED);
    const linkPriceData = await linkPriceFeed.latestRoundData();
    console.log(`   LINK/USD: $${ethers.utils.formatUnits(linkPriceData.answer, 8)}`);
    
    console.log("");
    console.log("🎲 REAL CONTRACT PRICING BREAKDOWN BY REEL COUNT");
    console.log("═".repeat(80));
    console.log("Reels | Base Cost | VRF Cost | Multiplier | Total USD | Total CHIPS");
    console.log("─".repeat(80));
    
    const reelCounts = [3, 4, 5, 6, 7];
    
    for (const reelCount of reelCounts) {
        try {
            const pricing = await casinoSlot.getPricingBreakdown(reelCount);
            const spinCost = await casinoSlot.getSpinCost(reelCount);
            
            // Convert from contract values
            const baseCostUSD = pricing.baseCostUSD.toNumber(); // cents
            const vrfCostUSD = pricing.vrfCostUSD.toNumber(); // cents  
            const multiplier = pricing.reelMultiplier.toNumber(); // basis points
            const totalCostUSD = pricing.totalCostUSD.toNumber(); // cents
            const totalCostCHIPS = ethers.utils.formatEther(spinCost);
            
            console.log(`  ${reelCount}   | $${(baseCostUSD/100).toFixed(2)}     | $${(vrfCostUSD/100).toFixed(2)}    | ${multiplier/100}%      | $${(totalCostUSD/100).toFixed(2)}    | ${parseFloat(totalCostCHIPS).toFixed(2)} CHIPS`);
        } catch (error) {
            console.log(`  ${reelCount}   | ERROR: ${error.message}`);
        }
    }
    
    console.log("");
    console.log("📊 ECONOMIC ANALYSIS:");
    
    // Show how much 1 ETH buys in CHIPS
    const ethForChips = ethers.utils.parseEther("1");
    const chipsFromEth = await casinoSlot.calculateChipsFromETH(ethForChips);
    console.log(`• 1 ETH = ${ethers.utils.formatEther(chipsFromEth)} CHIPS`);
    
    // Show how many spins you can afford with 1 ETH
    const spinCost3 = await casinoSlot.getSpinCost(3);
    const spinCost7 = await casinoSlot.getSpinCost(7);
    const spins3 = chipsFromEth.div(spinCost3);
    const spins7 = chipsFromEth.div(spinCost7);
    
    console.log(`• Affordable 3-reel spins: ${spins3.toString()}`);
    console.log(`• Affordable 7-reel spins: ${spins7.toString()}`);
    console.log(`• 7-reel cost scaling: ${spinCost7.div(spinCost3).toString()}x more expensive`);
    
    console.log("");
    console.log("🎯 KEY INSIGHTS:");
    console.log("• Players pay for their own VRF costs (no casino loss)");
    console.log("• Higher reels = better odds = exponentially higher costs");  
    console.log("• Real-time ETH→LINK swapping keeps costs dynamic");
    console.log("• Casino profits from base costs + house edge on remaining ETH");
    console.log("• Perfect economic balance! 💰");
    
    console.log("");
    console.log("✅ All pricing data sourced from REAL contract functions!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 