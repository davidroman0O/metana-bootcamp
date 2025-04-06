const fs = require('fs');
const path = require('path');

// Default addresses for Hardhat node
const defaultAddresses = {
  localhost: {
    '01-nft': {
      proxy: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // First deployment address on Hardhat
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // Default admin (first account)
    },
    '02-exchange': {
      token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      nft: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      exchange: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // Default admin (first account)
    },
    '03-staking': {
      token: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      nft: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      staking: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'  // Default admin (first account)
    }
  }
};

// Hardhat's default first account - always used as admin for localhost
const DEFAULT_ADMIN = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Path to the addresses file
const addressesFilePath = path.join(__dirname, '../../.addresses.json');

// Save deployed addresses
function saveAddresses(networkName, contractType, addresses) {
  let allAddresses = {};
  
  // Try to read existing addresses file
  try {
    if (fs.existsSync(addressesFilePath)) {
      const fileContent = fs.readFileSync(addressesFilePath, 'utf8');
      allAddresses = JSON.parse(fileContent);
    }
  } catch (error) {
    console.log('No existing addresses file found, creating new one');
  }

  // Create network entry if it doesn't exist
  if (!allAddresses[networkName]) {
    allAddresses[networkName] = {};
  }

  // Create contract type entry if it doesn't exist
  if (!allAddresses[networkName][contractType]) {
    allAddresses[networkName][contractType] = {};
  }

  // For localhost, always enforce correct admin address
  if (networkName === 'localhost' || networkName === 'hardhat') {
    addresses.admin = DEFAULT_ADMIN;
  }

  // Update addresses for this contract type
  allAddresses[networkName][contractType] = {
    ...allAddresses[networkName][contractType],
    ...addresses
  };

  // Write back to file
  fs.writeFileSync(
    addressesFilePath,
    JSON.stringify(allAddresses, null, 2)
  );

  console.log(`Addresses saved for ${networkName}/${contractType}`);
  return allAddresses;
}

// Get deployed addresses
function getAddresses(networkName, contractType) {
  try {
    if (fs.existsSync(addressesFilePath)) {
      const fileContent = fs.readFileSync(addressesFilePath, 'utf8');
      const allAddresses = JSON.parse(fileContent);
      
      if (allAddresses[networkName] && allAddresses[networkName][contractType]) {
        // For localhost, ensure admin is properly set
        if ((networkName === 'localhost' || networkName === 'hardhat') && 
            (!allAddresses[networkName][contractType].admin || 
             allAddresses[networkName][contractType].admin === '0x0000000000000000000000000000000000000000')) {
          
          allAddresses[networkName][contractType].admin = DEFAULT_ADMIN;
          
          // Update the file
          fs.writeFileSync(
            addressesFilePath,
            JSON.stringify(allAddresses, null, 2)
          );
          console.log(`Updated admin address for ${networkName}/${contractType}`);
        }
        
        return allAddresses[networkName][contractType];
      }
    }
  } catch (error) {
    console.log('Error reading addresses file, using defaults');
  }

  // Return default addresses if no saved addresses found
  return (defaultAddresses[networkName] && defaultAddresses[networkName][contractType]) 
    ? defaultAddresses[networkName][contractType] 
    : {};
}

module.exports = {
  saveAddresses,
  getAddresses
}; 