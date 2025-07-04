const { saveAddresses } = require("./addresses");

// Manually save the addresses because i can fucking it up... i didn't had enough faucet money to deploy all contracts in one go!!
// note to myself: i should i have found a better technique for the payouttable
// `npx hardhat run scripts/utils/save-existing-addresses.js`

// Based on your deployment output:

const existingAddresses = {
  payoutTables3: "0x1352dA24Bd2Bf4E96CAEF171342fCf271774426B",
  payoutTables4: "0x0c8126305aF012EE2616Ec471521F7c75D2b5226", 
  payoutTables5: "0x56cBE79a59B02b1Dab898fA9f581d805930bE4a6",
  payoutTables6: "0xf760A220bB3862B01a5F7db2926675E32E6B8541",
  payoutTables7_Part1: "0xee911c8bFb965b7BBacF272C98aBA69f934fD1Aa",
  payoutTables7_Part2: "0x5827b5F3e186b59820C490FB60616b4B4C3Dde70",
  payoutTables7_Part3: "0xDd3e415275ea010D9a72DCF9F0EB68dF5318f500",
  payoutTables7_Part4: "0xD1B8157d7c57D034cDBD07C07D9AF0e9e53DCAD2",
  payoutTables7_Part5: "0x88F2bAbB8Fc74Edb0aDFbC246d195d4A7CBF0D6A",
  payoutTables7_Part6: "0x931d4bAf147b3f2276AedF85333eCCdA60F54697",
  payoutTables7_Part7: "0x96B750fEc2ae195e555dd30Aa2fe9E6fE1Bb0B30",
  payoutTables7_Part8: "0x364716A5C45e0e7eC835D3Ee3697b1Bd5ce28956"
};

async function main() {
  console.log("💾 Saving existing deployment addresses...");
  
  saveAddresses("sepolia", "payouts", existingAddresses);
  
  console.log("✅ Addresses saved! You can now resume deployment by running:");
  console.log("npx hardhat run scripts/deployment/01-deploy-payout-tables.js --network sepolia");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// 📋 Deployment Summary:
//    PayoutTables API: 0xffc2E8f0742b645759FEB1eD766238becEc34188
//    PayoutTables3: 0x1352dA24Bd2Bf4E96CAEF171342fCf271774426B
//    PayoutTables4: 0x0c8126305aF012EE2616Ec471521F7c75D2b5226
//    PayoutTables5: 0x56cBE79a59B02b1Dab898fA9f581d805930bE4a6
//    PayoutTables6: 0xf760A220bB3862B01a5F7db2926675E32E6B8541
//    PayoutTables7 Router: 0xbd922712031186FD594Cd4682448F629DF0bedDa
//    PayoutTables7_Part1: 0xee911c8bFb965b7BBacF272C98aBA69f934fD1Aa
//    PayoutTables7_Part2: 0x5827b5F3e186b59820C490FB60616b4B4C3Dde70
//    PayoutTables7_Part3: 0xDd3e415275ea010D9a72DCF9F0EB68dF5318f500
//    PayoutTables7_Part4: 0xD1B8157d7c57D034cDBD07C07D9AF0e9e53DCAD2
//    PayoutTables7_Part5: 0x88F2bAbB8Fc74Edb0aDFbC246d195d4A7CBF0D6A
//    PayoutTables7_Part6: 0x931d4bAf147b3f2276AedF85333eCCdA60F54697
//    PayoutTables7_Part7: 0x96B750fEc2ae195e555dd30Aa2fe9E6fE1Bb0B30
//    PayoutTables7_Part8: 0x364716A5C45e0e7eC835D3Ee3697b1Bd5ce28956

