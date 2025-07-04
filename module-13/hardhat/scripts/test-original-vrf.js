const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing ORIGINAL VRF Wrapper Address");
    console.log("=====================================");
    
    const ORIGINAL_VRF = "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1";
    const NEW_VRF = "0xab18414CD93297B0d12ac29E63Ca20f515b3DB46";
    
    console.log("Original VRF:", ORIGINAL_VRF);
    console.log("New VRF:     ", NEW_VRF);
    
    try {
        // Test original VRF wrapper
        console.log("\n📋 Testing Original VRF Wrapper");
        console.log("===============================");
        
        const originalVRF = await ethers.getContractAt([
            "function calculateRequestPrice(uint32) view returns (uint256)",
            "function estimateRequestPrice(uint32, uint256) view returns (uint256)"
        ], ORIGINAL_VRF);
        
        const originalPrice = await originalVRF.calculateRequestPrice(100000);
        console.log("✅ Original VRF price:", ethers.utils.formatEther(originalPrice), "LINK");
        
        // Test new VRF wrapper  
        console.log("\n📋 Testing New VRF Wrapper");
        console.log("===========================");
        
        const newVRF = await ethers.getContractAt([
            "function calculateRequestPrice(uint32) view returns (uint256)",
            "function estimateRequestPrice(uint32, uint256) view returns (uint256)"
        ], NEW_VRF);
        
        const newPrice = await newVRF.calculateRequestPrice(100000);
        console.log("✅ New VRF price:", ethers.utils.formatEther(newPrice), "LINK");
        
        console.log("\n🎯 CONCLUSION:");
        console.log("==============");
        if (originalPrice.gt(0)) {
            console.log("✅ ORIGINAL VRF WRAPPER WORKS!");
        } else {
            console.log("❌ Original VRF returns 0 price");
        }
        
        if (newPrice.gt(0)) {
            console.log("✅ NEW VRF WRAPPER WORKS!");
        } else {
            console.log("❌ New VRF returns 0 price");
        }
        
    } catch (error) {
        console.log("❌ VRF test failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 