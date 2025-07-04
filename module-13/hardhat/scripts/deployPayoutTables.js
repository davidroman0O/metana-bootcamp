const { ethers } = require("hardhat");

async function main() {
    console.log("🎰 Deploying PayoutTables System...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Deploy individual payout table contracts
    console.log("\n📊 Deploying individual payout table contracts...");
    
    console.log("Deploying PayoutTables3...");
    const PayoutTables3 = await ethers.getContractFactory("PayoutTables3");
    const payoutTables3 = await PayoutTables3.deploy();
    await payoutTables3.deployed();
    console.log("✅ PayoutTables3 deployed to:", payoutTables3.address);
    
    console.log("Deploying PayoutTables4...");
    const PayoutTables4 = await ethers.getContractFactory("PayoutTables4");
    const payoutTables4 = await PayoutTables4.deploy();
    await payoutTables4.deployed();
    console.log("✅ PayoutTables4 deployed to:", payoutTables4.address);
    
    console.log("Deploying PayoutTables5...");
    const PayoutTables5 = await ethers.getContractFactory("PayoutTables5");
    const payoutTables5 = await PayoutTables5.deploy();
    await payoutTables5.deployed();
    console.log("✅ PayoutTables5 deployed to:", payoutTables5.address);
    
    console.log("Deploying PayoutTables6...");
    const PayoutTables6 = await ethers.getContractFactory("PayoutTables6");
    const payoutTables6 = await PayoutTables6.deploy();
    await payoutTables6.deployed();
    console.log("✅ PayoutTables6 deployed to:", payoutTables6.address);
    
    console.log("Deploying PayoutTables7...");
    const PayoutTables7 = await ethers.getContractFactory("PayoutTables7");
    const payoutTables7 = await PayoutTables7.deploy();
    await payoutTables7.deployed();
    console.log("✅ PayoutTables7 deployed to:", payoutTables7.address);
    
    // Deploy main PayoutTables API contract
    console.log("\n🚀 Deploying main PayoutTables API contract...");
    const PayoutTables = await ethers.getContractFactory("PayoutTables");
    const payoutTables = await PayoutTables.deploy(
        payoutTables3.address,
        payoutTables4.address,
        payoutTables5.address,
        payoutTables6.address,
        payoutTables7.address
    );
    await payoutTables.deployed();
    console.log("✅ PayoutTables API deployed to:", payoutTables.address);
    
    // Verify the deployment by calling a test function
    console.log("\n🔍 Verifying deployment...");
    
    // Test 3-reel combination: 333 (triple pumps) should be BIG_WIN
    const testResult1 = await payoutTables.getPayoutType(3, 333);
    console.log("3-reel combination 333 (triple pumps):", testResult1.toString(), "(should be 3 for BIG_WIN)");
    
    // Test 5-reel combination: 55555 (all rockets) should be ULTRA_WIN
    const testResult2 = await payoutTables.getPayoutType(5, 55555);
    console.log("5-reel combination 55555 (all rockets):", testResult2.toString(), "(should be 5 for ULTRA_WIN)");
    
    // Get all table addresses for verification
    const tableAddresses = await payoutTables.getAllPayoutTables();
    console.log("\n📋 All PayoutTable addresses:");
    console.log("  3-reel table:", tableAddresses.table3);
    console.log("  4-reel table:", tableAddresses.table4);
    console.log("  5-reel table:", tableAddresses.table5);
    console.log("  6-reel table:", tableAddresses.table6);
    console.log("  7-reel table:", tableAddresses.table7);
    
    console.log("\n🎉 PayoutTables System deployment completed!");
    console.log("Main PayoutTables API address:", payoutTables.address);
    
    return {
        payoutTables: payoutTables.address,
        payoutTables3: payoutTables3.address,
        payoutTables4: payoutTables4.address,
        payoutTables5: payoutTables5.address,
        payoutTables6: payoutTables6.address,
        payoutTables7: payoutTables7.address
    };
}

// Run the deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main; 