const { getAddresses } = require("./utils/addresses");

const addresses = getAddresses("localhost");
console.log("Addresses object:", JSON.stringify(addresses, null, 2));
console.log("Has casino?", !!addresses.casino);
console.log("Has casino.proxy?", !!(addresses.casino && addresses.casino.proxy));