const fs = require("fs");
const path = require("path");

const getAddressPath = (network) => path.join(__dirname, `../../.addresses.${network}.json`);

function getAddresses(network, contractGroup) {
  const addressesFilePath = getAddressPath(network);
  if (!fs.existsSync(addressesFilePath)) {
    return {};
  }
  const addresses = JSON.parse(fs.readFileSync(addressesFilePath, "utf8"));
  return contractGroup ? addresses[contractGroup] : addresses;
}

function saveAddresses(network, contractGroup, newAddresses) {
  const addressesFilePath = getAddressPath(network);
  let addresses = {};
  if (fs.existsSync(addressesFilePath)) {
    addresses = JSON.parse(fs.readFileSync(addressesFilePath, "utf8"));
  }
  
  addresses[contractGroup] = {
    ...(addresses[contractGroup] || {}),
    ...newAddresses
  };

  fs.writeFileSync(addressesFilePath, JSON.stringify(addresses, null, 2));
  console.log(`✅ Addresses for ${contractGroup} saved to ${path.basename(addressesFilePath)}`);
}

function initAddressFile(network) {
    const addressesFilePath = getAddressPath(network);
    if (!fs.existsSync(path.dirname(addressesFilePath))) {
        fs.mkdirSync(path.dirname(addressesFilePath), { recursive: true });
    }
    fs.writeFileSync(addressesFilePath, JSON.stringify({}, null, 2));
    console.log(`Initialized fresh address file at ${addressesFilePath}`);
}

module.exports = {
  getAddresses,
  saveAddresses,
  initAddressFile
}; 