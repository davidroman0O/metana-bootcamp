/**
 * Concurrent Multi-Player Test Data Generator with Fast Execution
 * 
 * This script simulates 10 players playing concurrently with optimized performance.
 * All players execute their spins in parallel for maximum speed.
 * 
 * Features:
 * - True concurrent execution for all players
 * - Batch approvals to reduce transaction count
 * - Optimized VRF fulfillment handling
 * - Real-time progress tracking
 * - Transaction throughput metrics
 * 
 * Usage: npm run test:multi-player-concurrent
 */

const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getAddresses } = require("./utils/addresses");

class ConcurrentMultiPlayerSimulator {
    constructor() {
        this.players = [];
        this.casinoSlot = null;
        this.vrfCoordinatorAddress = null;
        this.vrfPendingRequests = new Map();
        this.activeSpins = new Map(); // Track active spins per player
        this.startTime = Date.now();
        this.stats = {
            totalSpins: 0,
            completedSpins: 0,
            totalWins: 0,
            totalLosses: 0,
            totalChipsWon: ethers.BigNumber.from(0),
            totalChipsLost: ethers.BigNumber.from(0),
            payoutDistribution: {
                0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0
            },
            reelDistribution: {
                3: 0, 4: 0, 5: 0, 6: 0, 7: 0
            },
            playerStats: {},
            transactionsPerSecond: 0
        };
    }

    async initialize() {
        console.log("🚀 Concurrent Multi-Player Casino Simulation");
        console.log("==========================================\n");

        // Get network info
        const network = await hre.ethers.provider.getNetwork();
        if (network.chainId !== 31337) {
            throw new Error("This script is designed for local development (chainId 31337)");
        }

        // Load addresses
        const addresses = getAddresses(hre.network.name);
        
        if (!addresses?.casino?.proxy) {
            throw new Error("No casino contract found. Please deploy contracts first.");
        }
        
        const casinoSlotAddress = addresses.casino.proxy;
        this.vrfCoordinatorAddress = addresses.mock?.vrfCoordinator;
        
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
            { name: "Conservative Carl", style: "conservative", chipsAmount: "1.0", spins: 10 },
            { name: "Aggressive Amy", style: "aggressive", chipsAmount: "5.0", spins: 20 },
            { name: "Balanced Bob", style: "balanced", chipsAmount: "2.5", spins: 15 },
            { name: "Lucky Lucy", style: "aggressive", chipsAmount: "4.0", spins: 18 },
            { name: "Steady Steve", style: "conservative", chipsAmount: "1.5", spins: 12 },
            { name: "Risk-taker Rita", style: "aggressive", chipsAmount: "3.5", spins: 20 },
            { name: "Moderate Mike", style: "balanced", chipsAmount: "2.0", spins: 14 },
            { name: "Cautious Cathy", style: "conservative", chipsAmount: "1.2", spins: 10 },
            { name: "Bold Billy", style: "aggressive", chipsAmount: "4.5", spins: 22 },
            { name: "Average Alice", style: "balanced", chipsAmount: "2.0", spins: 13 }
        ];
        
        console.log("📊 Initializing 10 concurrent players...");
        
