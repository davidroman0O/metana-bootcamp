const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    // Check if request ID is provided as an environment variable
    const requestId = process.env.REQUEST_ID;
    
    if (!requestId) {
        console.error("❌ Please provide a request ID as an environment variable");
        console.error("Example: REQUEST_ID=123456789 npx hardhat run scripts/check-request-id-vrf.js --network sepolia");
        process.exit(1);
    }

    console.log(`\n🔍 Checking VRF Request Status for ID: ${requestId}`);
    console.log("=======================================");
    
    // Get network chain ID for deployment file
    const networkInfo = await ethers.provider.getNetwork();
    const chainId = networkInfo.chainId;
    
    // Load CasinoSlot deployment info
    const deploymentPath = path.join(__dirname, '../deployments', `deployment-${chainId}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ CasinoSlot deployment not found at ${deploymentPath}`);
        console.error(`Available files in deployments/:`);
        const deploymentDir = path.join(__dirname, '../deployments');
        if (fs.existsSync(deploymentDir)) {
            const files = fs.readdirSync(deploymentDir);
            files.forEach(file => console.error(`  - ${file}`));
        }
        process.exit(1);
    }
    
    const deployment = require(deploymentPath);
    const CASINO_ADDRESS = deployment.contracts.CasinoSlot.address;
    
    console.log(`🎰 CasinoSlot address: ${CASINO_ADDRESS}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
    
    // Get contract instance
    const casinoSlot = await ethers.getContractAt("CasinoSlot", CASINO_ADDRESS);
    
    try {
        // Get spin data from public mapping
        const spin = await casinoSlot.spins(requestId);
        
        console.log(`\n📊 Spin Request Status:`);
        console.log(`Request ID: ${requestId}`);
        console.log(`Player: ${spin.player}`);
        console.log(`Bet Amount: ${ethers.utils.formatEther(spin.betAmount)} CHIPS`);
        console.log(`Reel Count: ${spin.reelCount}`);
        console.log(`Settled: ${spin.settled ? "✅ Yes" : "❌ No"}`);
        console.log(`Timestamp: ${new Date(spin.timestamp.toNumber() * 1000).toLocaleString()}`);
        
        if (spin.player === ethers.constants.AddressZero) {
            console.log(`\n❌ Request ID ${requestId} not found or invalid`);
            return;
        }
        
        if (spin.settled) {
            console.log(`\n🎲 Spin Results:`);
            
            // Get reel results
            const reels = await casinoSlot.getSpinReels(requestId);
            const reelValues = reels.map(reel => reel.toString());
            console.log(`Reels: [${reelValues.join(', ')}]`);
            
            // Payout information
            console.log(`\n💰 Payout Information:`);
            console.log(`Payout Type: ${spin.payoutType}`);
            console.log(`Payout Amount: ${ethers.utils.formatEther(spin.payout)} CHIPS`);
            
            // Convert payout types to readable format
            const payoutTypeNames = {
                0: "LOSE",
                1: "SMALL_WIN", 
                2: "MEDIUM_WIN",
                3: "BIG_WIN",
                4: "JACKPOT"
            };
            
            const payoutTypeName = payoutTypeNames[spin.payoutType] || `Unknown (${spin.payoutType})`;
            console.log(`Payout Type (Readable): ${payoutTypeName}`);
            
            // Calculate win/loss
            const netResult = spin.payout.sub(spin.betAmount);
            if (netResult.gt(0)) {
                console.log(`Net Result: +${ethers.utils.formatEther(netResult)} CHIPS (WIN! 🎉)`);
            } else if (netResult.eq(0)) {
                console.log(`Net Result: 0 CHIPS (BREAK EVEN)`);
            } else {
                console.log(`Net Result: ${ethers.utils.formatEther(netResult)} CHIPS (LOSS)`);
            }
            
        } else {
            console.log(`\n⏳ Request is not settled yet. VRF response is pending.`);
            console.log(`Please check again later.`);
            
            // Check contract ETH balance for VRF payments
            const contractBalance = await ethers.provider.getBalance(CASINO_ADDRESS);
            console.log(`\n💰 Contract ETH balance: ${ethers.utils.formatEther(contractBalance)} ETH`);
            
            if (contractBalance.eq(0)) {
                console.log(`⚠️  WARNING: Contract has no ETH balance for VRF payments!`);
            }
        }
        
        // Additional contract stats
        console.log(`\n📈 Additional Information:`);
        try {
            const playerStats = await casinoSlot.getPlayerStats(spin.player);
            console.log(`Player CHIPS balance: ${ethers.utils.formatEther(playerStats.balance)} CHIPS`);
            console.log(`Player total spins: ${playerStats.spinsCount.toString()}`);
            console.log(`Player total winnings: ${ethers.utils.formatEther(playerStats.totalWinnings)} CHIPS`);
            console.log(`Player total bet: ${ethers.utils.formatEther(playerStats.totalBetAmount)} CHIPS`);
        } catch (error) {
            console.log(`Could not fetch player stats: ${error.message}`);
        }
        
    } catch (error) {
        console.error(`❌ Error fetching spin data: ${error.message}`);
        
        // Try to provide helpful debugging info
        console.log(`\n🔧 Debugging Information:`);
        console.log(`Contract Address: ${CASINO_ADDRESS}`);
        console.log(`Request ID: ${requestId}`);
        console.log(`Network: ${network.name}`);
        
        // Check if contract exists
        const code = await ethers.provider.getCode(CASINO_ADDRESS);
        if (code === "0x") {
            console.log(`❌ No contract found at address ${CASINO_ADDRESS}`);
        } else {
            console.log(`✅ Contract exists at address`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 