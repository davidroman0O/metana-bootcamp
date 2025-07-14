/**
 * Multi-Player Test Data Generator with Integrated VRF Fulfillment
 * 
 * This script simulates 10 players playing multiple games with varied reel counts
 * and automatically handles VRF fulfillment inline - no separate process needed.
 * 
 * Features:
 * - 10 players with different play styles
 * - Automatic VRF fulfillment
 * - Varied reel counts (3-7)
 * - Realistic betting patterns
 * - Comprehensive statistics
 * 
 * Usage: npm run test:multi-player
 */

const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getAddresses } = require("./utils/addresses");

class MultiPlayerTestSimulator {
    constructor() {
        this.players = [];
        this.casinoSlot = null;
        this.vrfCoordinatorAddress = null;
        this.vrfPendingRequests = new Map();
        this.stats = {
            totalSpins: 0,
            totalWins: 0,
            totalLosses: 0,
            totalChipsWon: ethers.BigNumber.from(0),
            totalChipsLost: ethers.BigNumber.from(0),
            payoutDistribution: {
                0: 0, // LOSE
                1: 0, // SMALL_WIN
                2: 0, // MEDIUM_WIN
                3: 0, // BIG_WIN
                4: 0, // SPECIAL_COMBO
                5: 0, // MEGA_WIN
                6: 0, // ULTRA_WIN
                7: 0  // JACKPOT
            },
            reelDistribution: {
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0
            },
            playerStats: {}
        };
    }

    async initialize() {
        console.log("🎰 Multi-Player Casino Simulation");
        console.log("=================================\n");

        // Get network info
        const network = await hre.ethers.provider.getNetwork();
        if (network.chainId !== 31337) {
            throw new Error("This script is designed for local development (chainId 31337)");
        }

        // Load addresses using the standard pattern
        const addresses = getAddresses(hre.network.name);
        
        if (!addresses || !addresses.casino || !addresses.casino.proxy) {
            throw new Error("No casino contract found. Please deploy contracts first.");
        }
        
        // Get contract addresses
        const casinoSlotAddress = addresses.casino.proxy;
        
        if (!addresses.mock || !addresses.mock.vrfCoordinator) {
            throw new Error("No mock VRF coordinator found. Please deploy contracts first.");
        }
        
        this.vrfCoordinatorAddress = addresses.mock.vrfCoordinator;
        
        console.log(`🎯 Casino Contract: ${casinoSlotAddress}`);
        console.log(`🎲 VRF Coordinator: ${this.vrfCoordinatorAddress}\n`);
        
        // Get contract instance
        const contractFactory = network.chainId === 31337 ? "CasinoSlotTest" : "CasinoSlot";
        const CasinoSlot = await ethers.getContractFactory(contractFactory);
        this.casinoSlot = CasinoSlot.attach(casinoSlotAddress);
        
        // Get all 10 accounts
        const accounts = await ethers.getSigners();
        
        // Initialize players with different styles
        const playerStyles = [
            { name: "Conservative Carl", style: "conservative", chipsAmount: "0.5" },
            { name: "Aggressive Amy", style: "aggressive", chipsAmount: "3.0" },
            { name: "Balanced Bob", style: "balanced", chipsAmount: "1.5" },
            { name: "Lucky Lucy", style: "aggressive", chipsAmount: "2.5" },
            { name: "Steady Steve", style: "conservative", chipsAmount: "1.0" },
            { name: "Risk-taker Rita", style: "aggressive", chipsAmount: "2.0" },
            { name: "Moderate Mike", style: "balanced", chipsAmount: "1.2" },
            { name: "Cautious Cathy", style: "conservative", chipsAmount: "0.8" },
            { name: "Bold Billy", style: "aggressive", chipsAmount: "2.2" },
            { name: "Average Alice", style: "balanced", chipsAmount: "1.0" }
        ];
        
        console.log("📊 Initializing 10 players...");
        
        for (let i = 0; i < 10; i++) {
            const player = {
                index: i,
                account: accounts[i],
                address: accounts[i].address,
                name: playerStyles[i].name,
                style: playerStyles[i].style,
                initialChipsAmount: ethers.utils.parseEther(playerStyles[i].chipsAmount),
                chipsBalance: ethers.BigNumber.from(0),
                stats: {
                    spins: 0,
                    wins: 0,
                    losses: 0,
                    totalWon: ethers.BigNumber.from(0),
                    totalBet: ethers.BigNumber.from(0),
                    biggestWin: ethers.BigNumber.from(0),
                    currentStreak: 0,
                    bestStreak: 0
                }
            };
            
            this.players.push(player);
            this.stats.playerStats[player.address] = player.stats;
        }
        
        // Set up VRF listener
        await this.setupVRFListener();
    }

