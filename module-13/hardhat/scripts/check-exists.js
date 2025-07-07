const { ethers } = require("hardhat");

async function main() {
    const proxyAddress = "0xF8b299F87EBb62E0b625eAF440B73Cc6b7717dbd";
    const code = await ethers.provider.getCode(proxyAddress);
    console.log(`Code at ${proxyAddress}: ${code === "0x" ? "EMPTY (no contract)" : "EXISTS"}`);
}

main().catch(console.error);