        for (let i = 0; i < 10; i++) {
            const player = {
                index: i,
                account: accounts[i],
                address: accounts[i].address,
                name: playerStyles[i].name,
                style: playerStyles[i].style,
                initialChipsAmount: ethers.utils.parseEther(playerStyles[i].chipsAmount),
                targetSpins: playerStyles[i].spins,
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
        
        // Listen for SpinInitiated events and auto-fulfill immediately
        this.casinoSlot.on("SpinInitiated", async (requestId, player, reelCount, betAmount, vrfCostETH, houseFeeETH, prizePoolContribution, timestamp, event) => {
            // Store request details
            this.vrfPendingRequests.set(requestId.toString(), {
                player,
                reelCount: ethers.BigNumber.isBigNumber(reelCount) ? reelCount.toNumber() : reelCount,
                betAmount,
                blockNumber: event.blockNumber
            });
            
            // Auto-fulfill VRF request immediately (like the original script)
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
                
                // Update completed count
                this.stats.completedSpins++;
                
                // Update TPS
                const elapsed = (Date.now() - this.startTime) / 1000;
                this.stats.transactionsPerSecond = this.stats.completedSpins / elapsed;
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

    async buyChipsForAllPlayers() {
        console.log("💰 All players buying CHIPS concurrently...\n");
        
        const buyPromises = this.players.map(async (player) => {
            try {
                const buyTx = await this.casinoSlot.connect(player.account).buyChips({ 
                    value: player.initialChipsAmount,
                    gasLimit: 300000
                });
                await buyTx.wait();
                
                player.chipsBalance = await this.casinoSlot.balanceOf(player.address);
                console.log(`   ✅ ${player.name}: ${ethers.utils.formatEther(player.chipsBalance)} CHIPS`);
            } catch (error) {
                console.error(`   ❌ ${player.name} failed to buy CHIPS: ${error.message}`);
            }
        });
        
        await Promise.all(buyPromises);
        console.log();
    }

    async approveChipsForPlayer(player) {
        // Approve max amount to avoid per-spin approvals
        const maxAmount = ethers.constants.MaxUint256;
        
        const approveTx = await this.casinoSlot.connect(player.account).approve(
            this.casinoSlot.address, 
            maxAmount,
            { gasLimit: 100000, gasPrice: ethers.utils.parseUnits("50", "gwei") }
        );
        await approveTx.wait();
    }

    getReelCountForStyle(style, spinNumber) {
        const random = Math.random();
        
        switch(style) {
            case "conservative":
                return random < 0.7 ? 3 : 4;
            
            case "aggressive":
                if (random < 0.2) return 5;
                if (random < 0.5) return 6;
                return 7;
            
            case "balanced":
            default:
                if (random < 0.2) return 3;
                if (random < 0.5) return 4;
                if (random < 0.8) return 5;
                return 6;
        }
    }

    async executeSpinForPlayer(player, reelCount, spinNumber) {
        const spinId = `${player.address}-${spinNumber}`;
        
        try {
            // Get spin cost
            const spinCost = await this.casinoSlot.getSpinCost(reelCount);
            
            // Execute spin first
            const spinTx = await this.casinoSlot.connect(player.account).spinReels(reelCount, {
                gasLimit: 500000,
                gasPrice: ethers.utils.parseUnits("50", "gwei")
            });
            
            const receipt = await spinTx.wait();
            
            // Find SpinInitiated event to get requestId
            const spinInitiatedEvent = receipt.events?.find(e => e.event === "SpinInitiated");
            if (!spinInitiatedEvent) {
                throw new Error("SpinInitiated event not found");
            }
            
            const requestId = spinInitiatedEvent.args.requestId;
            this.activeSpins.set(spinId, { requestId });
            
            // Now wait for completion with the known requestId
            const spinCompletePromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.casinoSlot.removeListener("SpinCompleted", tempListener);
                    reject(new Error(`Spin timeout for request ${requestId}`));
                }, 30000); // Increased timeout
                
                const tempListener = (reqId, playerAddr, reelCnt, reels, payoutType, payout, isJackpot) => {
                    if (reqId.toString() === requestId.toString()) {
                        clearTimeout(timeout);
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
            
            // Wait for result
            const result = await spinCompletePromise;
            
            // Update statistics
            this.updateStats(player, reelCount, spinCost, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ ${player.name} spin ${spinNumber} failed: ${error.message}`);
            return null;
        } finally {
            this.activeSpins.delete(spinId);
        }
    }

    updateStats(player, reelCount, betAmount, result) {
        // Update player stats
        player.stats.spins++;
        player.stats.totalBet = player.stats.totalBet.add(betAmount);
        
        // Update global stats  
        this.stats.reelDistribution[reelCount]++;
        
        if (result) {
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
                this.stats.totalChipsLost = this.stats.totalChipsLost.add(betAmount);
            }
        }
    }

    async playPlayerConcurrently(player) {
        console.log(`🎮 ${player.name} starting ${player.targetSpins} spins...`);
        
        // Approve max CHIPS first
        await this.approveChipsForPlayer(player);
        
        // Execute all spins concurrently with controlled parallelism
        const maxConcurrent = 3; // Max concurrent spins per player
        const spinPromises = [];
        
        for (let i = 0; i < player.targetSpins; i++) {
            // Control parallelism
            if (spinPromises.length >= maxConcurrent) {
                await Promise.race(spinPromises);
                spinPromises.splice(spinPromises.findIndex(p => p.resolved), 1);
            }
            
            const reelCount = this.getReelCountForStyle(player.style, i);
            
            const spinPromise = this.executeSpinForPlayer(player, reelCount, i)
                .then(result => {
                    spinPromise.resolved = true;
                    if (result && result.payoutType >= 5) {
                        console.log(`   🎉 ${player.name} hit ${this.getPayoutTypeName(result.payoutType)}!`);
                    }
                    return result;
                })
                .catch(error => {
                    spinPromise.resolved = true;
                    return null;
                });
            
            spinPromises.push(spinPromise);
        }
        
        // Wait for remaining spins
        await Promise.all(spinPromises);
        
        // Get final balance
        player.chipsBalance = await this.casinoSlot.balanceOf(player.address);
        
        console.log(`✅ ${player.name} completed: ${player.stats.wins}W-${player.stats.losses}L, Balance: ${ethers.utils.formatEther(player.chipsBalance)} CHIPS`);
    }

    async runConcurrentSimulation() {
        console.log("🚀 Starting concurrent gameplay for all players...\n");
        
        // Calculate total expected spins
        const totalExpectedSpins = this.players.reduce((sum, player) => sum + player.targetSpins, 0);
        this.stats.totalExpectedSpins = totalExpectedSpins;
        
        // Show real-time progress
        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const tps = this.stats.transactionsPerSecond.toFixed(2);
            const progress = totalExpectedSpins > 0 
                ? ((this.stats.completedSpins / totalExpectedSpins) * 100).toFixed(1)
                : "0.0";
            
            process.stdout.write(`\r⚡ Progress: ${this.stats.completedSpins}/${totalExpectedSpins} spins (${progress}%) | TPS: ${tps} | Time: ${elapsed.toFixed(1)}s`);
        }, 500);
        
        // Run all players concurrently
        await Promise.all(
            this.players.map(player => this.playPlayerConcurrently(player))
        );
        
        clearInterval(progressInterval);
        console.log("\n");
    }

    getPayoutTypeName(payoutType) {
        const types = [
            "LOSE", "SMALL_WIN", "MEDIUM_WIN", "BIG_WIN",
            "SPECIAL_COMBO", "MEGA_WIN", "ULTRA_WIN", "JACKPOT"
        ];
        return types[payoutType] || `UNKNOWN(${payoutType})`;
    }

    generateReport() {
        const totalTime = (Date.now() - this.startTime) / 1000;
        
        console.log("\n\n📈 FINAL STATISTICS");
        console.log("===================\n");
        
        // Performance metrics
        console.log("⚡ Performance Metrics:");
        console.log(`   Total Time: ${totalTime.toFixed(1)} seconds`);
        console.log(`   Average TPS: ${this.stats.transactionsPerSecond.toFixed(2)} transactions/second`);
        console.log(`   Total Transactions: ${this.stats.completedSpins}`);
        
        // Overall stats
        const totalSpins = this.stats.completedSpins;
        console.log("\n📊 Overall Performance:");
        console.log(`   Total Spins: ${totalSpins}`);
        console.log(`   Total Wins: ${this.stats.totalWins} (${((this.stats.totalWins / totalSpins) * 100).toFixed(1)}%)`);
        console.log(`   Total Losses: ${this.stats.totalLosses} (${((this.stats.totalLosses / totalSpins) * 100).toFixed(1)}%)`);
        console.log(`   Total CHIPS Won: ${ethers.utils.formatEther(this.stats.totalChipsWon)}`);
        console.log(`   Total CHIPS Lost: ${ethers.utils.formatEther(this.stats.totalChipsLost)}`);
        
        // Payout distribution
        console.log("\n📊 Payout Distribution:");
        for (let i = 0; i <= 7; i++) {
            const count = this.stats.payoutDistribution[i];
            const percentage = totalSpins > 0 ? ((count / totalSpins) * 100).toFixed(1) : "0.0";
            console.log(`   ${this.getPayoutTypeName(i)}: ${count} (${percentage}%)`);
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
        });
    }

    async cleanup() {
        this.casinoSlot.removeAllListeners();
    }
}

async function runConcurrentSimulation() {
    const simulator = new ConcurrentMultiPlayerSimulator();
    
    try {
        await simulator.initialize();
        await simulator.buyChipsForAllPlayers();
        await simulator.runConcurrentSimulation();
        simulator.generateReport();
        await simulator.cleanup();
        
    } catch (error) {
        console.error("❌ Simulation error:", error);
        await simulator.cleanup();
        throw error;
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Simulation stopped');
    process.exit(0);
});

// Auto-run if called directly
if (require.main === module) {
    runConcurrentSimulation()
        .then(() => {
            console.log('\n\n🎉 Concurrent simulation completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Failed:", error);
            process.exit(1);
        });
}

module.exports = runConcurrentSimulation;