    async setupVRFListener() {
        console.log("🎲 Setting up integrated VRF fulfillment...\n");
        
        // Listen for SpinInitiated events and auto-fulfill
        this.casinoSlot.on("SpinInitiated", async (requestId, player, reelCount, betAmount, vrfCostETH, houseFeeETH, prizePoolContribution, timestamp, event) => {
            // Store request details
            this.vrfPendingRequests.set(requestId.toString(), {
                player,
                reelCount: ethers.BigNumber.isBigNumber(reelCount) ? reelCount.toNumber() : reelCount,
                betAmount,
                blockNumber: event.blockNumber
            });
            
            // Auto-fulfill VRF request
            try {
                await this.fulfillVRFRequest(requestId, player, reelCount);
            } catch (error) {
                console.error(`   ❌ VRF fulfillment failed: ${error.message}`);
            }
        });
        
        // Listen for SpinCompleted events
        this.casinoSlot.on("SpinCompleted", (requestId, player, reelCount, reels, payoutType, payout, isJackpot, event) => {
            const request = this.vrfPendingRequests.get(requestId.toString());
            if (request) {
                request.completed = true;
                request.reels = reels.map(r => r.toNumber());
                request.payoutType = payoutType;
                request.payout = payout;
                request.isJackpot = isJackpot;
            }
        });
    }

