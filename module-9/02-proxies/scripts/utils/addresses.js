const fs = require('fs');
const path = require('path');

// Default addresses for Hardhat node
const defaultAddresses = {
  localhost: {
    nft: {
      proxy: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // First deployment address on Hardhat
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // Default admin (first account)
    },
    exchange: {
      token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      nft: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      exchange: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // Default admin (first account)
    },
    staking: {
      token: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      nft: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      staking: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // Default admin (first account)
    }
  }
};

// Hardhat's default first account - always used as admin for localhost
const DEFAULT_ADMIN = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Get the address file path for a specific network
function getAddressFilePath(networkName) {
  return path.join(__dirname, `../../.addresses.${networkName}.json`);
}

// Initialize a fresh address file for a network
function initAddressFile(networkName) {
  const filePath = getAddressFilePath(networkName);
  
  // Create an empty object for the network
  const emptyAddresses = {};
  
  // Write to file
  fs.writeFileSync(filePath, JSON.stringify(emptyAddresses, null, 2));
  console.log(`Initialized empty addresses file for ${networkName}`);
  
  return emptyAddresses;
}

// Save deployed addresses for a specific network
function saveAddresses(networkName, contractType, addresses) {
  const filePath = getAddressFilePath(networkName);
  let allAddresses = {};
  
  // Try to read existing addresses file for this network
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      allAddresses = JSON.parse(fileContent);
    }
  } catch (error) {
    console.log(`No existing addresses file found for ${networkName}, creating new one`);
  }

  // Create contract type entry if it doesn't exist
  if (!allAddresses[contractType]) {
    allAddresses[contractType] = {};
  }

  // For localhost, always enforce correct admin address
  if (networkName === 'localhost' || networkName === 'hardhat') {
    addresses.admin = DEFAULT_ADMIN;
  }

  // Update addresses for this contract type
  allAddresses[contractType] = {
    ...allAddresses[contractType],
    ...addresses
  };

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(allAddresses, null, 2));

  console.log(`Addresses saved for ${networkName}/${contractType}`);
  return allAddresses;
}

// Get deployed addresses for a specific network
function getAddresses(networkName, contractType) {
  const filePath = getAddressFilePath(networkName);
  
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const allAddresses = JSON.parse(fileContent);
      
      if (allAddresses[contractType]) {
        // For localhost, ensure admin is properly set
        if ((networkName === 'localhost' || networkName === 'hardhat') && 
            (!allAddresses[contractType].admin || 
             allAddresses[contractType].admin === '0x0000000000000000000000000000000000000000')) {
          
          allAddresses[contractType].admin = DEFAULT_ADMIN;
          
          // Update the file
          fs.writeFileSync(filePath, JSON.stringify(allAddresses, null, 2));
          console.log(`Updated admin address for ${networkName}/${contractType}`);
        }
        
        return allAddresses[contractType];
      }
    }
  } catch (error) {
    console.log(`Error reading addresses file for ${networkName}, using defaults`);
  }

  // Return default addresses if no saved addresses found
  return (defaultAddresses[networkName] && defaultAddresses[networkName][contractType]) 
    ? defaultAddresses[networkName][contractType] 
    : {};
}

module.exports = {
  saveAddresses,
  getAddresses,
  initAddressFile
}; 