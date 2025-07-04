const { ethers } = require("hardhat");

async function main() {
    console.log("\n🎲 Final VRF Debugging on Sepolia");
    console.log("==================================");
    
    // Load the current deployment
    const deployment = require('../deployments/deployment-11155111.json');
    const VRF_WRAPPER = deployment.contracts.CasinoSlot.constructor.vrfWrapper;
    const CASINO_ADDRESS = deployment.contracts.CasinoSlot.address;
    const LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
    
    // Get casino contract
    const casino = await ethers.getContractAt("CasinoSlot", CASINO_ADDRESS);
    const linkToken = await ethers.getContractAt([
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
        "function transfer(address,uint256) returns (bool)"
    ], LINK_TOKEN);
    
    console.log("\n📊 Current State Summary");
    console.log("========================");
    
    const linkBalance = await linkToken.balanceOf(CASINO_ADDRESS);
    const contractETH = await ethers.provider.getBalance(CASINO_ADDRESS);
    
    console.log(`🔗 Casino LINK: ${ethers.utils.formatEther(linkBalance)}`);
    console.log(`💰 Casino ETH: ${ethers.utils.formatEther(contractETH)}`);
    
    // Test the exact VRF request that the contract is trying to make
    console.log("\n🧪 Testing Exact VRF Request");
    console.log("============================");
    
    try {
        // Get the exact parameters the contract uses
        const callbackGasLimit = await casino.callbackGasLimit();
        const requestConfirmations = await casino.requestConfirmations();
        const numWords = await casino.numWords();
        
        console.log(`⚙️  VRF Parameters:`);
        console.log(`   Callback Gas: ${callbackGasLimit}`);
        console.log(`   Confirmations: ${requestConfirmations}`);
        console.log(`   Words: ${numWords}`);
        
        // Create the exact extraArgs that the contract creates
        // This is from VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        const extraArgs = "0x97a657c9"; // This is the encoded bytes for {nativePayment: false}
        
        console.log(`🔧 Extra Args: ${extraArgs}`);
        
        // Connect to VRF wrapper with the exact interface the contract uses
        const vrfWrapper = await ethers.getContractAt([
            "function requestRandomness(uint32 _callbackGasLimit, uint16 _requestConfirmations, uint32 _numWords, bytes memory extraArgs) external returns (uint256 requestId, uint256 reqPrice)",
            "function calculateRequestPrice(uint32 _callbackGasLimit, uint32 _numWords) external view returns (uint256)",
            "function link() external view returns (address)",
            "function linkNativeFeed() external view returns (address)"
        ], VRF_WRAPPER);
        
        // Check VRF wrapper configuration
        console.log(`\n🔍 VRF Wrapper Configuration:`);
        try {
            const linkAddr = await vrfWrapper.link();
            console.log(`   LINK Token: ${linkAddr}`);
            console.log(`   Matches our LINK: ${linkAddr.toLowerCase() === LINK_TOKEN.toLowerCase()}`);
            
            const feedAddr = await vrfWrapper.linkNativeFeed();
            console.log(`   Price Feed: ${feedAddr}`);
        } catch (configError) {
            console.log(`   ❌ Config check failed: ${configError.message}`);
        }
        
        // Test the exact calculateRequestPrice call
        try {
            const requestPrice = await vrfWrapper.calculateRequestPrice(callbackGasLimit, numWords);
            console.log(`💰 VRF Request Price: ${ethers.utils.formatEther(requestPrice)} LINK`);
            
            if (requestPrice.eq(0)) {
                console.log(`❌ CRITICAL: VRF request price is 0 - this is wrong!`);
                console.log(`💡 The VRF wrapper might not be configured correctly`);
            }
        } catch (priceError) {
            console.log(`❌ Price calculation failed: ${priceError.message}`);
        }
        
        // Test if we can simulate the actual VRF request
        console.log(`\n🚀 Simulating VRF Request Call:`);
        try {
            // This should fail with gas estimation but give us the error
            await vrfWrapper.estimateGas.requestRandomness(
                callbackGasLimit,
                requestConfirmations, 
                numWords,
                extraArgs,
                { from: CASINO_ADDRESS }
            );
            console.log(`✅ VRF request simulation succeeded`);
        } catch (simError) {
            console.log(`❌ VRF request simulation failed: ${simError.message}`);
            
            if (simError.message.includes("InsufficientBalance")) {
                console.log(`   💡 Contract doesn't have enough LINK`);
            } else if (simError.message.includes("InvalidConsumer")) {
                console.log(`   💡 Contract not authorized as VRF consumer`);
            } else if (simError.message.includes("InvalidSubscription")) {
                console.log(`   💡 VRF subscription issue`);
            } else {
                console.log(`   💡 Unknown VRF error - wrapper might be broken`);
            }
        }
        
    } catch (error) {
        console.log(`❌ VRF testing failed: ${error.message}`);
    }
    
    console.log("\n🎯 LIKELY SOLUTIONS:");
    console.log("====================");
    console.log("1. Send more LINK to casino contract (try 5-10 LINK)");
    console.log("2. Check if VRF v2.5 wrapper is working on Sepolia");
    console.log("3. Try using a different VRF approach (subscription instead of direct funding)");
    console.log("4. Manually test VRF wrapper on Sepolia explorer");
    
    console.log(`\n🔧 Quick Fix Commands:`);
    console.log("======================");
    console.log(`Send LINK: Go to https://sepolia.etherscan.io/token/${LINK_TOKEN}#writeContract`);
    console.log(`Target: ${CASINO_ADDRESS}`);
    console.log(`Amount: 5000000000000000000 (5 LINK)`);
}

main().catch(console.error); 