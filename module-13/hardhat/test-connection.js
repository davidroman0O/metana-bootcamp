const { ethers } = require("hardhat");

async function main() {
    console.log("Testing connection...");
    try {
        const network = await ethers.provider.getNetwork();
        console.log("Network:", network.chainId);
        const blockNumber = await ethers.provider.getBlockNumber();
        console.log("Block number:", blockNumber);
        console.log("Connection successful!");
    } catch (error) {
        console.error("Connection failed:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});