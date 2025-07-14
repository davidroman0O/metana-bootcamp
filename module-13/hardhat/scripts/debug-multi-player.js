const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getAddresses } = require("./utils/addresses");

async function debug() {
    console.log("Network name:", hre.network.name);
    console.log("Network chainId:", hre.network.config.chainId);
    
    const network = await hre.ethers.provider.getNetwork();
    console.log("Provider network:", network);
    console.log("Provider chainId:", network.chainId);
    
    const addresses = getAddresses(network.name);
    console.log("\nAddresses returned:", addresses);
    console.log("Has addresses?", !!addresses);
    console.log("Has casino?", !!(addresses && addresses.casino));
    console.log("Has casino.proxy?", !!(addresses && addresses.casino && addresses.casino.proxy));
}

debug().catch(console.error);