# Custom Ethereum Wallet Implementation

## Project Overview

This project implements a basic cryptocurrency wallet from scratch, without relying on existing wallet or transaction libraries like Web3.js or Ethers.js. It satisfies the following key requirements:

1. **Account Nonce**: Manually retrieves and manages the nonce of the account.
2. **Gas Estimation**: Manually estimates the gas required for transactions.
3. **Raw Transaction Creation**: Constructs raw transactions, handles signing, and sends the transaction to the blockchain.

## Allowed Tools and Libraries

As per the requirements, only cryptographic libraries are used for operations like hashing and signing:
- `ethereum-cryptography`: For cryptographic functions like keccak256 hashing and secp256k1 curve operations
- `@ethereumjs/rlp`: For RLP encoding (used in Ethereum transaction serialization)

All wallet functionality including key management, transaction preparation, and transaction signing has been implemented manually without relying on wallet abstractions.

## Environment Configuration

The project uses environment variables for sensitive data and configuration:

1. Copy `.env.example` to `.env` to set up your environment:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file to add your test credentials and configuration:
   ```
   # Test account private key (throwaway key for testing purposes only!)
   TEST_PRIVATE_KEY=your_private_key_here_without_0x_prefix
   
   # Derived address from this private key
   TEST_ADDRESS=your_ethereum_address_with_0x_prefix
   
   # Alchemy API Key (optional if using default)
   ALCHEMY_API_KEY=your_alchemy_api_key
   
   # Network Configuration (default values provided)
   CHAIN_ID=11155111
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}
   BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
   ```

3. **IMPORTANT**: Never commit your `.env` file to version control. The `.gitignore` file is already set up to exclude it.

## Implementation Details

### Key Components

1. **Key Management**
   - Key generation: Creates a key pair using cryptographic primitives
   - Address derivation: Derives an Ethereum address from a private key without wallet libraries
   - Key storage: Simple localStorage-based key storage
   - HD wallet support: Implements BIP-39 mnemonic and BIP-44 derivation path standards

2. **Transaction Handling**
   - Nonce management: Manually tracks the nonce for accounts
   - Gas estimation: Custom implementation for gas estimation
   - Transaction preparation: Manually formats transaction data
   - RLP encoding: Properly encodes transaction data for the Ethereum network
   - Transaction signing: Implements [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md) compliant transaction signing
   - Transaction broadcasting: Uses JSON-RPC to submit transactions

3. **RPC Interactions**
   - JSON-RPC communication: Direct implementation without library abstractions
   - Network interaction: Manually constructs and submits RPC calls
   - Support for both legacy and EIP-1559 transactions

### Transaction Types

The wallet supports two transaction types:

1. **Legacy Transactions**: The original Ethereum transaction format
2. **EIP-1559 Transactions**: The new transaction format introduced with the London hard fork

By default, the wallet uses EIP-1559 transactions for better gas efficiency. A successful EIP-1559 transaction can be viewed here:
[Example EIP-1559 Transaction](https://sepolia.etherscan.io/tx/0xbfa047ef0e6fa4c0e62b9b903e8dc3c5d467d0d48816f77d1f466ea188ba6e07)

The implementation includes:
- Automatic gas fee estimation
- Support for configurable priority fees
- Accurate balance validation before sending
- Smart MAX button for setting optimal transaction amounts

### HD Wallet Implementation

The wallet now uses Hierarchical Deterministic (HD) wallets by default:

- **BIP-39 Mnemonic Phrases**: Generates and securely stores human-readable seed phrases
- **BIP-44 Derivation Paths**: Standard derivation paths for Ethereum (m/44'/60'/0'/0/*)
- **Multiple Accounts**: Support for generating and managing multiple accounts from a single seed
- **Secure Recovery**: Simple recovery process using the mnemonic phrase

HD wallets provide superior security and ease of use compared to simple private key wallets, making them the preferred option for modern cryptocurrency wallets.

### Running Tests

#### Setup

Before running tests, make sure you have:
1. Created the `.env` file with your test credentials (as described above)
2. Funded your test wallet on Sepolia testnet (if running network tests)

#### Running Mock Tests

By default, tests that make real network calls are skipped (using `describe.skip`). To run unit tests and mocked tests:

```bash
npm test
```

#### Running Specific Test Files

```bash
# Run specific test files or test groups
npm test -- -t "Transaction Encoding and Signing"  # For encoding tests
npm test -- -t "Wallet RPC Functions"              # For RPC mock tests
npm test -- -t "Wallet Transaction Unit Tests"     # For transaction unit tests
```

#### Running Network Tests

To run tests that make real network calls (skipped by default):

```bash
# To run the small transaction test
npm test -- -t "Small Transaction Test" --testPathPattern=wallet.smalltransfer
```

Alternatively, you can temporarily remove the `.skip` from the describe block for the test you want to run.

#### Running Individual Test Scripts

```bash
# Run the comprehensive assignment test
npx tsx src/tests/wallet.assignment.test.ts

# Run the simple transfer test
npx tsx src/tests/simple.transfer.test.ts

# Run all tests in sequence with a delay between them
npm run test:all
```

### Troubleshooting Transaction Issues

If you encounter issues with transactions:

1. Check the transaction hash on [Sepolia Etherscan](https://sepolia.etherscan.io)
2. Look for error messages in the test output
3. Verify the wallet has enough funds for both the transaction value and gas
4. Check that the nonce is correct (not reusing a previous nonce)
5. Ensure the gas price is appropriate for current network conditions
6. Validate the RLP encoding of the transaction
7. Verify the signature components (v, r, s)

The wallet includes several features to ensure transaction reliability:
- Optimized gas price parameters for efficient testnet transactions
- Compatible transaction encoding for all networks
- Pre-validation of transaction parameters before sending
- Smart MAX button that calculates optimal send amounts
- Clear error messaging with specific insufficient funds warnings

Transactions are handled with a dual approach:
- The UI presents EIP-1559 fee structure for better user experience
- The backend adapts to use the most compatible format for each network
- Transaction status is tracked with receipt polling

The `wallet.smalltransfer.test.ts` file contains extensive console.log statements to help debug transaction issues. When running this test, you'll see all the transaction parameters, intermediate values, and results printed to the console.

## Usage

### Starting the Application

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your test credentials
# Then start the application
npm start
```