    async fulfillVRFRequest(requestId, player, reelCount) {
        // Generate random number
        const randomWord = ethers.BigNumber.from(ethers.utils.randomBytes(32));
        
        // Impersonate VRF coordinator
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [this.vrfCoordinatorAddress],
        });
        
        // Fund VRF coordinator
        await hre.network.provider.send("hardhat_setBalance", [
            this.vrfCoordinatorAddress,
            "0xDE0B6B3A7640000", // 1 ETH
        ]);
        
        // Get impersonated signer
        const vrfCoordinatorSigner = await ethers.getSigner(this.vrfCoordinatorAddress);
        
        // Fulfill the request
        const tx = await this.casinoSlot.connect(vrfCoordinatorSigner).rawFulfillRandomWords(
            requestId, 
            [randomWord], 
            { gasLimit: 500000 }
        );
        
        await tx.wait();
        
        // Stop impersonating
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [this.vrfCoordinatorAddress],
        });
    }

    async buyChipsForPlayer(player) {
        console.log(`💰 ${player.name} buying ${ethers.utils.formatEther(player.initialChipsAmount)} ETH worth of CHIPS...`);
        
        const buyTx = await this.casinoSlot.connect(player.account).buyChips({ 
            value: player.initialChipsAmount,
            gasLimit: 300000
        });
        await buyTx.wait();
        
        player.chipsBalance = await this.casinoSlot.balanceOf(player.address);
        console.log(`   ✅ Received ${ethers.utils.formatEther(player.chipsBalance)} CHIPS\n`);
    }

    getReelCountForStyle(style, spinNumber) {
        const random = Math.random();
        
        switch(style) {
            case "conservative":
                // Mostly 3-4 reels
                return random < 0.7 ? 3 : 4;
            
            case "aggressive":
                // Mostly 5-7 reels
                if (random < 0.3) return 5;
                if (random < 0.6) return 6;
                return 7;
            
            case "balanced":
            default:
                // Mix of 4-5 reels
                if (random < 0.2) return 3;
                if (random < 0.5) return 4;
                if (random < 0.8) return 5;
                return 6;
        }
    }

    getSpinCountForStyle(style, currentStats) {
        const baseSpins = {
            conservative: 3 + Math.floor(Math.random() * 3), // 3-5 spins
            aggressive: 7 + Math.floor(Math.random() * 4),   // 7-10 spins
            balanced: 5 + Math.floor(Math.random() * 3)      // 5-7 spins
        };
        
        let spins = baseSpins[style] || 5;
        
        // Adjust based on performance
        if (currentStats.currentStreak > 2) {
            spins += 2; // Play more when winning
        } else if (currentStats.currentStreak < -3) {
            spins = Math.max(2, spins - 2); // Play less when losing
        }
        
        return spins;
    }

    async executeSpinForPlayer(player, reelCount) {
        // Get spin cost
        const spinCost = await this.casinoSlot.getSpinCost(reelCount);
        
        // Check if player has enough CHIPS
        if (player.chipsBalance.lt(spinCost)) {
            console.log(`   ❌ Not enough CHIPS for spin (need ${ethers.utils.formatEther(spinCost)})`);
            return null;
        }
        
        // Approve CHIPS
        const approveTx = await this.casinoSlot.connect(player.account).approve(
            this.casinoSlot.address, 
            spinCost,
            { gasLimit: 100000 }
        );
        await approveTx.wait();
        
        // Create a promise to wait for spin completion
        const spinCompletePromise = new Promise((resolve) => {
            const tempListener = (reqId, playerAddr, reelCnt, reels, payoutType, payout, isJackpot) => {
                if (playerAddr.toLowerCase() === player.address.toLowerCase()) {
                    this.casinoSlot.removeListener("SpinCompleted", tempListener);
                    resolve({
                        requestId: reqId,
                        reels: reels.map(r => r.toNumber()),
                        payoutType: payoutType,
                        payout: payout,
                        isJackpot: isJackpot
                    });
                }
            };
            this.casinoSlot.on("SpinCompleted", tempListener);
        });
        
        // Execute spin
        const spinTx = await this.casinoSlot.connect(player.account).spinReels(reelCount, {
            gasLimit: 500000
        });
        await spinTx.wait();
        
        // Wait for result (with timeout)
        const result = await Promise.race([
            spinCompletePromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Spin timeout")), 10000)
            )
        ]);
        
        // Update player balance
        player.chipsBalance = await this.casinoSlot.balanceOf(player.address);
        
        // Update statistics
        player.stats.spins++;
        player.stats.totalBet = player.stats.totalBet.add(spinCost);
        this.stats.totalSpins++;
        this.stats.reelDistribution[reelCount]++;
        this.stats.payoutDistribution[result.payoutType]++;
        
        if (result.payout.gt(0)) {
            player.stats.wins++;
            player.stats.totalWon = player.stats.totalWon.add(result.payout);
            player.stats.currentStreak = Math.max(0, player.stats.currentStreak) + 1;
            player.stats.bestStreak = Math.max(player.stats.bestStreak, player.stats.currentStreak);
            
            if (result.payout.gt(player.stats.biggestWin)) {
                player.stats.biggestWin = result.payout;
            }
            
            this.stats.totalWins++;
            this.stats.totalChipsWon = this.stats.totalChipsWon.add(result.payout);
        } else {
            player.stats.losses++;
            player.stats.currentStreak = Math.min(0, player.stats.currentStreak) - 1;
            this.stats.totalLosses++;
            this.stats.totalChipsLost = this.stats.totalChipsLost.add(spinCost);
        }
        
        return result;
    }

    async playPlayer(player) {
        console.log(`\n🎮 ${player.name} (${player.style}) starting to play...`);
        
        // Buy CHIPS first
        await this.buyChipsForPlayer(player);
        
        // Determine number of spins
        const spinCount = this.getSpinCountForStyle(player.style, player.stats);
        console.log(`   🎯 Planning ${spinCount} spins\n`);
        
        for (let spin = 0; spin < spinCount; spin++) {
            // Check if player still has chips
            if (player.chipsBalance.lte(0)) {
                console.log(`   💸 ${player.name} is out of CHIPS!`);
                break;
            }
            
            // Get reel count based on style
            const reelCount = this.getReelCountForStyle(player.style, spin);
            
            console.log(`   Spin ${spin + 1}/${spinCount} (${reelCount} reels):`);
            
            try {
                const result = await this.executeSpinForPlayer(player, reelCount);
                
                if (result) {
                    const payoutName = this.getPayoutTypeName(result.payoutType);
                    console.log(`   → Result: [${result.reels.join(',')}] - ${payoutName} (${ethers.utils.formatEther(result.payout)} CHIPS)`);
                    console.log(`   → Balance: ${ethers.utils.formatEther(player.chipsBalance)} CHIPS`);
                    
                    // React to big wins
                    if (result.payoutType >= 5) { // MEGA_WIN or better
                        console.log(`   🎉 ${player.name} hit a ${payoutName}!`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Spin failed: ${error.message}`);
            }
            
            // Small delay between spins
            await this.delay(150 + Math.random() * 250); 
        }
        
        console.log(`\n   📊 ${player.name} finished with ${ethers.utils.formatEther(player.chipsBalance)} CHIPS`);
        console.log(`   📈 Record: ${player.stats.wins}W-${player.stats.losses}L`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
        // return new Promise.resolve( => {});
    }

    getPayoutTypeName(payoutType) {
        const types = [
            "LOSE",           // 0
            "SMALL_WIN",      // 1  
            "MEDIUM_WIN",     // 2
            "BIG_WIN",        // 3
            "SPECIAL_COMBO",  // 4
            "MEGA_WIN",       // 5
            "ULTRA_WIN",      // 6
            "JACKPOT"         // 7
        ];
        
        return types[payoutType] || `UNKNOWN(${payoutType})`;
    }

    generateReport() {
        console.log("\n\n📈 FINAL STATISTICS");
        console.log("===================\n");
        
        // Overall stats
        console.log("📊 Overall Performance:");
        console.log(`   Total Spins: ${this.stats.totalSpins}`);
        console.log(`   Total Wins: ${this.stats.totalWins} (${((this.stats.totalWins / this.stats.totalSpins) * 100).toFixed(1)}%)`);
        console.log(`   Total Losses: ${this.stats.totalLosses} (${((this.stats.totalLosses / this.stats.totalSpins) * 100).toFixed(1)}%)`);
        console.log(`   Total CHIPS Won: ${ethers.utils.formatEther(this.stats.totalChipsWon)}`);
        console.log(`   Total CHIPS Lost: ${ethers.utils.formatEther(this.stats.totalChipsLost)}`);
        
        // Payout distribution
        console.log("\n📊 Payout Distribution:");
        for (let i = 0; i <= 7; i++) {
            const count = this.stats.payoutDistribution[i];
            const percentage = ((count / this.stats.totalSpins) * 100).toFixed(1);
            console.log(`   ${this.getPayoutTypeName(i)}: ${count} (${percentage}%)`);
        }
        
        // Reel distribution
        console.log("\n🎰 Reel Popularity:");
        for (let reels = 3; reels <= 7; reels++) {
            const count = this.stats.reelDistribution[reels];
            const percentage = ((count / this.stats.totalSpins) * 100).toFixed(1);
            console.log(`   ${reels} reels: ${count} spins (${percentage}%)`);
        }
        
        // Player leaderboard
        console.log("\n🏆 Player Leaderboard:");
        const sortedPlayers = this.players.sort((a, b) => {
            const aProfit = a.stats.totalWon.sub(a.stats.totalBet);
            const bProfit = b.stats.totalWon.sub(b.stats.totalBet);
            return bProfit.gt(aProfit) ? 1 : -1;
        });
        
        sortedPlayers.forEach((player, index) => {
            const profit = player.stats.totalWon.sub(player.stats.totalBet);
            const profitStr = profit.gte(0) ? `+${ethers.utils.formatEther(profit)}` : ethers.utils.formatEther(profit);
            console.log(`   ${index + 1}. ${player.name}: ${profitStr} CHIPS (${player.stats.wins}W-${player.stats.losses}L)`);
            
            if (player.stats.biggestWin.gt(0)) {
                console.log(`      Biggest win: ${ethers.utils.formatEther(player.stats.biggestWin)} CHIPS`);
            }
        });
        
        // Most lucky/unlucky
        console.log("\n🍀 Special Mentions:");
        const luckiest = sortedPlayers[0];
        const unluckiest = sortedPlayers[sortedPlayers.length - 1];
        console.log(`   Luckiest: ${luckiest.name} (${luckiest.stats.wins}/${luckiest.stats.spins} wins)`);
        console.log(`   Unluckiest: ${unluckiest.name} (${unluckiest.stats.wins}/${unluckiest.stats.spins} wins)`);
        
        const mostActive = this.players.reduce((a, b) => a.stats.spins > b.stats.spins ? a : b);
        console.log(`   Most Active: ${mostActive.name} (${mostActive.stats.spins} spins)`);
    }

    async cleanup() {
        // Remove all listeners
        this.casinoSlot.removeAllListeners();
    }
}

async function runMultiPlayerSimulation() {
    const simulator = new MultiPlayerTestSimulator();
    
    try {
        // Initialize
        await simulator.initialize();
        
        console.log("🎲 Starting gameplay simulation...\n");
        
        // Play each player sequentially
        for (const player of simulator.players) {
            await simulator.playPlayer(player);
            
            // Small break between players
            await simulator.delay(150);
        }
        
        // Generate final report
        simulator.generateReport();
        
        // Cleanup
        await simulator.cleanup();
        
    } catch (error) {
        console.error("❌ Simulation error:", error);
        await simulator.cleanup();
        throw error;
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Multi-player simulation stopped');
    process.exit(0);
});

// Auto-run if called directly
if (require.main === module) {
    runMultiPlayerSimulation()
        .then(() => {
            console.log('\n\n🎉 Multi-player simulation completed!');
            console.log('📊 Check your subgraph for rich test data!');
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Failed to run simulation:", error);
            process.exit(1);
        });
}

module.exports = runMultiPlayerSimulation;