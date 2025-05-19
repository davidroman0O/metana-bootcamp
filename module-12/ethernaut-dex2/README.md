# Ethernaut Dex2 Challenge Solution with Ledger

One-shot solution for Ethernaut's Dex2 challenge using a Ledger hardware wallet. The contract drains the Dex2 in a single transaction.

## How It Works

This solution exploits two vulnerabilities in the Dex2 contract:

1. The `swap` function doesn't validate which tokens can be swapped (no checks that 'from' must be token1/token2)
2. The price calculation uses relative balance: `swapAmount = (amount * TO_TOKEN.balanceOf(dex)) / FROM_TOKEN.balanceOf(dex)`

The attack:
1. Creates two custom evil tokens (with names "Evil Token 1" and "Evil Token 2")
2. Mints exactly 2 tokens of each (keeping 1 and sending 1 to the Dex)
3. Uses evilToken1 to drain token1 (price calculation: 1 * token1Balance / 1 = token1Balance)
4. Uses evilToken2 to drain token2 (price calculation: 1 * token2Balance / 1 = token2Balance)
5. Both tokens from the Dex are transferred to your Ledger address

## Successful Deployment

```
Dex2Hack deployed to: 0xC2B6e790201Bf975b5Ea7E6E2818a1D39D171948
Deployment transaction hash: 0xd7db219d8dfbf4b6b6a18b16d1150ab2cc0a4f587493484ef4b9bd26e9f0fe2d
View transaction on Etherscan: https://sepolia.etherscan.io/tx/0xd7db219d8dfbf4b6b6a18b16d1150ab2cc0a4f587493484ef4b9bd26e9f0fe2d
View contract on Etherscan: https://sepolia.etherscan.io/address/0xC2B6e790201Bf975b5Ea7E6E2818a1D39D171948
```

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
3. Create a `.env` file with your Sepolia RPC URL and Ledger account:
```
SEPOLIA_RPC_URL=your_sepolia_rpc_url_here
LEDGER_ACCOUNT=your_ledger_address_here
INSTANCE_ADDRESS=your_ethernaut_instance_address
```

## Deployment with Ledger

1. Connect your Ledger via USB
2. Open the Ethereum app on your Ledger
3. Ensure that "Contract data" is ALLOWED in the settings
4. Deploy with:
```
npm run deploy
```
5. Confirm the transaction on your Ledger device when prompted
6. Done! The attack executes automatically and tokens are sent to your Ledger address

## Security Note

This approach is more secure because:
- Your private key never leaves your hardware wallet
- The Ledger device physically displays and requires confirmation for transactions
- No sensitive information is stored in files or environment variables

## License

MIT
