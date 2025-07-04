const { ethers } = require("hardhat");

async function main() {
    console.log("\n🎲 Debugging VRF Wrapper Issue on Sepolia");
    console.log("==========================================");
    
    const VRF_WRAPPER = "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1";
    const CASINO_ADDRESS = "0x1D5e54536B63c21dfBE0D5C106d8AD5c934C1aF4";
    const LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
    
    console.log(`🎲 VRF Wrapper: ${VRF_WRAPPER}`);
    console.log(`🎰 Casino: ${CASINO_ADDRESS}`);
    console.log(`🔗 LINK Token: ${LINK_TOKEN}`);
    
    // Check if VRF wrapper exists
    console.log("\n📋 Step 1: Check VRF Wrapper Exists");
    console.log("===================================");
    
    try {
        const code = await ethers.provider.getCode(VRF_WRAPPER);
        console.log(`✅ VRF Wrapper has code: ${code.length > 2}`);
        
        if (code.length <= 2) {
            console.log(`❌ PROBLEM: VRF Wrapper address has no contract code!`);
            console.log(`💡 The address might be wrong or the wrapper isn't deployed`);
            return;
        }
    } catch (error) {
        console.log(`❌ Error checking VRF wrapper: ${error.message}`);
        return;
    }
    
    // Check casino's LINK balance
    console.log("\n📋 Step 2: Check Casino LINK Balance");
    console.log("====================================");
    
    try {
        const linkToken = await ethers.getContractAt([
            "function balanceOf(address) view returns (uint256)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
        ], LINK_TOKEN);
        
        const linkBalance = await linkToken.balanceOf(CASINO_ADDRESS);
        const symbol = await linkToken.symbol();
        
        console.log(`🔗 Casino ${symbol} balance: ${ethers.utils.formatEther(linkBalance)}`);
        
        if (linkBalance.eq(0)) {
            console.log(`❌ PROBLEM: Casino has no LINK tokens!`);
            console.log(`💡 For VRF v2.5 Direct Funding, the contract needs LINK tokens`);
            console.log(`💡 Send some LINK to the casino contract`);
            return;
        }
        
    } catch (error) {
        console.log(`❌ Error checking LINK balance: ${error.message}`);
        return;
    }
    
    // Try to get VRF cost estimate
    console.log("\n📋 Step 3: Check VRF Request Cost");
    console.log("=================================");
    
    try {
        const casino = await ethers.getContractAt("CasinoSlot", CASINO_ADDRESS);
        
        // Get VRF parameters from the contract
        const callbackGasLimit = await casino.callbackGasLimit();
        const requestConfirmations = await casino.requestConfirmations();
        const numWords = await casino.numWords();
        
        console.log(`⛽ Callback Gas Limit: ${callbackGasLimit.toString()}`);
        console.log(`🔄 Request Confirmations: ${requestConfirmations.toString()}`);
        console.log(`🎲 Number of Words: ${numWords.toString()}`);
        
        // Try to estimate VRF request cost (this might be the failing part)
        try {
            // Simulate what the contract does for VRF request
            const vrfWrapper = await ethers.getContractAt([
                "function requestRandomness(uint32,uint16,uint32,bytes) external returns (uint256, uint256)",
                "function calculateRequestPrice(uint32,uint32) external view returns (uint256)"
            ], VRF_WRAPPER);
            
            // Check if we can get the request price
            const requestPrice = await vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
            console.log(`💰 VRF Request Price: ${ethers.utils.formatEther(requestPrice)} LINK`);
            
            const linkBalance = await linkToken.balanceOf(CASINO_ADDRESS);
            const canAfford = linkBalance.gte(requestPrice);
            console.log(`✅ Casino can afford VRF request: ${canAfford}`);
            
            if (!canAfford) {
                console.log(`❌ PROBLEM: Not enough LINK for VRF request!`);
                console.log(`   Current: ${ethers.utils.formatEther(linkBalance)} LINK`);
                console.log(`   Needed: ${ethers.utils.formatEther(requestPrice)} LINK`);
                return;
            }
            
        } catch (vrfError) {
            console.log(`❌ VRF request simulation failed: ${vrfError.message}`);
            console.log(`💡 This might be why your spins are failing!`);
            
            if (vrfError.message.includes("insufficient")) {
                console.log(`   ❌ Insufficient LINK or ETH for VRF`);
            } else if (vrfError.message.includes("revert")) {
                console.log(`   ❌ VRF wrapper is rejecting the request`);
            } else {
                console.log(`   ❌ VRF wrapper might not be working properly`);
            }
            return;
        }
        
    } catch (error) {
        console.log(`❌ Error checking VRF cost: ${error.message}`);
        return;
    }
    
    // Check if contract needs ETH to pay for VRF in native token
    console.log("\n📋 Step 4: Check VRF Payment Method");
    console.log("===================================");
    
    try {
        const contractETH = await ethers.provider.getBalance(CASINO_ADDRESS);
        console.log(`💰 Contract ETH: ${ethers.utils.formatEther(contractETH)}`);
        
        // Check if VRF wrapper expects native payment
        console.log(`💡 VRF v2.5 Direct Funding uses LINK tokens, not ETH`);
        console.log(`💡 Make sure contract has LINK tokens for VRF requests`);
        
    } catch (error) {
        console.log(`❌ Error checking payment method: ${error.message}`);
    }
    
    console.log("\n💡 POTENTIAL SOLUTIONS:");
    console.log("=======================");
    console.log("1. Send LINK tokens to the casino contract");
    console.log("2. Check if VRF wrapper address is correct for Sepolia");
    console.log("3. Verify VRF v2.5 Direct Funding is properly configured");
    console.log("4. Test VRF request manually with minimal parameters");
}

main().catch(console.error); 