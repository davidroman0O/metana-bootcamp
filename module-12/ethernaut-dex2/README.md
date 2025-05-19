# Ethernaut Dex2 Challenge Solution with Ledger

One-shot solution for Ethernaut's Dex2 challenge using a Ledger hardware wallet. The contract drains the Dex2 in a single transaction.

## How It Works

This solution exploits two vulnerabilities in the Dex2 contract:

1. The `swap` function doesn't validate which tokens can be swapped (no checks that 'from' must be token1/token2)
2. The price calculation uses relative balance: `swapAmount = (amount * TO_TOKEN.balanceOf(dex)) / FROM_TOKEN.balanceOf(dex)`

The attack:
1. Creates a custom token in the constructor
2. Transfers 1 token to the Dex to set up a balance ratio
3. Swaps 1 token for all of token1 (price calculation: 1 * token1Balance / 1 = token1Balance)
4. Swaps 1 token for all of token2
5. Automatically transfers the drained tokens to your Ledger address

## Prerequisites

- Node.js and npm installed
- Ledger hardware wallet with Ethereum app open
- Sepolia testnet ETH in your Ledger account
- USB connection to your Ledger

## Setup

1. Clone this repository
2. Install dependencies:
```
npm install
```
3. Create a `.env` file with your Sepolia RPC URL:
```
SEPOLIA_RPC_URL=your_sepolia_rpc_url_here
```

## Deployment with Ledger

1. Connect your Ledger via USB
2. Open the Ethereum app on your Ledger
3. Ensure that "Contract data" is ALLOWED in the settings
4. Compile the contracts:
```
npm run compile
```
5. Deploy with your Ethernaut instance address:
```
npx hardhat run scripts/deploy.js --network sepolia 0xYourEthernautInstanceAddress
```
6. Confirm the transaction on your Ledger device when prompted
7. Done! The attack executes automatically and tokens are sent to your Ledger address

## Security Note

This approach is more secure because:
- Your private key never leaves your hardware wallet
- The Ledger device physically displays and requires confirmation for transactions
- No sensitive information is stored in files or environment variables

## License

MIT
